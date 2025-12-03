import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiThumbsUp, FiThumbsDown, FiShare2, FiClock, FiList, FiPlus, FiCheck } from 'react-icons/fi';
import api from '../services/api';
import VideoPlayer from '../components/VideoPlayer';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const formatViews = (views) => {
  if (!views) return '0 views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

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

const formatSubscribers = (count) => {
  if (!count) return '0 subscribers';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K subscribers`;
  return `${count} subscribers`;
};

const Watch = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userReaction, setUserReaction] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [startPosition, setStartPosition] = useState(0);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [videoPlaylists, setVideoPlaylists] = useState([]);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/videos/${id}`);
        setVideo(response.data);
        setUserReaction(response.data.user_reaction);
        
        // Fetch comments
        const commentsRes = await api.get(`/comments/video/${id}`);
        setComments(commentsRes.data.comments || []);

        // Get resume position
        try {
          const posRes = await api.get(`/videos/${id}/position`);
          setStartPosition(posRes.data.position || 0);
        } catch (e) {
          // Ignore errors for position
        }
        
        // Check if video is in watch later
        try {
          const watchLaterRes = await api.get('/users/watch-later');
          const watchLaterVideos = watchLaterRes.data || [];
          setIsInWatchLater(watchLaterVideos.some(v => v.id === id));
        } catch (e) {
          // Ignore errors
        }
        
        // Fetch user's playlists
        try {
          const playlistsRes = await api.get('/playlists');
          setPlaylists(playlistsRes.data || []);
          
          // Check which playlists contain this video using parallel requests
          const playlistDetailPromises = (playlistsRes.data || []).map(playlist =>
            api.get(`/playlists/${playlist.id}`)
              .then(res => res.data.videos?.some(v => v.id === id) ? playlist.id : null)
              .catch(() => null)
          );
          
          const results = await Promise.all(playlistDetailPromises);
          setVideoPlaylists(results.filter(id => id !== null));
        } catch (e) {
          // Ignore errors
        }
      } catch (err) {
        setError('Failed to load video');
        console.error('Error fetching video:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  const handleReaction = async (type) => {
    try {
      const newReaction = userReaction === type ? null : type;
      const response = await api.post(`/videos/${id}/react`, { reaction: newReaction });
      setUserReaction(response.data.user_reaction);
      setVideo(prev => ({
        ...prev,
        like_count: response.data.like_count,
        dislike_count: response.data.dislike_count
      }));
    } catch (err) {
      console.error('Error reacting to video:', err);
    }
  };

  const handleSubscribe = async () => {
    if (!video?.channel_id) return;
    
    try {
      if (isSubscribed) {
        await api.delete(`/channels/${video.channel_id}/subscribe`);
        setIsSubscribed(false);
      } else {
        await api.post(`/channels/${video.channel_id}/subscribe`);
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('Error subscribing:', err);
    }
  };

  const handleProgress = async (currentTime, duration) => {
    // Save position every 10 seconds
    if (Math.floor(currentTime) % 10 === 0) {
      try {
        await api.post(`/videos/${id}/watch`, {
          position: Math.floor(currentTime),
          completed: currentTime >= duration - 10
        });
      } catch (err) {
        // Ignore errors
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await api.post(`/comments/video/${id}`, {
        content: commentText
      });
      setComments([response.data, ...comments]);
      setCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleWatchLater = async () => {
    try {
      if (isInWatchLater) {
        await api.delete(`/users/watch-later/${id}`);
        setIsInWatchLater(false);
      } else {
        await api.post(`/users/watch-later/${id}`);
        setIsInWatchLater(true);
      }
    } catch (err) {
      console.error('Error updating watch later:', err);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    try {
      if (videoPlaylists.includes(playlistId)) {
        await api.delete(`/playlists/${playlistId}/videos/${id}`);
        setVideoPlaylists(videoPlaylists.filter(p => p !== playlistId));
      } else {
        await api.post(`/playlists/${playlistId}/videos`, { video_id: id });
        setVideoPlaylists([...videoPlaylists, playlistId]);
      }
    } catch (err) {
      console.error('Error updating playlist:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <h2 className="empty-state-title">{error || 'Video not found'}</h2>
      </div>
    );
  }

  return (
    <div className="watch-page">
      <div className="watch-main">
        <VideoPlayer 
          videoId={id} 
          startPosition={startPosition}
          onProgress={handleProgress}
        />

        <div className="video-info-section">
          <h1 className="video-title-large">{video.title}</h1>
          
          <div className="video-actions">
            <div className="channel-info">
              <Link to={`/channel/${video.channel_id}`}>
                <div className="channel-avatar">
                  {video.channel_name?.[0]?.toUpperCase() || 'C'}
                </div>
              </Link>
              <div className="channel-details">
                <Link to={`/channel/${video.channel_id}`}>
                  <h3>{video.channel_name}</h3>
                </Link>
                <span className="channel-subscribers">
                  {formatSubscribers(video.channel_subscribers)}
                </span>
              </div>
              <button 
                className={`btn subscribe-btn ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleSubscribe}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            <div className="action-buttons">
              <button 
                className={`action-btn ${userReaction === 'like' ? 'active' : ''}`}
                onClick={() => handleReaction('like')}
              >
                <FiThumbsUp />
                <span>{video.like_count || 0}</span>
              </button>
              <button 
                className={`action-btn ${userReaction === 'dislike' ? 'active' : ''}`}
                onClick={() => handleReaction('dislike')}
              >
                <FiThumbsDown />
              </button>
              <button className="action-btn">
                <FiShare2 />
                <span>Share</span>
              </button>
              <button 
                className={`action-btn ${isInWatchLater ? 'active' : ''}`}
                onClick={handleWatchLater}
                title={isInWatchLater ? 'Remove from Watch Later' : 'Add to Watch Later'}
              >
                <FiClock />
                <span>{isInWatchLater ? 'Saved' : 'Watch Later'}</span>
              </button>
              <div style={{ position: 'relative' }}>
                <button 
                  className="action-btn"
                  onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                  aria-expanded={showPlaylistMenu}
                  aria-haspopup="true"
                >
                  <FiList />
                  <span>Save to playlist</span>
                </button>
                {showPlaylistMenu && (
                  <div 
                    className="playlist-dropdown"
                    role="menu"
                    aria-label="Save to playlist"
                  >
                    <div className="playlist-dropdown-header">Save to...</div>
                    {playlists.length === 0 ? (
                      <div className="playlist-dropdown-empty">
                        No playlists yet. Create one in the Library.
                      </div>
                    ) : (
                      playlists.map((playlist) => (
                        <button
                          key={playlist.id}
                          className="playlist-dropdown-item"
                          onClick={() => handleAddToPlaylist(playlist.id)}
                          role="menuitem"
                        >
                          {videoPlaylists.includes(playlist.id) ? (
                            <FiCheck className="playlist-check" />
                          ) : (
                            <FiPlus className="playlist-check" />
                          )}
                          <span>{playlist.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="video-description">
            <div className="video-description-header">
              <span>{formatViews(video.view_count)}</span>
              <span>{formatDate(video.published_at || video.created_at)}</span>
            </div>
            <div className="video-description-text">
              {showFullDescription 
                ? video.description 
                : video.description?.slice(0, 200)}
              {video.description?.length > 200 && (
                <button 
                  className="btn btn-secondary"
                  style={{ marginTop: '8px' }}
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <div className="comments-header">
            <span className="comments-count">{comments.length} Comments</span>
          </div>

          <form className="comment-input-container" onSubmit={handleAddComment}>
            <div className="channel-avatar-small">U</div>
            <input
              type="text"
              className="comment-input"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Comment
            </button>
          </form>

          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="channel-avatar-small">
                  {comment.display_name?.[0]?.toUpperCase() || comment.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="comment-content">
                  <div className="comment-author">
                    {comment.display_name || comment.username}
                    <span className="comment-time">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                  <div className="comment-actions">
                    <button className="comment-action-btn">
                      <FiThumbsUp />
                      <span>{comment.like_count || 0}</span>
                    </button>
                    <button className="comment-action-btn">
                      <FiThumbsDown />
                    </button>
                    <button className="comment-action-btn">Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Videos Sidebar */}
      <div className="watch-sidebar">
        <div className="related-videos">
          <h3>Related videos</h3>
          {video.related_videos?.map((related) => (
            <Link 
              key={related.id} 
              to={`/watch/${related.id}`}
              className="related-video-card"
            >
              <div 
                className="related-thumbnail"
                style={{
                  backgroundImage: related.thumbnail_path 
                    ? `url(${API_URL}${related.thumbnail_path})`
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="related-info">
                <h4 className="related-title">{related.title}</h4>
                <span className="related-channel">{related.channel_name}</span>
                <span className="related-meta">
                  {formatViews(related.view_count)} • {formatDuration(related.duration)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Watch;
