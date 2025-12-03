import React, { useRef, useState, useEffect, useCallback } from 'react';
import { getStreamUrl } from '../services/api';

/**
 * VideoPlayer component with YouTube-like features:
 * - Tap spacebar or left-click to pause/play
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
  const keyDownTimeRef = useRef(null);
  const mouseDownTimeRef = useRef(null);
  
  // Threshold in milliseconds to differentiate tap from hold
  const HOLD_THRESHOLD = 200;

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
    if (videoRef.current && isSpeedUpRef.current) {
      videoRef.current.playbackRate = normalSpeedRef.current;
    }
    isSpeedUpRef.current = false;
    setShowSpeedIndicator(false);
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  // Keyboard event handlers for spacebar: tap to pause/play, hold to speed up
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only respond to spacebar
      if (e.code === 'Space' && !e.repeat) {
        // Check if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        
        // Record the time when key was pressed
        keyDownTimeRef.current = Date.now();
        
        // Start a timeout to activate speed up after hold threshold
        holdTimeoutRef.current = setTimeout(() => {
          activateSpeedUp();
        }, HOLD_THRESHOLD);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        // Check if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        
        // Calculate how long the key was held
        const holdDuration = keyDownTimeRef.current ? Date.now() - keyDownTimeRef.current : 0;
        
        // Clear the hold timeout if it hasn't fired yet
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        
        // If it was a short tap (not a hold), toggle play/pause
        if (holdDuration < HOLD_THRESHOLD && !isSpeedUpRef.current) {
          togglePlayPause();
        } else {
          // Deactivate speed up if it was active
          deactivateSpeedUp();
        }
        
        keyDownTimeRef.current = null;
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
  }, [activateSpeedUp, deactivateSpeedUp, togglePlayPause]);

  // Mouse event handlers for left-click: tap to pause/play, hold to speed up
  const handleMouseDown = (e) => {
    // Only respond to left click
    if (e.button !== 0) return;
    
    mouseDownTimeRef.current = Date.now();
    
    // Start a timeout to activate speed up after hold threshold
    holdTimeoutRef.current = setTimeout(() => {
      activateSpeedUp();
    }, HOLD_THRESHOLD);
  };

  const handleMouseUp = (e) => {
    if (e.button !== 0) return;
    
    // Calculate how long the mouse was held
    const holdDuration = mouseDownTimeRef.current ? Date.now() - mouseDownTimeRef.current : 0;
    
    // Clear the hold timeout if it hasn't fired yet
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    
    // If it was a short tap (not a hold), toggle play/pause
    if (holdDuration < HOLD_THRESHOLD && !isSpeedUpRef.current) {
      togglePlayPause();
    } else {
      // Deactivate speed up if it was active
      deactivateSpeedUp();
    }
    
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
    mouseDownTimeRef.current = null;
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
