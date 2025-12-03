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
  const [isSpeedUp, setIsSpeedUp] = useState(false);
  const [showSpeedIndicator, setShowSpeedIndicator] = useState(false);
  const normalSpeedRef = useRef(1);
  const speedUpMultiplier = 2;
  const holdTimeoutRef = useRef(null);
  const isHoldingRef = useRef(false);
  const mouseDownTimeRef = useRef(null);

  // Handle speed up activation
  const activateSpeedUp = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      normalSpeedRef.current = videoRef.current.playbackRate;
      videoRef.current.playbackRate = speedUpMultiplier;
      setIsSpeedUp(true);
      setShowSpeedIndicator(true);
    }
  }, []);

  // Handle speed up deactivation
  const deactivateSpeedUp = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = normalSpeedRef.current;
      setIsSpeedUp(false);
      setShowSpeedIndicator(false);
    }
    isHoldingRef.current = false;
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }, []);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only respond to spacebar when video player is focused or in focus
      if (e.code === 'Space' && !e.repeat) {
        // Check if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        
        if (!isHoldingRef.current) {
          isHoldingRef.current = true;
          // Start a timer - if held for 200ms, activate speed up
          holdTimeoutRef.current = setTimeout(() => {
            activateSpeedUp();
          }, 200);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        
        if (isSpeedUp) {
          // Was holding for speed - just deactivate
          deactivateSpeedUp();
        } else if (isHoldingRef.current) {
          // Was a quick tap - toggle play/pause
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }
        }
        
        isHoldingRef.current = false;
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
  }, [isSpeedUp, activateSpeedUp, deactivateSpeedUp]);

  // Mouse event handlers for left-click hold to speed up
  const handleMouseDown = (e) => {
    // Only respond to left click on the video element
    if (e.button !== 0) return;
    
    mouseDownTimeRef.current = Date.now();
    isHoldingRef.current = true;
    
    // Start a timer - if held for 200ms, activate speed up
    holdTimeoutRef.current = setTimeout(() => {
      activateSpeedUp();
    }, 200);
  };

  const handleMouseUp = (e) => {
    if (e.button !== 0) return;
    
    const holdDuration = Date.now() - (mouseDownTimeRef.current || 0);
    
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    
    if (isSpeedUp) {
      // Was holding for speed - just deactivate
      deactivateSpeedUp();
    } else if (holdDuration < 200) {
      // Was a quick click - toggle play/pause
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    }
    
    isHoldingRef.current = false;
    mouseDownTimeRef.current = null;
  };

  const handleMouseLeave = () => {
    if (isSpeedUp) {
      deactivateSpeedUp();
    }
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    isHoldingRef.current = false;
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
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        className="video-player"
        src={getStreamUrl(videoId)}
        controls
        autoPlay
      />
      <div className={`speed-indicator ${showSpeedIndicator ? 'visible' : ''}`}>
        {speedUpMultiplier}x
      </div>
    </div>
  );
};

export default VideoPlayer;
