const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { requireAuth } = require('../middleware/auth');

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, username, display_name, avatar_url, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { display_name, avatar_url } = req.body;

    const result = await db.query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3
       RETURNING id, username, email, display_name, avatar_url, is_admin, created_at`,
      [display_name, avatar_url, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user's subscriptions
router.get('/subscriptions', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, s.created_at as subscribed_at
       FROM subscriptions s
       JOIN channels c ON s.channel_id = c.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get user's watch history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT v.*, c.name as channel_name, wh.watched_at, wh.last_position, wh.completed
       FROM watch_history wh
       JOIN videos v ON wh.video_id = v.id
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE wh.user_id = $1
       ORDER BY wh.watched_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM watch_history WHERE user_id = $1',
      [req.user.id]
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
    logger.error('Error fetching watch history:', error);
    res.status(500).json({ error: 'Failed to fetch watch history' });
  }
});

// Clear watch history
router.delete('/history', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM watch_history WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Watch history cleared' });
  } catch (error) {
    logger.error('Error clearing watch history:', error);
    res.status(500).json({ error: 'Failed to clear watch history' });
  }
});

// Get user's liked videos
router.get('/liked', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT v.*, c.name as channel_name, vr.created_at as liked_at
       FROM video_reactions vr
       JOIN videos v ON vr.video_id = v.id
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE vr.user_id = $1 AND vr.reaction_type = 'like'
       ORDER BY vr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching liked videos:', error);
    res.status(500).json({ error: 'Failed to fetch liked videos' });
  }
});

// Get watch later list
router.get('/watch-later', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT v.*, c.name as channel_name, wl.added_at
       FROM watch_later wl
       JOIN videos v ON wl.video_id = v.id
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE wl.user_id = $1
       ORDER BY wl.added_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching watch later:', error);
    res.status(500).json({ error: 'Failed to fetch watch later list' });
  }
});

// Add to watch later
router.post('/watch-later/:videoId', requireAuth, async (req, res) => {
  try {
    const { videoId } = req.params;

    await db.query(
      `INSERT INTO watch_later (user_id, video_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, video_id) DO NOTHING`,
      [req.user.id, videoId]
    );

    res.json({ message: 'Added to watch later' });
  } catch (error) {
    logger.error('Error adding to watch later:', error);
    res.status(500).json({ error: 'Failed to add to watch later' });
  }
});

// Remove from watch later
router.delete('/watch-later/:videoId', requireAuth, async (req, res) => {
  try {
    const { videoId } = req.params;

    await db.query(
      'DELETE FROM watch_later WHERE user_id = $1 AND video_id = $2',
      [req.user.id, videoId]
    );

    res.json({ message: 'Removed from watch later' });
  } catch (error) {
    logger.error('Error removing from watch later:', error);
    res.status(500).json({ error: 'Failed to remove from watch later' });
  }
});

module.exports = router;
