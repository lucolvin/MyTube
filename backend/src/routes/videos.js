const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

// Get all videos with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const sortBy = req.query.sort || 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    // Validate sort column - use a map for safe column names
    const sortColumnMap = {
      'created_at': 'v.created_at',
      'view_count': 'v.view_count',
      'like_count': 'v.like_count',
      'title': 'v.title',
      'duration': 'v.duration'
    };
    const safeSortColumn = sortColumnMap[sortBy] || 'v.created_at';
    const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const result = await db.query(
      `SELECT v.*, c.name as channel_name, c.id as channel_id
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.is_public = true
       ORDER BY ${safeSortColumn} ${safeOrder}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM videos WHERE is_public = true'
    );

    res.json({
      videos: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get trending videos
router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Try to get from cache
    const cacheKey = `trending:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await db.query(
      `SELECT v.*, c.name as channel_name
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.is_public = true
       ORDER BY v.view_count DESC, v.created_at DESC
       LIMIT $1`,
      [limit]
    );

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result.rows));

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching trending videos:', error);
    res.status(500).json({ error: 'Failed to fetch trending videos' });
  }
});

// Get latest videos
router.get('/latest', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const result = await db.query(
      `SELECT v.*, c.name as channel_name
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.is_public = true
       ORDER BY v.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching latest videos:', error);
    res.status(500).json({ error: 'Failed to fetch latest videos' });
  }
});

// Get single video by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT v.*, c.name as channel_name, c.id as channel_id,
              c.subscriber_count as channel_subscribers, c.avatar_url as channel_avatar
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = result.rows[0];

    // Get related videos from same channel
    const related = await db.query(
      `SELECT v.*, c.name as channel_name
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.channel_id = $1 AND v.id != $2 AND v.is_public = true
       ORDER BY v.view_count DESC
       LIMIT 10`,
      [video.channel_id, id]
    );

    res.json({
      ...video,
      related_videos: related.rows,
      user_reaction: null
    });
  } catch (error) {
    logger.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Stream video
router.get('/:id/stream', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT file_path FROM videos WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoPath = result.rows[0].file_path;

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Stream entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }

    // Increment view count (async, don't wait)
    db.query(
      'UPDATE videos SET view_count = view_count + 1 WHERE id = $1',
      [id]
    ).catch(err => logger.error('Error incrementing view count:', err));

  } catch (error) {
    logger.error('Error streaming video:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Like/dislike video (directly updates video counts, no user tracking)
router.post('/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body; // 'like', 'dislike', or null

    if (reaction && !['like', 'dislike'].includes(reaction)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Simply update the count directly
    if (reaction === 'like') {
      await db.query(
        'UPDATE videos SET like_count = like_count + 1 WHERE id = $1',
        [id]
      );
    } else if (reaction === 'dislike') {
      await db.query(
        'UPDATE videos SET dislike_count = dislike_count + 1 WHERE id = $1',
        [id]
      );
    }

    // Get updated counts
    const updated = await db.query(
      'SELECT like_count, dislike_count FROM videos WHERE id = $1',
      [id]
    );

    res.json({
      like_count: updated.rows[0]?.like_count || 0,
      dislike_count: updated.rows[0]?.dislike_count || 0,
      user_reaction: reaction
    });
  } catch (error) {
    logger.error('Error reacting to video:', error);
    res.status(500).json({ error: 'Failed to react to video' });
  }
});

// Update watch history (global, not per-user)
router.post('/:id/watch', async (req, res) => {
  try {
    const { id } = req.params;
    const { position, completed } = req.body;

    // Store watch history without user association - use video_id unique constraint
    await db.query(
      `INSERT INTO watch_history (video_id, last_position, completed, watched_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (video_id)
       DO UPDATE SET last_position = $2, completed = COALESCE($3, watch_history.completed), watched_at = NOW()`,
      [id, position || 0, completed || false]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating watch history:', error);
    res.status(500).json({ error: 'Failed to update watch history' });
  }
});

// Get watch history position for resume (global)
router.get('/:id/position', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT last_position FROM watch_history WHERE video_id = $1 ORDER BY watched_at DESC LIMIT 1',
      [id]
    );

    res.json({
      position: result.rows[0]?.last_position || 0
    });
  } catch (error) {
    logger.error('Error getting watch position:', error);
    res.status(500).json({ error: 'Failed to get watch position' });
  }
});

module.exports = router;
