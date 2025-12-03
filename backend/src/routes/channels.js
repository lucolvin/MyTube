const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { optionalAuth, requireAuth } = require('../middleware/auth');

// Get all channels
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM videos WHERE channel_id = c.id) as video_count
       FROM channels c
       ORDER BY c.subscriber_count DESC, c.name ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query('SELECT COUNT(*) FROM channels');

    res.json({
      channels: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get single channel by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM videos WHERE channel_id = c.id) as video_count
       FROM channels c
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = result.rows[0];

    // Check if user is subscribed
    let isSubscribed = false;
    if (req.user) {
      const subResult = await db.query(
        'SELECT id FROM subscriptions WHERE user_id = $1 AND channel_id = $2',
        [req.user.id, id]
      );
      isSubscribed = subResult.rows.length > 0;
    }

    res.json({
      ...channel,
      is_subscribed: isSubscribed
    });
  } catch (error) {
    logger.error('Error fetching channel:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// Get channel videos
router.get('/:id/videos', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const sortBy = req.query.sort || 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    // Use a map for safe column names to prevent SQL injection
    const sortColumnMap = {
      'created_at': 'v.created_at',
      'view_count': 'v.view_count',
      'like_count': 'v.like_count',
      'title': 'v.title'
    };
    const safeSortColumn = sortColumnMap[sortBy] || 'v.created_at';
    const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const result = await db.query(
      `SELECT v.*, c.name as channel_name
       FROM videos v
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE v.channel_id = $1 AND v.is_public = true
       ORDER BY ${safeSortColumn} ${safeOrder}
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM videos WHERE channel_id = $1 AND is_public = true',
      [id]
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
    logger.error('Error fetching channel videos:', error);
    res.status(500).json({ error: 'Failed to fetch channel videos' });
  }
});

// Subscribe to channel
router.post('/:id/subscribe', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if already subscribed
    const existing = await db.query(
      'SELECT id FROM subscriptions WHERE user_id = $1 AND channel_id = $2',
      [req.user.id, id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    await db.query(
      'INSERT INTO subscriptions (user_id, channel_id) VALUES ($1, $2)',
      [req.user.id, id]
    );

    await db.query(
      'UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = $1',
      [id]
    );

    const result = await db.query(
      'SELECT subscriber_count FROM channels WHERE id = $1',
      [id]
    );

    res.json({
      subscribed: true,
      subscriber_count: result.rows[0].subscriber_count
    });
  } catch (error) {
    logger.error('Error subscribing to channel:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from channel
router.delete('/:id/subscribe', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM subscriptions WHERE user_id = $1 AND channel_id = $2 RETURNING id',
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Not subscribed' });
    }

    await db.query(
      'UPDATE channels SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = $1',
      [id]
    );

    const countResult = await db.query(
      'SELECT subscriber_count FROM channels WHERE id = $1',
      [id]
    );

    res.json({
      subscribed: false,
      subscriber_count: countResult.rows[0].subscriber_count
    });
  } catch (error) {
    logger.error('Error unsubscribing from channel:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Update channel info (admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, avatar_url, banner_url } = req.body;

    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `UPDATE channels 
       SET description = COALESCE($1, description),
           avatar_url = COALESCE($2, avatar_url),
           banner_url = COALESCE($3, banner_url)
       WHERE id = $4
       RETURNING *`,
      [description, avatar_url, banner_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating channel:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

module.exports = router;
