const express = require('express');
const router = express.Router();
const MediaScanner = require('../services/mediaScanner');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

// Trigger media scan (admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const scanner = new MediaScanner();
    
    // Run scan asynchronously
    res.json({ message: 'Media scan started', status: 'running' });

    // Perform scan in background
    scanner.scanAndIndex()
      .then(stats => {
        logger.info('Media scan completed:', stats);
      })
      .catch(err => {
        logger.error('Media scan failed:', err);
      });
  } catch (error) {
    logger.error('Error starting scan:', error);
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

// Cleanup missing files (admin only)
router.post('/cleanup', requireAuth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const scanner = new MediaScanner();
    
    const removedVideos = await scanner.cleanupMissingVideos();
    const removedChannels = await scanner.cleanupEmptyChannels();

    res.json({
      message: 'Cleanup completed',
      removed_videos: removedVideos,
      removed_channels: removedChannels
    });
  } catch (error) {
    logger.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup' });
  }
});

// Get scan status
router.get('/status', requireAuth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Return basic stats
    const db = require('../config/database');
    
    const channelCount = await db.query('SELECT COUNT(*) FROM channels');
    const videoCount = await db.query('SELECT COUNT(*) FROM videos');

    res.json({
      channels: parseInt(channelCount.rows[0].count),
      videos: parseInt(videoCount.rows[0].count),
      media_path: process.env.MEDIA_PATH || '/media'
    });
  } catch (error) {
    logger.error('Error getting scan status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;
