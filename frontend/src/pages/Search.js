import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import VideoCard from '../components/VideoCard';
import { Link } from 'react-router-dom';

const formatSubscribers = (count) => {
  if (!count) return '0 subscribers';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K subscribers`;
  return `${count} subscribers`;
};

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState({ videos: [], channels: [] });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults({ videos: [], channels: [] });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/search?q=${encodeURIComponent(query)}&type=${activeFilter}`);
        setResults(response.data);
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [query, activeFilter]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <h2 className="empty-state-title">Enter a search term</h2>
      </div>
    );
  }

  const hasResults = results.videos?.length > 0 || results.channels?.length > 0;

  return (
    <div>
      <h1 className="page-title">Search results for "{query}"</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button 
          className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        <button 
          className={`btn ${activeFilter === 'videos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveFilter('videos')}
        >
          Videos
        </button>
        <button 
          className={`btn ${activeFilter === 'channels' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveFilter('channels')}
        >
          Channels
        </button>
      </div>

      {!hasResults ? (
        <div className="empty-state">
          <div className="empty-state-icon">😕</div>
          <h2 className="empty-state-title">No results found</h2>
          <p>Try different keywords</p>
        </div>
      ) : (
        <>
          {/* Channels */}
          {results.channels?.length > 0 && (activeFilter === 'all' || activeFilter === 'channels') && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Channels</h2>
              {results.channels.map((channel) => (
                <Link 
                  key={channel.id} 
                  to={`/channel/${channel.id}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '8px'
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
                      fontWeight: 'bold'
                    }}
                  >
                    {channel.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{channel.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {formatSubscribers(channel.subscriber_count)} • {channel.video_count || 0} videos
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                      {channel.description?.slice(0, 100)}
                      {channel.description?.length > 100 && '...'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Videos */}
          {results.videos?.length > 0 && (activeFilter === 'all' || activeFilter === 'videos') && (
            <div>
              <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Videos</h2>
              <div className="video-grid">
                {results.videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Search;
