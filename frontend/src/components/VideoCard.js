import React from 'react';
import { Link } from 'react-router-dom';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatViews = (views) => {
  if (!views) return '0 views';
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const VideoCard = ({ video }) => {
  const thumbnailUrl = video.thumbnail_path 
    ? `${API_URL}${video.thumbnail_path}`
    : null;

  return (
    <div className="video-card">
      <Link to={`/watch/${video.id}`}>
        <div className="video-thumbnail-container">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={video.title}
              className="video-thumbnail"
            />
          ) : (
            <div className="video-thumbnail" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#282828',
              color: '#717171'
            }}>
              No Thumbnail
            </div>
          )}
          <span className="video-duration">{formatDuration(video.duration)}</span>
        </div>
      </Link>
      <div className="video-info">
        <Link to={`/channel/${video.channel_id}`}>
          <div className="channel-avatar-small">
            {video.channel_name?.[0]?.toUpperCase() || 'C'}
          </div>
        </Link>
        <div className="video-details">
          <Link to={`/watch/${video.id}`}>
            <h3 className="video-title">{video.title}</h3>
          </Link>
          <Link to={`/channel/${video.channel_id}`} className="video-channel-name">
            {video.channel_name || 'Unknown Channel'}
          </Link>
          <div className="video-meta">
            {formatViews(video.view_count)} • {formatDate(video.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
