import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, FiClock, FiThumbsUp, 
  FiList
} from 'react-icons/fi';
import { MdSubscriptions, MdVideoLibrary, MdHistory } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!isAuthenticated) {
        setSubscriptions([]);
        return;
      }
      
      try {
        const response = await api.get('/users/subscriptions');
        setSubscriptions(response.data || []);
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
      }
    };

    fetchSubscriptions();
  }, [isAuthenticated]);

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Home' },
    { path: '/subscriptions', icon: MdSubscriptions, label: 'Subscriptions' },
  ];

  const libraryItems = [
    { path: '/library', icon: MdVideoLibrary, label: 'Library' },
    { path: '/history', icon: MdHistory, label: 'History' },
    { path: '/liked', icon: FiThumbsUp, label: 'Liked videos' },
    { path: '/watch-later', icon: FiClock, label: 'Watch later' },
    { path: '/playlists', icon: FiList, label: 'Playlists' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <nav>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <item.icon className="sidebar-item-icon" />
            <span>{item.label}</span>
          </Link>
        ))}
        
        <div className="sidebar-divider" />
        
        {isOpen && <div className="sidebar-section-title">Library</div>}
        
        {libraryItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <item.icon className="sidebar-item-icon" />
            <span>{item.label}</span>
          </Link>
        ))}
        
        {/* Subscribed channels section */}
        {isAuthenticated && subscriptions.length > 0 && (
          <>
            <div className="sidebar-divider" />
            
            {isOpen && <div className="sidebar-section-title">Subscriptions</div>}
            
            {subscriptions.slice(0, 7).map((channel) => (
              <Link
                key={channel.id}
                to={`/channel/${channel.id}`}
                className={`sidebar-item ${location.pathname === `/channel/${channel.id}` ? 'active' : ''}`}
              >
                <div className="sidebar-channel-avatar">
                  {channel.name?.[0]?.toUpperCase() || 'C'}
                </div>
                <span>{channel.name}</span>
              </Link>
            ))}
            
            {subscriptions.length > 7 && isOpen && (
              <Link
                to="/subscriptions"
                className="sidebar-item"
              >
                <MdSubscriptions className="sidebar-item-icon" />
                <span>Show all ({subscriptions.length})</span>
              </Link>
            )}
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
