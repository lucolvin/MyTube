const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const db = require('../config/database');
const logger = require('../utils/logger');

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp'];

class MediaScanner {
  constructor() {
    this.mediaPath = process.env.MEDIA_PATH || '/media';
    this.thumbnailPath = process.env.THUMBNAIL_PATH || '/thumbnails';
  }

  /**
   * Get video metadata using ffprobe
   */
  async getVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const metadata = JSON.parse(stdout);
          const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
          
          resolve({
            duration: Math.floor(parseFloat(metadata.format?.duration || 0)),
            fileSize: parseInt(metadata.format?.size || 0),
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : null,
            codec: videoStream?.codec_name || null,
            width: videoStream?.width,
            height: videoStream?.height
          });
        } catch (e) {
          reject(new Error(`Failed to parse ffprobe output: ${e.message}`));
        }
      });
    });
  }

  /**
   * Generate thumbnail for a video
   */
  async generateThumbnail(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      // Get thumbnail at 10% of the video duration
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-ss', '00:00:05',
        '-vframes', '1',
        '-vf', 'scale=480:-1',
        '-y',
        outputPath
      ]);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          // Try at the beginning if 5 seconds fails
          const ffmpegRetry = spawn('ffmpeg', [
            '-i', videoPath,
            '-ss', '00:00:01',
            '-vframes', '1',
            '-vf', 'scale=480:-1',
            '-y',
            outputPath
          ]);

          ffmpegRetry.on('close', (retryCode) => {
            if (retryCode !== 0) {
              reject(new Error(`Failed to generate thumbnail: ${stderr}`));
            } else {
              resolve(outputPath);
            }
          });
        } else {
          resolve(outputPath);
        }
      });
    });
  }

  /**
   * Scan media directory and index all videos
   * Folder structure: /media/ChannelName/video.mp4
   * or: /media/ChannelName/SubFolder/video.mp4
   */
  async scanAndIndex() {
    logger.info(`Starting media scan at: ${this.mediaPath}`);

    try {
      await fs.access(this.mediaPath);
    } catch (error) {
      logger.error(`Media path not accessible: ${this.mediaPath}`);
      return { channels: 0, videos: 0, errors: [] };
    }

    const stats = { channels: 0, videos: 0, errors: [] };

    try {
      // Ensure thumbnail directory exists
      await fs.mkdir(this.thumbnailPath, { recursive: true });

      // Get top-level directories as channels
      const entries = await fs.readdir(this.mediaPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Each top-level folder is a channel
          const channelPath = path.join(this.mediaPath, entry.name);
          const channel = await this.ensureChannel(entry.name, channelPath);
          if (channel) {
            stats.channels++;
            // Scan videos in this channel (recursively)
            const videoCount = await this.scanChannelVideos(channel.id, channelPath, channelPath);
            stats.videos += videoCount;
          }
        } else if (this.isVideoFile(entry.name)) {
          // Videos in root go to a "Default" channel
          const channel = await this.ensureChannel('Uncategorized', this.mediaPath);
          const videoPath = path.join(this.mediaPath, entry.name);
          const added = await this.indexVideo(channel.id, videoPath);
          if (added) stats.videos++;
        }
      }

      logger.info(`Media scan complete. Channels: ${stats.channels}, Videos: ${stats.videos}`);
      return stats;
    } catch (error) {
      logger.error('Error during media scan:', error);
      stats.errors.push(error.message);
      return stats;
    }
  }

  /**
   * Check if file is a video
   */
  isVideoFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
  }

  /**
   * Ensure a channel exists in the database
   */
  async ensureChannel(name, folderPath) {
    try {
      // Check if channel exists
      const existing = await db.query(
        'SELECT * FROM channels WHERE folder_path = $1',
        [folderPath]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new channel
      const result = await db.query(
        `INSERT INTO channels (name, folder_path, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, folderPath, `Channel for ${name}`]
      );

      logger.info(`Created channel: ${name}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error ensuring channel ${name}:`, error);
      return null;
    }
  }

  /**
   * Recursively scan and index videos in a channel directory
   */
  async scanChannelVideos(channelId, baseChannelPath, currentPath) {
    let videoCount = 0;

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          videoCount += await this.scanChannelVideos(channelId, baseChannelPath, fullPath);
        } else if (this.isVideoFile(entry.name)) {
          const added = await this.indexVideo(channelId, fullPath);
          if (added) videoCount++;
        }
      }
    } catch (error) {
      logger.error(`Error scanning directory ${currentPath}:`, error);
    }

    return videoCount;
  }

  /**
   * Index a single video file
   */
  async indexVideo(channelId, videoPath) {
    try {
      // Check if video already indexed
      const existing = await db.query(
        'SELECT id FROM videos WHERE file_path = $1',
        [videoPath]
      );

      if (existing.rows.length > 0) {
        logger.debug(`Video already indexed: ${videoPath}`);
        return false;
      }

      // Get video metadata
      let metadata = {};
      try {
        metadata = await this.getVideoMetadata(videoPath);
      } catch (error) {
        logger.warn(`Could not get metadata for ${videoPath}:`, error.message);
      }

      // Generate thumbnail
      const videoFileName = path.basename(videoPath, path.extname(videoPath));
      const thumbnailFileName = `${Date.now()}_${videoFileName}.jpg`;
      const thumbnailPath = path.join(this.thumbnailPath, thumbnailFileName);

      let thumbnailUrl = null;
      try {
        await this.generateThumbnail(videoPath, thumbnailPath);
        thumbnailUrl = `/thumbnails/${thumbnailFileName}`;
      } catch (error) {
        logger.warn(`Could not generate thumbnail for ${videoPath}:`, error.message);
      }

      // Create title from filename
      const title = this.formatTitle(videoFileName);

      // Insert into database
      await db.query(
        `INSERT INTO videos (
          channel_id, title, file_path, thumbnail_path,
          duration, file_size, resolution, codec, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          channelId,
          title,
          videoPath,
          thumbnailUrl,
          metadata.duration || 0,
          metadata.fileSize || 0,
          metadata.resolution,
          metadata.codec,
          new Date()
        ]
      );

      logger.info(`Indexed video: ${title}`);
      return true;
    } catch (error) {
      logger.error(`Error indexing video ${videoPath}:`, error);
      return false;
    }
  }

  /**
   * Format filename to a readable title
   */
  formatTitle(filename) {
    return filename
      .replace(/[-_\.]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  /**
   * Remove videos that no longer exist on disk
   */
  async cleanupMissingVideos() {
    try {
      const videos = await db.query('SELECT id, file_path FROM videos');
      let removed = 0;

      for (const video of videos.rows) {
        try {
          await fs.access(video.file_path);
        } catch {
          await db.query('DELETE FROM videos WHERE id = $1', [video.id]);
          logger.info(`Removed missing video: ${video.file_path}`);
          removed++;
        }
      }

      return removed;
    } catch (error) {
      logger.error('Error cleaning up missing videos:', error);
      return 0;
    }
  }

  /**
   * Remove channels with no videos
   */
  async cleanupEmptyChannels() {
    try {
      const result = await db.query(`
        DELETE FROM channels
        WHERE id NOT IN (SELECT DISTINCT channel_id FROM videos WHERE channel_id IS NOT NULL)
        RETURNING id
      `);
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up empty channels:', error);
      return 0;
    }
  }
}

module.exports = MediaScanner;
