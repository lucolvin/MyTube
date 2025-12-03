const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Get comments for a video
router.get('/video/:videoId', optionalAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const sort = req.query.sort === 'oldest' ? 'ASC' : 'DESC';

    // Get top-level comments
    const result = await db.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url,
              (SELECT COUNT(*) FROM comments WHERE parent_id = c.id) as reply_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.video_id = $1 AND c.parent_id IS NULL
       ORDER BY c.created_at ${sort}
       LIMIT $2 OFFSET $3`,
      [videoId, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM comments WHERE video_id = $1 AND parent_id IS NULL',
      [videoId]
    );

    // Get user's likes on these comments if authenticated
    if (req.user) {
      const commentIds = result.rows.map(c => c.id);
      if (commentIds.length > 0) {
        const likesResult = await db.query(
          'SELECT comment_id FROM comment_reactions WHERE user_id = $1 AND comment_id = ANY($2)',
          [req.user.id, commentIds]
        );
        const likedIds = new Set(likesResult.rows.map(r => r.comment_id));
        result.rows.forEach(comment => {
          comment.user_liked = likedIds.has(comment.id);
        });
      }
    }

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
router.get('/:id/replies', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
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

// Add a comment
router.post('/video/:videoId', requireAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content, parent_id } = req.body;

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
      `INSERT INTO comments (video_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [videoId, req.user.id, parent_id || null, content.trim()]
    );

    // Get user info
    const userResult = await db.query(
      'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    res.status(201).json({
      ...result.rows[0],
      ...userResult.rows[0]
    });
  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Update a comment
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify ownership
    const existing = await db.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existing.rows[0].user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    const result = await db.query(
      `UPDATE comments 
       SET content = $1, is_edited = true
       WHERE id = $2
       RETURNING *`,
      [content.trim(), id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await db.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existing.rows[0].user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await db.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    logger.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Like a comment
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if already liked
    const existing = await db.query(
      'SELECT id FROM comment_reactions WHERE comment_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length > 0) {
      // Unlike
      await db.query(
        'DELETE FROM comment_reactions WHERE comment_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      await db.query(
        'UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1',
        [id]
      );
    } else {
      // Like
      await db.query(
        'INSERT INTO comment_reactions (comment_id, user_id) VALUES ($1, $2)',
        [id, req.user.id]
      );
      await db.query(
        'UPDATE comments SET like_count = like_count + 1 WHERE id = $1',
        [id]
      );
    }

    const result = await db.query(
      'SELECT like_count FROM comments WHERE id = $1',
      [id]
    );

    res.json({
      liked: existing.rows.length === 0,
      like_count: result.rows[0]?.like_count || 0
    });
  } catch (error) {
    logger.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

module.exports = router;
