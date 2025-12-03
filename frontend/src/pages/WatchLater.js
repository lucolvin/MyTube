import React, { useState, useEffect } from 'react';
import api from '../services/api';
import VideoCard from '../components/VideoCard';
import { FiClock, FiTrash2 } from 'react-icons/fi';

const WatchLater = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWatchLater = async () => {
      try {
        const response = await api.get('/users/watch-later');
        setVideos(response.data || []);
      } catch (err) {
        console.error('Error fetching watch later:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchLater();
  }, []);

  const handleRemove = async (videoId) => {
    try {
      await api.delete(`/users/watch-later/${videoId}`);
      setVideos(videos.filter(v => v.id !== videoId));
    } catch (err) {
      console.error('Error removing from watch later:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ 
          width: '120px', 
          height: '120px', 
          borderRadius: '8px', 
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FiClock size={48} color="white" />
        </div>
        <div>
          <h1 className="page-title" style={{ marginBottom: '8px' }}>Watch Later</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{videos.length} videos</p>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏰</div>
          <h2 className="empty-state-title">No videos in Watch Later</h2>
          <p>Save videos to watch later by clicking the save button on any video</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <div key={video.id} style={{ position: 'relative' }}>
              <VideoCard video={video} />
              <button
                className="btn btn-secondary"
                onClick={() => handleRemove(video.id)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '4px 8px',
                  fontSize: '12px'
                }}
                title="Remove from Watch Later"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchLater;
