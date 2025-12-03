const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Get user's playlists
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json([]);
    }
    const result = await db.query(
      `SELECT p.*, 
              (SELECT thumbnail_path FROM videos v 
               JOIN playlist_videos pv ON v.id = pv.video_id 
               WHERE pv.playlist_id = p.id 
               ORDER BY pv.position LIMIT 1) as thumbnail
       FROM playlists p
       WHERE p.user_id = $1
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get public playlists for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT p.*,
              (SELECT thumbnail_path FROM videos v 
               JOIN playlist_videos pv ON v.id = pv.video_id 
               WHERE pv.playlist_id = p.id 
               ORDER BY pv.position LIMIT 1) as thumbnail
       FROM playlists p
       WHERE p.user_id = $1 AND p.is_public = true
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching user playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get single playlist
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT p.*, u.username, u.display_name
       FROM playlists p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlist = result.rows[0];

    // Get playlist videos
    const videosResult = await db.query(
      `SELECT v.*, c.name as channel_name, pv.position
       FROM playlist_videos pv
       JOIN videos v ON pv.video_id = v.id
       LEFT JOIN channels c ON v.channel_id = c.id
       WHERE pv.playlist_id = $1
       ORDER BY pv.position ASC`,
      [id]
    );

    res.json({
      ...playlist,
      videos: videosResult.rows
    });
  } catch (error) {
    logger.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// Create playlist
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, is_public } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Playlist title is required' });
    }

    const result = await db.query(
      `INSERT INTO playlists (user_id, title, description, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, title.trim(), description || '', is_public !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Update playlist
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_public } = req.body;

    // Verify ownership
    const existing = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await db.query(
      `UPDATE playlists 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           is_public = COALESCE($3, is_public)
       WHERE id = $4
       RETURNING *`,
      [title, description, is_public, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete playlist
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query('DELETE FROM playlists WHERE id = $1', [id]);

    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    logger.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Add video to playlist
router.post('/:id/videos', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { video_id } = req.body;

    if (!video_id) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Verify ownership
    const existing = await db.query(
      'SELECT user_id, video_count FROM playlists WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get next position
    const posResult = await db.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM playlist_videos WHERE playlist_id = $1',
      [id]
    );

    await db.query(
      `INSERT INTO playlist_videos (playlist_id, video_id, position)
       VALUES ($1, $2, $3)
       ON CONFLICT (playlist_id, video_id) DO NOTHING`,
      [id, video_id, posResult.rows[0].next_pos]
    );

    // Update video count
    await db.query(
      `UPDATE playlists SET video_count = (
        SELECT COUNT(*) FROM playlist_videos WHERE playlist_id = $1
      ) WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Video added to playlist' });
  } catch (error) {
    logger.error('Error adding video to playlist:', error);
    res.status(500).json({ error: 'Failed to add video' });
  }
});

// Remove video from playlist
router.delete('/:id/videos/:videoId', requireAuth, async (req, res) => {
  try {
    const { id, videoId } = req.params;

    // Verify ownership
    const existing = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query(
      'DELETE FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2',
      [id, videoId]
    );

    // Update video count
    await db.query(
      `UPDATE playlists SET video_count = (
        SELECT COUNT(*) FROM playlist_videos WHERE playlist_id = $1
      ) WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Video removed from playlist' });
  } catch (error) {
    logger.error('Error removing video from playlist:', error);
    res.status(500).json({ error: 'Failed to remove video' });
  }
});

// Reorder playlist videos
router.put('/:id/reorder', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { video_ids } = req.body; // Array of video IDs in new order

    if (!Array.isArray(video_ids)) {
      return res.status(400).json({ error: 'video_ids must be an array' });
    }

    // Verify ownership
    const existing = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update positions
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < video_ids.length; i++) {
        await client.query(
          'UPDATE playlist_videos SET position = $1 WHERE playlist_id = $2 AND video_id = $3',
          [i + 1, id, video_ids[i]]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({ message: 'Playlist reordered' });
  } catch (error) {
    logger.error('Error reordering playlist:', error);
    res.status(500).json({ error: 'Failed to reorder playlist' });
  }
});

module.exports = router;
