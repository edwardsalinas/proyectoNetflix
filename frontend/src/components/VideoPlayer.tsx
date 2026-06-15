import React, { useEffect, useRef, useCallback, useState } from 'react';
import Hls from 'hls.js';
import { streamingService, historyService } from '../api/client';
import type { Movie } from '../api/client';
import { X, Settings } from 'lucide-react';

interface VideoPlayerProps {
  movie: Movie;
  userId: string;
  profileId: string;
  onClose: () => void;
  initialTime?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, userId, profileId, onClose, initialTime }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const hlsRef = useRef<Hls | null>(null);

  const [qualities, setQualities] = useState<string[]>(['Auto', '480p', '720p', '1080p', '2160p']);
  const [activeQuality, setActiveQuality] = useState<string>('Auto');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const reportProgress = useCallback(async (currentTime: number) => {
    if (Math.abs(currentTime - lastReportedRef.current) < 1) return;
    lastReportedRef.current = currentTime;
    try {
      await historyService.updateProgress(userId, profileId, movie.movieId, currentTime);
    } catch {
      /* silent */
    }
  }, [userId, profileId, movie.movieId]);

  const handleQualityChange = async (q: string) => {
    setActiveQuality(q);
    setShowDropdown(false);
    const video = videoRef.current;
    if (!video) return;
    const currentTime = video.currentTime;
    const paused = video.paused;

    if (hlsRef.current) {
      if (q === 'Auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const levelIndex = hlsRef.current.levels.findIndex((lvl: any) => {
          const name = lvl.height ? `${lvl.height}p` : (lvl.width === 3840 ? '2160p' : '');
          return name === q;
        });
        if (levelIndex !== -1) {
          hlsRef.current.currentLevel = levelIndex;
        }
      }
    } else {
      // Fallback nativo (Safari)
      try {
        const preferredQuality = q === 'Auto' ? undefined : (q === '2160p' ? '4k' : q);
        const session = await streamingService.createSession(movie.movieId, preferredQuality);
        video.src = session.url;
        video.currentTime = currentTime;
        if (!paused) {
          video.play().catch(() => {});
        }
      } catch (err) {
        console.error('Error al cambiar de calidad nativa:', err);
      }
    }
  };

  useEffect(() => {
    let hls: Hls | null = null;

    const init = async () => {
      try {
        const session = await streamingService.createSession(movie.movieId);
        const video = videoRef.current;
        if (!video) return;

        if (initialTime) {
          lastReportedRef.current = initialTime;
        }

        if (Hls.isSupported()) {
          const searchParams = new URL(session.url).search;

          class CustomLoader extends Hls.DefaultConfig.loader {
            constructor(config: any) {
              super(config);
            }
            load(context: any, config: any, callbacks: any) {
              if (context.url && searchParams) {
                try {
                  const urlObj = new URL(context.url);
                  if (!urlObj.searchParams.has('Policy')) {
                    const params = new URLSearchParams(searchParams);
                    params.forEach((value, key) => {
                      urlObj.searchParams.set(key, value);
                    });
                    context.url = urlObj.toString();
                  }
                } catch (e) {
                  console.error('Error appending signature params to HLS request:', e);
                }
              }
              super.load(context, config, callbacks);
            }
          }

          hls = new Hls({
            loader: CustomLoader as any
          });
          hlsRef.current = hls;
          hls.loadSource(session.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (initialTime) {
              video.currentTime = initialTime;
            }
            if (hls && hls.levels) {
              const mapped = hls.levels.map((lvl: any, index: number) => {
                if (lvl.height && lvl.height > 0) return `${lvl.height}p`;
                if (lvl.width === 3840) return '2160p';
                
                // Parse from attrs RESOLUTION
                if (lvl.attrs && lvl.attrs.RESOLUTION) {
                  const parts = lvl.attrs.RESOLUTION.split('x');
                  if (parts.length === 2) {
                    const h = parseInt(parts[1], 10);
                    if (h > 0) return `${h}p`;
                  }
                }
                
                // Parse from bitrate/bandwidth
                const bitrate = lvl.bitrate || (lvl.attrs && lvl.attrs.BANDWIDTH ? parseInt(lvl.attrs.BANDWIDTH, 10) : 0);
                if (bitrate > 0) {
                  if (bitrate >= 10000000) return '2160p';
                  if (bitrate >= 4000000) return '1080p';
                  if (bitrate >= 2000000) return '720p';
                  if (bitrate >= 800000) return '480p';
                  return `${Math.round(bitrate / 1000)} Kbps`;
                }
                
                // Fallback for single level / redirect
                return hls!.levels.length === 1 ? '720p' : `Opción ${index + 1}`;
              });
              setQualities(['Auto', ...Array.from(new Set(mapped))]);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = session.url;
          if (initialTime) {
            const setTime = () => {
              video.currentTime = initialTime;
              video.removeEventListener('loadedmetadata', setTime);
            };
            video.addEventListener('loadedmetadata', setTime);
          }
        }
      } catch (err) {
        /* silent */
      }
    };

    init();

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
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
          `${import.meta.env.VITE_API_BASE_URL}/users/${userId}/history/${movie.movieId}?profileId=${profileId}`,
          JSON.stringify({ progressSeconds: Math.round(video.currentTime) })
        );
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        historyService.updateProgress(userId, profileId, movie.movieId, video.currentTime);
      }
    };
  }, [userId, profileId, movie.movieId]);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: '#000', zIndex: 2000, display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div style={{ position: 'absolute', top: '20px', right: '70px', zIndex: 10 }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
            width: '40px', height: '40px', display: 'flex', justifyContent: 'center',
            alignItems: 'center', color: '#fff', cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          title="Calidad de video"
        >
          <Settings size={22} style={{ transform: showDropdown ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
        </button>

        {showDropdown && (
          <div
            style={{
              position: 'absolute', top: '50px', right: 0,
              background: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '8px 0', minWidth: '120px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              display: 'flex', flexDirection: 'column', gap: '2px'
            }}
          >
            {qualities.map((q) => {
              const isActive = activeQuality === q;
              return (
                <button
                  key={q}
                  onClick={() => handleQualityChange(q)}
                  style={{
                    background: isActive ? 'rgba(229, 9, 20, 0.2)' : 'transparent',
                    border: 'none',
                    color: isActive ? '#E50914' : '#fff',
                    padding: '8px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: isActive ? 'bold' : 'normal',
                    width: '100%',
                    transition: 'background 0.2s, color 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{q}</span>
                  {isActive && <span style={{ fontSize: '10px' }}>●</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

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
