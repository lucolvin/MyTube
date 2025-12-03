import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';

const formatSubscribers = (count) => {
  if (!count) return '0 subscribers';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K subscribers`;
  return `${count} subscribers`;
};

const Channel = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [sortBy, setSortBy] = useState('created_at');

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        setLoading(true);
        const [channelRes, videosRes] = await Promise.all([
          api.get(`/channels/${id}`),
          api.get(`/channels/${id}/videos?sort=${sortBy}&order=desc`)
        ]);
        setChannel(channelRes.data);
        setVideos(videosRes.data.videos || []);
        setIsSubscribed(channelRes.data.is_subscribed || false);
      } catch (err) {
        setError('Failed to load channel');
        console.error('Error fetching channel:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannel();
  }, [id, sortBy]);

  const handleSubscribe = async () => {
    if (!isAuthenticated) return;
    
    try {
      if (isSubscribed) {
        await api.delete(`/channels/${id}/subscribe`);
        setIsSubscribed(false);
        setChannel(prev => ({
          ...prev,
          subscriber_count: Math.max((prev.subscriber_count || 0) - 1, 0)
        }));
      } else {
        await api.post(`/channels/${id}/subscribe`);
        setIsSubscribed(true);
        setChannel(prev => ({
          ...prev,
          subscriber_count: (prev.subscriber_count || 0) + 1
        }));
      }
    } catch (err) {
      console.error('Error subscribing:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <h2 className="empty-state-title">{error || 'Channel not found'}</h2>
      </div>
    );
  }

  return (
    <div className="channel-page">
      {/* Channel Banner */}
      <div 
        className="channel-banner"
        style={{
          backgroundImage: channel.banner_url ? `url(${channel.banner_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Channel Header */}
      <div className="channel-header">
        <div 
          className="channel-avatar-large"
          style={{
            backgroundImage: channel.avatar_url ? `url(${channel.avatar_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 'bold'
          }}
        >
          {!channel.avatar_url && channel.name?.[0]?.toUpperCase()}
        </div>
        <div className="channel-info-section">
          <h1>{channel.name}</h1>
          <p className="channel-stats">
            {formatSubscribers(channel.subscriber_count)} • {channel.video_count || 0} videos
          </p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            {channel.description}
          </p>
        </div>
        {isAuthenticated && (
          <button 
            className={`btn ${isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleSubscribe}
            style={{ marginLeft: 'auto' }}
          >
            {isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          Videos
        </button>
        <button 
          className={`tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'videos' && (
        <div>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <button 
              className={`btn ${sortBy === 'created_at' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSortBy('created_at')}
            >
              Latest
            </button>
            <button 
              className={`btn ${sortBy === 'view_count' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSortBy('view_count')}
            >
              Popular
            </button>
          </div>
          
          {videos.length === 0 ? (
            <div className="empty-state">
              <h2 className="empty-state-title">No videos yet</h2>
              <p>This channel hasn't uploaded any videos</p>
            </div>
          ) : (
            <div className="video-grid">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div style={{ maxWidth: '800px' }}>
          <h3 style={{ marginBottom: '16px' }}>Description</h3>
          <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {channel.description || 'No description available.'}
          </p>
          <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Stats</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Joined {new Date(channel.created_at).toLocaleDateString()}
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            {channel.video_count || 0} videos
          </p>
        </div>
      )}
    </div>
  );
};

export default Channel;
