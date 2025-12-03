import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, FiTrendingUp, FiClock, FiThumbsUp, 
  FiList, FiFilm
} from 'react-icons/fi';
import { MdSubscriptions, MdVideoLibrary, MdHistory } from 'react-icons/md';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Home' },
    { path: '/trending', icon: FiTrendingUp, label: 'Trending' },
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
      </nav>
    </aside>
  );
};

export default Sidebar;
