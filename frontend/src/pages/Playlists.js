import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiList, FiPlus, FiTrash2 } from 'react-icons/fi';

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await api.get('/playlists');
        setPlaylists(response.data || []);
      } catch (err) {
        console.error('Error fetching playlists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      const response = await api.post('/playlists', { 
        title: newPlaylistName,
        description: newPlaylistDescription
      });
      setPlaylists([response.data, ...playlists]);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      await api.delete(`/playlists/${playlistId}`);
      setPlaylists(playlists.filter(p => p.id !== playlistId));
    } catch (err) {
      console.error('Error deleting playlist:', err);
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
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Playlists</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FiPlus />
          New Playlist
        </button>
      </div>

      {showCreateForm && (
        <form 
          onSubmit={handleCreatePlaylist}
          style={{ 
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            marginBottom: '24px'
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              style={{ width: '100%' }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <textarea
              className="form-input"
              placeholder="Description (optional)"
              value={newPlaylistDescription}
              onChange={(e) => setNewPlaylistDescription(e.target.value)}
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary">Create</button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setShowCreateForm(false);
                setNewPlaylistName('');
                setNewPlaylistDescription('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {playlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h2 className="empty-state-title">No playlists yet</h2>
          <p>Create a playlist to organize your favorite videos</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {playlists.map((playlist) => (
            <div 
              key={playlist.id}
              style={{ 
                position: 'relative',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <Link 
                to={`/playlist/${playlist.id}`}
                style={{ display: 'block' }}
              >
                <div 
                  style={{ 
                    aspectRatio: '16/9', 
                    backgroundColor: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: playlist.thumbnail ? `url(${playlist.thumbnail})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {!playlist.thumbnail && (
                    <FiList size={32} style={{ color: 'var(--text-secondary)' }} />
                  )}
                </div>
                <div style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '4px' }}>{playlist.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {playlist.video_count || 0} videos
                  </p>
                </div>
              </Link>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeletePlaylist(playlist.id);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '4px 8px',
                  fontSize: '12px'
                }}
                title="Delete playlist"
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

export default Playlists;
