import React, { useState, useEffect } from 'react';
import api from '../services/api';
import VideoCard from '../components/VideoCard';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/users/history');
        setHistory(response.data.videos || []);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

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
