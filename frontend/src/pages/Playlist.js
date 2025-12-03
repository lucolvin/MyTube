import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const Playlist = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await api.get(`/playlists/${id}`);
        setPlaylist(response.data);
        setEditTitle(response.data.title);
      } catch (err) {
        setError('Failed to load playlist');
        console.error('Error fetching playlist:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [id]);

  const handleUpdateTitle = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      await api.put(`/playlists/${id}`, { title: editTitle });
      setPlaylist(prev => ({ ...prev, title: editTitle }));
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating playlist:', err);
    }
  };

  const handleRemoveVideo = async (videoId) => {
    try {
      await api.delete(`/playlists/${id}/videos/${videoId}`);
      setPlaylist(prev => ({
        ...prev,
        videos: prev.videos.filter(v => v.id !== videoId)
      }));
    } catch (err) {
      console.error('Error removing video:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <h2 className="empty-state-title">{error || 'Playlist not found'}</h2>
      </div>
    );
  }

  const isOwner = isAuthenticated && user?.id === playlist.user_id;

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        {isEditing ? (
          <form onSubmit={handleUpdateTitle} style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <input
              type="text"
              className="form-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{ flex: 1, maxWidth: '400px' }}
            />
            <button type="submit" className="btn btn-primary">Save</button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <div>
              <h1 className="page-title" style={{ marginBottom: '4px' }}>{playlist.title}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {playlist.username} • {playlist.videos?.length || 0} videos
              </p>
            </div>
            {isOwner && (
              <button 
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FiEdit2 />
                Edit
              </button>
            )}
          </>
        )}
      </div>

      {playlist.description && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {playlist.description}
        </p>
      )}

      {playlist.videos?.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <h2 className="empty-state-title">No videos in this playlist</h2>
          <p>Add videos to this playlist from the video page</p>
        </div>
      ) : (
        <div className="video-grid">
          {playlist.videos?.map((video, index) => (
            <div key={video.id} style={{ position: 'relative' }}>
              <VideoCard video={video} />
              {isOwner && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleRemoveVideo(video.id)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '4px 8px',
                    fontSize: '12px'
                  }}
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlist;
