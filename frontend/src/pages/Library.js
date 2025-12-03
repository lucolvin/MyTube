import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import { FiClock, FiThumbsUp, FiList, FiPlus } from 'react-icons/fi';

const Library = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [likedVideos, setLikedVideos] = useState([]);
  const [watchLater, setWatchLater] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    const fetchLibrary = async () => {
      if (!isAuthenticated) return;
      
      try {
        const [likedRes, watchLaterRes, playlistsRes, historyRes] = await Promise.all([
          api.get('/users/liked').catch(() => ({ data: [] })),
          api.get('/users/watch-later').catch(() => ({ data: [] })),
          api.get('/playlists').catch(() => ({ data: [] })),
          api.get('/users/history?limit=4').catch(() => ({ data: { videos: [] } }))
        ]);
        
        setLikedVideos(likedRes.data || []);
        setWatchLater(watchLaterRes.data || []);
        setPlaylists(playlistsRes.data || []);
        setHistory(historyRes.data.videos || []);
      } catch (err) {
        console.error('Error fetching library:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchLibrary();
    }
  }, [isAuthenticated, authLoading]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      const response = await api.post('/playlists', { title: newPlaylistName });
      setPlaylists([response.data, ...playlists]);
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

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
      <h1 className="page-title">Library</h1>

      {/* History Section */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiClock />
            History
          </h2>
          <Link to="/history" className="btn btn-secondary">See all</Link>
        </div>
        {history.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No watch history</p>
        ) : (
          <div className="video-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {history.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>

      {/* Watch Later Section */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiClock />
            Watch Later ({watchLater.length})
          </h2>
        </div>
        {watchLater.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No videos in Watch Later</p>
        ) : (
          <div className="video-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {watchLater.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>

      {/* Liked Videos Section */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiThumbsUp />
            Liked Videos ({likedVideos.length})
          </h2>
        </div>
        {likedVideos.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No liked videos</p>
        ) : (
          <div className="video-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {likedVideos.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>

      {/* Playlists Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiList />
            Playlists ({playlists.length})
          </h2>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowCreatePlaylist(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <FiPlus />
            New Playlist
          </button>
        </div>

        {showCreatePlaylist && (
          <form 
            onSubmit={handleCreatePlaylist}
            style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">Create</button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setShowCreatePlaylist(false)}
            >
              Cancel
            </button>
          </form>
        )}

        {playlists.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No playlists</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {playlists.map((playlist) => (
              <Link 
                key={playlist.id} 
                to={`/playlist/${playlist.id}`}
                className="video-card"
                style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div 
                  style={{ 
                    aspectRatio: '16/9', 
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FiList size={32} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <h3 style={{ fontSize: '14px', marginBottom: '4px' }}>{playlist.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {playlist.video_count || 0} videos
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Library;
