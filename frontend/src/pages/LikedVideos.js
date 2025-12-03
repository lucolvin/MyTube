import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import { FiThumbsUp } from 'react-icons/fi';

const LikedVideos = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLikedVideos = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await api.get('/users/liked');
        setVideos(response.data || []);
      } catch (err) {
        console.error('Error fetching liked videos:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchLikedVideos();
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
          background: 'linear-gradient(135deg, #065fd4, #0a8dff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FiThumbsUp size={48} color="white" />
        </div>
        <div>
          <h1 className="page-title" style={{ marginBottom: '8px' }}>Liked Videos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{videos.length} videos</p>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👍</div>
          <h2 className="empty-state-title">No liked videos</h2>
          <p>Videos you like will appear here</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedVideos;
