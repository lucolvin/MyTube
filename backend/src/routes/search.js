const express = require('express');
const router = express.Router();
const db = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

// Search videos and channels
router.get('/', async (req, res) => {
  try {
    const { q, type, sort, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = q.trim();
    const offset = (parseInt(page) - 1) * Math.min(parseInt(limit), 50);
    const searchType = type || 'all'; // 'all', 'videos', 'channels'

    // Try cache first
    const cacheKey = `search:${searchQuery}:${searchType}:${sort}:${page}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    let results = { videos: [], channels: [] };

    if (searchType === 'all' || searchType === 'videos') {
      // Search videos using full-text search
      const videoSort = sort === 'views' ? 'v.view_count DESC' : 
                       sort === 'date' ? 'v.created_at DESC' : 
                       'ts_rank(to_tsvector(\'english\', v.title || \' \' || COALESCE(v.description, \'\')), plainto_tsquery(\'english\', $1)) DESC';

      const videosResult = await db.query(
        `SELECT v.*, c.name as channel_name,
                ts_rank(to_tsvector('english', v.title || ' ' || COALESCE(v.description, '')), 
                        plainto_tsquery('english', $1)) as rank
         FROM videos v
         LEFT JOIN channels c ON v.channel_id = c.id
         WHERE v.is_public = true
           AND (to_tsvector('english', v.title || ' ' || COALESCE(v.description, '')) 
                @@ plainto_tsquery('english', $1)
                OR v.title ILIKE $2)
         ORDER BY ${videoSort}
         LIMIT $3 OFFSET $4`,
        [searchQuery, `%${searchQuery}%`, Math.min(parseInt(limit), 50), offset]
      );

      results.videos = videosResult.rows;
    }

    if (searchType === 'all' || searchType === 'channels') {
      // Search channels
      const channelsResult = await db.query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM videos WHERE channel_id = c.id) as video_count
         FROM channels c
         WHERE to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) 
               @@ plainto_tsquery('english', $1)
               OR c.name ILIKE $2
         ORDER BY c.subscriber_count DESC
         LIMIT $3 OFFSET $4`,
        [searchQuery, `%${searchQuery}%`, Math.min(parseInt(limit), 20), offset]
      );

      results.channels = channelsResult.rows;
    }

    // Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(results));

    res.json(results);
  } catch (error) {
    logger.error('Error searching:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const searchQuery = q.trim();

    // Get video title suggestions
    const result = await db.query(
      `SELECT DISTINCT title 
       FROM videos 
       WHERE title ILIKE $1 AND is_public = true
       ORDER BY view_count DESC
       LIMIT 10`,
      [`%${searchQuery}%`]
    );

    const suggestions = result.rows.map(r => r.title);

    res.json(suggestions);
  } catch (error) {
    logger.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

module.exports = router;
