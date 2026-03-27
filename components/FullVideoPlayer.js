"use client";
import { useEffect, useRef, useState } from 'react';

export default function FullVideoPlayer({ videoFile, videoUrl, onClose }) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    // Accept either videoFile (File object) or videoUrl (string)
    if (!video || (!videoFile && !videoUrl)) return;

    let objectUrl = null;
    let finalVideoSrc = null;

    // If we have a File object, create a blob URL
    if (videoFile) {
      // Validate that videoFile is a valid File or Blob
      if (!(videoFile instanceof File) && !(videoFile instanceof Blob)) {
        console.error('Invalid videoFile:', videoFile);
        return;
      }

      try {
        objectUrl = URL.createObjectURL(videoFile);
        if (!objectUrl) {
          console.error('Failed to create object URL');
          return;
        }
        finalVideoSrc = objectUrl;
      } catch (error) {
        console.error('Error creating object URL:', error);
        return;
      }
    } 
    // If we have a URL string, use it directly
    else if (videoUrl) {
      finalVideoSrc = videoUrl;
    }

    if (finalVideoSrc) {
      video.src = finalVideoSrc;
    }

    const handleLoadedData = () => {
      // Use loadeddata instead of loadedmetadata for better reliability
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
      // Don't auto-play - let user control it
      setIsPlaying(false);
    };

    const handleLoadedMetadata = () => {
      // Fallback: set duration from metadata if valid
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
        setDuration(prevDuration => {
          // Only update if not already set
          return prevDuration === 0 ? video.duration : prevDuration;
        });
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e) => {
      console.error('Video error:', e);
      const error = video.error;
      if (error) {
        console.error('Video error code:', error.code);
        console.error('Video error message:', error.message);
      }
      setIsPlaying(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Cleanup
    return () => {
      // Safely pause and reset video before cleanup
      try {
        if (!video.paused) {
          video.pause().catch(err => {
            // Ignore errors during cleanup
            if (err.name !== 'AbortError') {
              console.log('Video cleanup pause error (safe to ignore):', err);
            }
          });
        }
        video.currentTime = 0;
        video.src = ''; // Clear the src to stop any pending requests
      } catch (error) {
        // Ignore AbortError during cleanup
        if (error.name !== 'AbortError') {
          console.log('Video cleanup error (safe to ignore):', error);
        }
      }

      setIsPlaying(false);

      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);

      // Revoke blob URL after a small delay (only if we created one from File)
      const urlToRevoke = objectUrl;
      if (urlToRevoke) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(urlToRevoke);
          } catch (error) {
            console.log('URL revocation error (safe to ignore):', error);
          }
        }, 100);
      }
    };
  }, [videoFile, videoUrl]);

  const formatTime = (sec) => {
    if (typeof sec !== 'number' || Number.isNaN(sec)) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const parts = [m, s].map((n) => String(n).padStart(2, '0'));
    if (h > 0) parts.unshift(String(h).padStart(2, '0'));
    return parts.join(':');
  };

  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if video has a valid source
    if (!video.src && !video.currentSrc) {
      console.error('Video has no source');
      return;
    }

    try {
      if (isPlaying) {
        video.pause();
      } else {
        // Ensure video is ready before playing
        if (video.readyState >= 2) {
          await video.play();
        } else {
          // Wait for video to be ready
          video.addEventListener('canplay', async () => {
            try {
              await video.play();
            } catch (error) {
              console.error('Error playing video:', error);
              setIsPlaying(false);
            }
          }, { once: true });
        }
      }
    } catch (error) {
      console.error('Play/pause error:', error);
      setIsPlaying(false);
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
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          style={{
            width: '100%',
            aspectRatio: '678 / 1198',
            objectFit: 'cover',
            backgroundColor: '#000',
            cursor: 'pointer'
          }}
          onError={(e) => {
            console.error('Video element error:', e);
            const video = e.currentTarget;
            if (video && video.error) {
              console.error('Video error details:', {
                code: video.error.code,
                message: video.error.message,
                videoSrc: video.src
              });
            }
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
