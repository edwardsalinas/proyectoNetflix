import React, { useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { streamingService, historyService } from '../api/client';
import type { Movie } from '../api/client';
import { X } from 'lucide-react';

interface VideoPlayerProps {
  movie: Movie;
  userId: string;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, userId, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const reportProgress = useCallback(async (currentTime: number) => {
    if (Math.abs(currentTime - lastReportedRef.current) < 1) return;
    lastReportedRef.current = currentTime;
    try {
      await historyService.updateProgress(userId, movie.movieId, currentTime);
    } catch {
      /* silent */
    }
  }, [userId, movie.movieId]);

  useEffect(() => {
    let hls: Hls | null = null;

    const init = async () => {
      try {
        const session = await streamingService.createSession(movie.movieId);
        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(session.url);
          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = session.url;
        }
      } catch {
        /* silent */
      }
    };

    init();

    return () => {
      if (hls) hls.destroy();
    };
  }, [movie.movieId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPause = () => reportProgress(video.currentTime);
    video.addEventListener('pause', onPause);

    intervalRef.current = setInterval(() => {
      if (!video.paused) reportProgress(video.currentTime);
    }, 30000);

    return () => {
      video.removeEventListener('pause', onPause);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [reportProgress]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_BASE_URL}/users/${userId}/history/${movie.movieId}`,
          JSON.stringify({ currentTime: video.currentTime })
        );
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        historyService.updateProgress(userId, movie.movieId, video.currentTime);
      }
    };
  }, [userId, movie.movieId]);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: '#000', zIndex: 2000, display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '20px', right: '20px', zIndex: 10,
          background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', display: 'flex', justifyContent: 'center',
          alignItems: 'center', color: '#fff', cursor: 'pointer'
        }}
      >
        <X size={22} />
      </button>

      <video
        ref={videoRef}
        controls
        autoPlay
        style={{ width: '100%', height: '100%', maxWidth: '100vw', maxHeight: '100vh' }}
        playsInline
      />
    </div>
  );
};
