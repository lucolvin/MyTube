import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiSearch, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { FaYoutube } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Header = ({ onMenuClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick}>
          <FiMenu size={24} />
        </button>
        <Link to="/" className="logo">
          <FaYoutube className="logo-icon" />
          <span>MyTube</span>
        </Link>
      </div>

      <div className="search-container">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button">
            <FiSearch size={20} />
          </button>
        </form>
      </div>

      <div className="header-right">
        {isAuthenticated ? (
          <div className="user-dropdown">
            <div 
              className="user-avatar"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            {showDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-item">
                  <FiUser />
                  <span>{user?.display_name || user?.username}</span>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { navigate('/library'); setShowDropdown(false); }}>
                  <FiSettings />
                  <span>Your Library</span>
                </button>
                <button className="dropdown-item" onClick={handleLogout}>
                  <FiLogOut />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="btn btn-outline">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
