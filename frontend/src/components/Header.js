import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiSearch, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { FaYoutube } from 'react-icons/fa';
// Auth removed; no user context

const Header = ({ onMenuClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // No authentication; no logout

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
        {/* No auth UI */}
      </div>
    </header>
  );
};

export default Header;
