const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');

// Get all subscriptions (global, not per-user)
router.get('/subscriptions', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT c.*
       FROM subscriptions s
       JOIN channels c ON s.channel_id = c.id
       ORDER BY c.name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get watch history (global, not per-user)
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT DISTINCT ON (v.id) v.*, c.name as channel_name, wh.watched_at, wh.last_position, wh.completed
       FROM watch_history wh
       JOIN videos v ON wh.video_id = v.id
       LEFT JOIN channels c ON v.channel_id = c.id
       ORDER BY v.id, wh.watched_at DESC`
    );

    // Sort by most recent watch and paginate
    const sortedVideos = result.rows.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));
    const paginatedVideos = sortedVideos.slice(offset, offset + limit);

    res.json({
      videos: paginatedVideos,
      pagination: {
        page,
        limit,
        total: result.rows.length,
        totalPages: Math.ceil(result.rows.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching watch history:', error);
    res.status(500).json({ error: 'Failed to fetch watch history' });
  }
});

// Clear all watch history
router.delete('/history', async (req, res) => {
  try {
    await db.query('DELETE FROM watch_history');
    res.json({ message: 'Watch history cleared' });
  } catch (error) {
    logger.error('Error clearing watch history:', error);
    res.status(500).json({ error: 'Failed to clear watch history' });
  }
});

// Get liked videos (global, not per-user)
router.get('/liked', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Get videos that have likes (based on like_count)
    const result = await db.query(
      `SELECT v.*, c.name as channel_name
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.like_count > 0
       ORDER BY v.like_count DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching liked videos:', error);
    res.status(500).json({ error: 'Failed to fetch liked videos' });
  }
});

// Get watch later list (global, not per-user)
router.get('/watch-later', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (v.id) v.*, c.name as channel_name, wl.added_at
       FROM watch_later wl
       JOIN videos v ON wl.video_id = v.id
       LEFT JOIN channels c ON v.channel_id = c.id
       ORDER BY v.id, wl.added_at DESC`
    );

    // Sort by most recently added
    const sortedVideos = result.rows.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));

    res.json(sortedVideos);
  } catch (error) {
    logger.error('Error fetching watch later:', error);
    res.status(500).json({ error: 'Failed to fetch watch later list' });
  }
});

// Add to watch later (no user association)
router.post('/watch-later/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    // Check if already in watch later
    const existing = await db.query(
      'SELECT id FROM watch_later WHERE video_id = $1',
      [videoId]
    );

    if (existing.rows.length > 0) {
      return res.json({ message: 'Already in watch later' });
    }

    await db.query(
      `INSERT INTO watch_later (video_id)
       VALUES ($1)`,
      [videoId]
    );

    res.json({ message: 'Added to watch later' });
  } catch (error) {
    logger.error('Error adding to watch later:', error);
    res.status(500).json({ error: 'Failed to add to watch later' });
  }
});

// Remove from watch later (remove all instances of this video)
router.delete('/watch-later/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    await db.query(
      'DELETE FROM watch_later WHERE video_id = $1',
      [videoId]
    );

    res.json({ message: 'Removed from watch later' });
  } catch (error) {
    logger.error('Error removing from watch later:', error);
    res.status(500).json({ error: 'Failed to remove from watch later' });
  }
});

module.exports = router;
