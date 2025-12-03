import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Channel from './pages/Channel';
import Search from './pages/Search';
import History from './pages/History';
import Subscriptions from './pages/Subscriptions';
import Library from './pages/Library';
import Playlist from './pages/Playlist';
// Auth pages removed
import './styles/App.css';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/channel/:id" element={<Channel />} />
        <Route path="/search" element={<Search />} />
        <Route path="/history" element={<History />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/library" element={<Library />} />
        <Route path="/playlist/:id" element={<Playlist />} />
      </Routes>
    </Layout>
  );
}

export default App;
