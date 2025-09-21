"use client";
import { useEffect, useRef, useState } from 'react';

export default function FullVideoPlayer({ videoFile, onClose }) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoFile) return;

    // Create object URL for the video file
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      // Auto-play the full video
      video.play().catch(error => {
        console.log('Auto-play prevented by browser:', error);
        setIsPlaying(false);
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      URL.revokeObjectURL(videoUrl);
    };
  }, [videoFile]);

  const formatTime = (sec) => {
    if (typeof sec !== 'number' || Number.isNaN(sec)) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const parts = [m, s].map((n) => String(n).padStart(2, '0'));
    if (h > 0) parts.unshift(String(h).padStart(2, '0'));
    return parts.join(':');
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    }
  };

  const handleProgressClick = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    
    video.currentTime = duration * percentage;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        // Close modal if clicking on backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 8,
          maxWidth: '350px',
          maxHeight: '90vh',
          width: '100%',
          position: 'relative',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0, 0, 0, 0.7)',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: 'white',
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#18204aff', fontFamily: "'Inter', sans-serif" }}>
            Full Video
          </h3>
        </div>
        
        <video
          ref={videoRef}
          onClick={togglePlayPause}
          style={{
            width: '100%',
            aspectRatio: '678 / 1198',
            objectFit: 'cover',
            backgroundColor: '#000',
            cursor: 'pointer'
          }}
        />
        
        {/* Custom Controls */}
        <div style={{ marginTop: 12 }}>
          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            style={{
              background: '#4444ff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              marginBottom: 8,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          
          {/* Custom Progress Bar */}
          <div
            onClick={handleProgressClick}
            style={{
              width: '100%',
              height: 8,
              backgroundColor: '#ddd',
              borderRadius: 4,
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, progress))}%`,
                height: '100%',
                backgroundColor: '#4444ff',
                borderRadius: 4,
                transition: 'width 0.1s ease'
              }}
            />
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: 12, 
            color: '#666',
            marginTop: 4
          }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
