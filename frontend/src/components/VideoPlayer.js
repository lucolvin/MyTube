import React, { useRef, useState, useEffect, useCallback } from 'react';
import { getStreamUrl } from '../services/api';

/**
 * VideoPlayer component with YouTube-like features:
 * - Hold spacebar or left-click to speed up playback (2x speed)
 * - Standard video controls
 * - Resume from last position
 */
const VideoPlayer = ({ videoId, startPosition = 0, onProgress }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [showSpeedIndicator, setShowSpeedIndicator] = useState(false);
  const normalSpeedRef = useRef(1);
  const speedUpMultiplier = 2;
  const holdTimeoutRef = useRef(null);
  const isSpeedUpRef = useRef(false);
  const mouseDownTimeRef = useRef(null);

  // Handle speed up activation
  const activateSpeedUp = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      normalSpeedRef.current = videoRef.current.playbackRate;
      videoRef.current.playbackRate = speedUpMultiplier;
      isSpeedUpRef.current = true;
      setShowSpeedIndicator(true);
    }
  }, []);

  // Handle speed up deactivation
  const deactivateSpeedUp = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = normalSpeedRef.current;
    }
    isSpeedUpRef.current = false;
    setShowSpeedIndicator(false);
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }, []);

  // Keyboard event handlers for spacebar hold to speed up
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only respond to spacebar
      if (e.code === 'Space' && !e.repeat) {
        // Check if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        
        // Immediately activate speed up when spacebar is pressed
        activateSpeedUp();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        // Check if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        
        // Deactivate speed up when spacebar is released
        deactivateSpeedUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
    };
  }, [activateSpeedUp, deactivateSpeedUp]);

  // Mouse event handlers for left-click hold to speed up
  const handleMouseDown = (e) => {
    // Only respond to left click
    if (e.button !== 0) return;
    
    // Prevent default to avoid interference with native controls
    e.preventDefault();
    
    mouseDownTimeRef.current = Date.now();
    
    // Immediately activate speed up
    activateSpeedUp();
  };

  const handleMouseUp = (e) => {
    if (e.button !== 0) return;
    
    e.preventDefault();
    
    // Deactivate speed up
    deactivateSpeedUp();
    
    mouseDownTimeRef.current = null;
  };

  const handleMouseLeave = () => {
    if (isSpeedUpRef.current) {
      deactivateSpeedUp();
    }
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  // Set initial position
  useEffect(() => {
    if (videoRef.current && startPosition > 0) {
      videoRef.current.currentTime = startPosition;
    }
  }, [startPosition]);

  // Track progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (onProgress) {
        onProgress(video.currentTime, video.duration);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onProgress]);

  return (
    <div 
      ref={containerRef}
      className="video-player-container"
    >
      <video
        ref={videoRef}
        className="video-player"
        src={getStreamUrl(videoId)}
        controls
        autoPlay
      />
      <div 
        className="video-overlay"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <div className={`speed-indicator ${showSpeedIndicator ? 'visible' : ''}`}>
        {speedUpMultiplier}x
      </div>
    </div>
  );
};

export default VideoPlayer;
