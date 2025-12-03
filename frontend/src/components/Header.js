import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiSearch, FiLogIn, FiLogOut, FiUser } from 'react-icons/fi';
import { FaYoutube } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Header = ({ onMenuClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <FiUser size={18} />
              {user?.display_name || user?.username}
            </span>
            <button 
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FiLogOut size={18} />
              Sign out
            </button>
          </div>
        ) : (
          <Link 
            to="/login" 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiLogIn size={18} />
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
