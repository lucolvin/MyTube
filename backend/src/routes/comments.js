const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');

// Get comments for a video
router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const sort = req.query.sort === 'oldest' ? 'ASC' : 'DESC';

    // Get top-level comments
    const result = await db.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM comments WHERE parent_id = c.id) as reply_count
       FROM comments c
       WHERE c.video_id = $1 AND c.parent_id IS NULL
       ORDER BY c.created_at ${sort}
       LIMIT $2 OFFSET $3`,
      [videoId, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM comments WHERE video_id = $1 AND parent_id IS NULL',
      [videoId]
    );

    res.json({
      comments: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get replies to a comment
router.get('/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT c.*
       FROM comments c
       WHERE c.parent_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// Add a comment (no user association)
router.post('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content, parent_id, author_name } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 10000) {
      return res.status(400).json({ error: 'Comment is too long' });
    }

    // Verify video exists
    const videoResult = await db.query(
      'SELECT id FROM videos WHERE id = $1',
      [videoId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // If it's a reply, verify parent comment exists
    if (parent_id) {
      const parentResult = await db.query(
        'SELECT id FROM comments WHERE id = $1 AND video_id = $2',
        [parent_id, videoId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const result = await db.query(
      `INSERT INTO comments (video_id, parent_id, content, author_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [videoId, parent_id || null, content.trim(), author_name || 'Anonymous']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Update a comment (no ownership check)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const result = await db.query(
      `UPDATE comments 
       SET content = $1, is_edited = true
       WHERE id = $2
       RETURNING *`,
      [content.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment (no ownership check)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM comments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    logger.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Like a comment (just increment count)
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE comments SET like_count = like_count + 1 WHERE id = $1',
      [id]
    );

    const result = await db.query(
      'SELECT like_count FROM comments WHERE id = $1',
      [id]
    );

    res.json({
      liked: true,
      like_count: result.rows[0]?.like_count || 0
    });
  } catch (error) {
    logger.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

module.exports = router;
