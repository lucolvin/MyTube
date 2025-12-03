import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import VideoCard from '../components/VideoCard';

const formatSubscribers = (count) => {
  if (!count) return '0 subscribers';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K subscribers`;
  return `${count} subscribers`;
};

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('videos');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subsRes = await api.get('/users/subscriptions');
        setSubscriptions(subsRes.data || []);
        
        // Get recent videos from subscribed channels
        const videoPromises = subsRes.data.slice(0, 10).map(channel =>
          api.get(`/channels/${channel.id}/videos?limit=5`).catch(() => ({ data: { videos: [] } }))
        );
        const videoResults = await Promise.all(videoPromises);
        const allVideos = videoResults
          .flatMap(res => res.data.videos || [])
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setVideos(allVideos);
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      <h1 className="page-title">Subscriptions</h1>
      
      <div className="tabs">
        <button 
          className={`tab ${activeView === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveView('videos')}
        >
          Latest Videos
        </button>
        <button 
          className={`tab ${activeView === 'channels' ? 'active' : ''}`}
          onClick={() => setActiveView('channels')}
        >
          Channels ({subscriptions.length})
        </button>
      </div>

      {activeView === 'videos' && (
        videos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📺</div>
            <h2 className="empty-state-title">No videos</h2>
            <p>Subscribe to channels to see their latest videos here</p>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )
      )}

      {activeView === 'channels' && (
        subscriptions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📺</div>
            <h2 className="empty-state-title">No subscriptions</h2>
            <p>Subscribe to channels to see them here</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {subscriptions.map((channel) => (
              <Link 
                key={channel.id} 
                to={`/channel/${channel.id}`}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}
                className="video-card"
              >
                <div 
                  className="channel-avatar-large"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '12px'
                  }}
                >
                  {channel.name?.[0]?.toUpperCase()}
                </div>
                <h3 style={{ fontSize: '14px', marginBottom: '4px' }}>{channel.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {formatSubscribers(channel.subscriber_count)}
                </p>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default Subscriptions;
