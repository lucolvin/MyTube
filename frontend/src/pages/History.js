import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';

const History = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await api.get('/users/history');
        setHistory(response.data.videos || []);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchHistory();
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
      <h1 className="page-title">Watch History</h1>
      
      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <h2 className="empty-state-title">No watch history</h2>
          <p>Videos you watch will appear here</p>
        </div>
      ) : (
        <div className="video-grid">
          {history.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
