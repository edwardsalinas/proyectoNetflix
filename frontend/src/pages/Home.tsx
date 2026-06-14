import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/auth';
import { useProfile } from '../context/ProfileContext';
import { ReviewsSection } from '../components/ReviewsSection';
import { VideoPlayer } from '../components/VideoPlayer';
import { LogOut, User, Film, Play, Star, X, ChevronLeft, ChevronRight, Search, Plus, Check, Clock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { movieService, userListService, historyService } from '../api/client';
import { getRecommendations } from '../api/recommendations';
import { getGenres, getGenreList, getMoviesByGenre } from '../api/genres';
import type { Movie } from '../api/client';

const DEFAULT_POSTER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">' +
  '<rect width="400" height="600" fill="#1a1a2e"/>' +
  '<rect x="120" y="160" width="160" height="280" rx="8" fill="none" stroke="#333" stroke-width="6"/>' +
  '<circle cx="200" cy="300" r="50" fill="none" stroke="#333" stroke-width="6"/>' +
  '<polygon points="200,265 200,335 245,300" fill="#333"/>' +
  '</svg>'
);

export const Home: React.FC = () => {
  const { logout, user } = useAuth();
  const { activeProfile, clearActiveProfile } = useProfile();
  const navigate = useNavigate();
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [realMovieData, setRealMovieData] = useState<any>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [initialPlayTime, setInitialPlayTime] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const catalogCarouselRef = useRef<HTMLDivElement>(null);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const recommendationsCarouselRef = useRef<HTMLDivElement>(null);
  const topCarouselRef = useRef<HTMLDivElement>(null);
  const [genreMap, setGenreMap] = useState<Record<string, string>>({});
  const [genreRows, setGenreRows] = useState<{ genreId: string; name: string; movies: Movie[] }[]>([]);
  const [genreRowsLoading, setGenreRowsLoading] = useState(false);
  const genreCarouselRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [myList, setMyList] = useState<Movie[]>([]);
  const [watchHistory, setWatchHistory] = useState<(Movie & { currentTime: number; duration: number })[]>([]);
  const watchHistoryCarouselRef = useRef<HTMLDivElement>(null);
  const myListCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGenres().then(setGenreMap).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeProfile?.profileId) return;
    let cancelled = false;
    const fetchGenreRows = async () => {
      setGenreRowsLoading(true);
      try {
        const genres = await getGenreList();
        const limited = genres.slice(0, 6);
        const results = await Promise.all(
          limited.map(async (g) => {
            const movies = await getMoviesByGenre(g.genreId);
            return { ...g, movies };
          })
        );
        if (!cancelled) setGenreRows(results.filter(r => r.movies.length > 0));
      } catch (err) {
        console.error('Error al cargar filas por género:', err);
      } finally {
        if (!cancelled) setGenreRowsLoading(false);
      }
    };
    fetchGenreRows();
    return () => { cancelled = true; };
  }, [activeProfile?.profileId]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const movies = await movieService.getMovies();
        setAllMovies(movies);
      } catch (err) {
        console.error('Error al cargar películas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  useEffect(() => {
    if (selectedMovie) {
      setRealMovieData(null);
      movieService.getMovie(selectedMovie.movieId).then(data => {
        if (data) {
          setRealMovieData(data);
          // Actualizar también la película en la lista principal por si cambió la puntuación tras una reseña
          setAllMovies(prevMovies =>
            prevMovies.map(m => m.movieId === selectedMovie.movieId ? { ...m, rating: data.rating } : m)
          );
        }
      });
    }
  }, [selectedMovie]);

  useEffect(() => {
    if (!user?.sub || !activeProfile?.profileId) {
      setRecommendations([]);
      return;
    }
    let cancelled = false;
    const fetchRecommendations = async () => {
      setRecommendationsLoading(true);
      try {
        const data = await getRecommendations(user.sub, activeProfile.profileId, genreMap);
        if (!cancelled) setRecommendations(data);
      } catch (err) {
        console.error('Error al cargar recomendaciones:', err);
      } finally {
        if (!cancelled) setRecommendationsLoading(false);
      }
    };
    fetchRecommendations();
    return () => { cancelled = true; };
  }, [user?.sub, activeProfile?.profileId, genreMap]);

  const fetchMyListAndHistory = useCallback(async () => {
    if (!user?.sub || !activeProfile?.profileId) {
      setMyList([]);
      setWatchHistory([]);
      return;
    }
    try {
      const [listData, historyData, movies] = await Promise.all([
        userListService.getUserList(user.sub, activeProfile.profileId),
        historyService.getHistory(user.sub, activeProfile.profileId),
        movieService.getMovies()
      ]);

      const userMoviesList = listData.map(item => {
        const m = movies.find(movie => movie.movieId === item.movieId);
        return m ? m : null;
      }).filter((m): m is Movie => m !== null);
      setMyList(userMoviesList);

      const userHistoryList = historyData.map(item => {
        const m = movies.find(movie => movie.movieId === item.movieId);
        if (m) {
          return {
            ...m,
            currentTime: item.currentTime,
            duration: item.duration || 60
          };
        }
        return null;
      }).filter((m): m is (Movie & { currentTime: number; duration: number }) => m !== null);
      setWatchHistory(userHistoryList);
    } catch (err) {
      console.error('Error loading list and history for profile:', err);
    }
  }, [user?.sub, activeProfile?.profileId]);

  useEffect(() => {
    fetchMyListAndHistory();
  }, [fetchMyListAndHistory]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await movieService.searchMovies(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Error en búsqueda:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isInMyList = (movieId: string) => {
    return myList.some(m => m.movieId === movieId);
  };

  const handleToggleMyList = async (movie: Movie) => {
    if (!user?.sub || !activeProfile?.profileId) return;
    const movieId = movie.movieId;
    const currentlyInList = isInMyList(movieId);

    if (currentlyInList) {
      setMyList(prev => prev.filter(m => m.movieId !== movieId));
    } else {
      setMyList(prev => [...prev, movie]);
    }

    try {
      if (currentlyInList) {
        await userListService.removeFromList(user.sub, activeProfile.profileId, movieId);
      } else {
        await userListService.addToList(user.sub, activeProfile.profileId, movieId);
      }
    } catch (err) {
      console.error('Error modifying list:', err);
      if (currentlyInList) {
        setMyList(prev => [...prev, movie]);
      } else {
        setMyList(prev => prev.filter(m => m.movieId !== movieId));
      }
    }
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleSwitchProfile = () => {
    clearActiveProfile();
    navigate('/profiles');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const goHome = () => {
    handleClearSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const heroMovie = allMovies.find(m => m.poster != null) || allMovies[0];

  const scroll = (target: HTMLDivElement | null | React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    const el = target && 'current' in target ? target.current : target;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  const scrollToRecommendations = () => {
    document.getElementById('recomendaciones')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', border: '3px solid rgba(229, 9, 20, 0.2)',
            borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <span style={{ color: '#a1a1aa', fontSize: '14px' }}>Cargando películas...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', paddingBottom: '60px' }}>
      <nav
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '15px 4%',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <span
            onClick={goHome}
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#e50914',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            Netflix
          </span>
          <span
            onClick={goHome}
            style={{ fontSize: '15px', color: '#f5f5f7', fontWeight: 500, cursor: 'pointer' }}
          >
            Inicio
          </span>
          <span
            onClick={scrollToRecommendations}
            style={{ fontSize: '15px', color: '#a1a1aa', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f5f5f7'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
          >
            Recomendadas
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1', maxWidth: '400px', margin: '0 24px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '6px',
            padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)',
            transition: 'border-color 0.2s'
          }}>
            <Search size={16} color="#a1a1aa" />
            <input
              type="text"
              placeholder="Buscar películas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: '#f5f5f7', fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
            {searchQuery && (
              <X
                size={14}
                color="#a1a1aa"
                style={{ cursor: 'pointer' }}
                onClick={handleClearSearch}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {activeProfile && (
            <div
              onClick={handleSwitchProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            >
              <img
                src={activeProfile.avatarUrl}
                alt={activeProfile.name}
                style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>{activeProfile.name}</span>
            </div>
          )}

          <button
            onClick={handleSwitchProfile}
            title="Cambiar Perfil"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <User size={20} />
          </button>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {searchQuery.trim() ? (
        <div style={{ padding: '30px 4% 0 4%', animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={22} color="#a1a1aa" />
            Resultados para "{searchQuery.trim()}"
          </h2>

          {isSearching && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{
                width: '36px', height: '36px', border: '3px solid rgba(229, 9, 20, 0.2)',
                borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
            </div>
          )}

          {!isSearching && searchResults.length === 0 && (
            <p style={{ color: '#a1a1aa', fontSize: '15px', padding: '40px 0', textAlign: 'center' }}>
              No se encontraron películas para "{searchQuery.trim()}"
            </p>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {searchResults.map(movie => (
                <div
                  key={movie.movieId}
                  onClick={() => setSelectedMovie(movie)}
                  className="glass-panel"
                  style={{
                    borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <div style={{ height: '280px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={movie.poster || DEFAULT_POSTER}
                      alt={movie.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                    />
                  </div>
                  <div style={{ padding: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h3>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#a1a1aa', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f5f5f7' }}>
                        <Star size={10} fill="#e50914" color="#e50914" />
                        {movie.rating}
                      </span>
                      <span>{movie.duration}</span>
                      <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                        {movie.genre}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {heroMovie && (
            <div
              style={{
                height: '60vh',
                backgroundImage: `linear-gradient(to top, #0a0a0c 0%, rgba(10, 10, 12, 0.4) 100%), url(${heroMovie.poster})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '0 4% 40px 4%',
              }}
            >
              <h1 style={{ fontSize: '56px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>
                {heroMovie.title}
              </h1>
              <p style={{ fontSize: '16px', color: '#d4d4d8', maxWidth: '600px', marginBottom: '24px', lineHeight: '1.6' }}>
                {heroMovie.description}
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={() => {
                    setInitialPlayTime(undefined);
                    setPlayingMovie(heroMovie);
                  }}
                  style={{
                    backgroundColor: '#e50914',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(229, 9, 20, 0.3)'
                  }}
                >
                  <Play size={18} fill="#fff" /> Ver Ahora
                </button>
              </div>
            </div>
          )}

          {/* Continuar Viendo */}
          {watchHistory.length > 0 && (
            <div style={{ padding: '40px 4% 0 4%' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} color="#e50914" />
                <span style={{ 
                  background: 'linear-gradient(to right, #ffffff, #a1a1aa)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent' 
                }}>
                  Continuar Viendo
                </span>
              </h2>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => scroll(watchHistoryCarouselRef.current, 'left')}
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to right, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronLeft size={32} />
                </button>

                <div
                  ref={watchHistoryCarouselRef}
                  style={{
                    display: 'flex', gap: '16px', overflowX: 'auto',
                    scrollBehavior: 'smooth', paddingBottom: '8px',
                    scrollbarWidth: 'none', msOverflowStyle: 'none'
                  }}
                >
                  {watchHistory.map(movie => {
                    const progress = (movie.currentTime / movie.duration) * 100;
                    return (
                      <div
                        key={movie.movieId}
                        onClick={() => {
                          setInitialPlayTime(movie.currentTime);
                          setPlayingMovie(movie);
                        }}
                        className="glass-panel"
                        style={{
                          flex: '0 0 200px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                      >
                        <div style={{ height: '280px', overflow: 'hidden', position: 'relative' }}>
                          <img
                            src={movie.poster || DEFAULT_POSTER}
                            alt={movie.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '100%',
                            height: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)'
                          }}>
                            <div style={{
                              width: `${Math.min(progress, 100)}%`,
                              height: '100%',
                              backgroundColor: '#e50914'
                            }} />
                          </div>
                        </div>
                        <div style={{ padding: '12px' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h3>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#a1a1aa', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f5f5f7' }}>
                              <Play size={10} fill="#a1a1aa" color="#a1a1aa" />
                              {Math.round(movie.currentTime)}s / {Math.round(movie.duration)}s
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => scroll(watchHistoryCarouselRef.current, 'right')}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to left, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronRight size={32} />
                </button>
              </div>
            </div>
          )}

          {/* Mi Lista */}
          <div style={{ padding: '40px 4% 0 4%' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Film size={22} color="#e50914" />
              <span style={{ 
                background: 'linear-gradient(to right, #ffffff, #a1a1aa)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                Mi Lista
              </span>
            </h2>

            {myList.length === 0 ? (
              <p style={{ color: '#a1a1aa', fontSize: '15px', padding: '10px 0' }}>
                Tu lista está vacía. Agrega películas desde el catálogo.
              </p>
            ) : (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => scroll(myListCarouselRef.current, 'left')}
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to right, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronLeft size={32} />
                </button>

                <div
                  ref={myListCarouselRef}
                  style={{
                    display: 'flex', gap: '16px', overflowX: 'auto',
                    scrollBehavior: 'smooth', paddingBottom: '8px',
                    scrollbarWidth: 'none', msOverflowStyle: 'none'
                  }}
                >
                  {myList.map(movie => (
                    <div
                      key={movie.movieId}
                      onClick={() => setSelectedMovie(movie)}
                      className="glass-panel"
                      style={{
                        flex: '0 0 200px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <div style={{ height: '280px', overflow: 'hidden', position: 'relative' }}>
                        <img
                          src={movie.poster || DEFAULT_POSTER}
                          alt={movie.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                        />
                      </div>
                      <div style={{ padding: '12px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h3>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#a1a1aa', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f5f5f7' }}>
                            <Star size={10} fill="#e50914" color="#e50914" />
                            {movie.rating}
                          </span>
                          <span>{movie.duration}</span>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                            {movie.genre}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => scroll(myListCarouselRef.current, 'right')}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to left, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronRight size={32} />
                </button>
              </div>
            )}
          </div>

          {/* Catálogo Completo */}
          <div style={{ padding: '40px 4% 0 4%' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Film size={22} color="#e50914" />
              <span style={{ 
                background: 'linear-gradient(to right, #ffffff, #a1a1aa)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                Catálogo Completo
              </span>
            </h2>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => scroll(catalogCarouselRef.current, 'left')}
                style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10,
                  background: 'linear-gradient(to right, rgba(10,10,12,0.8) 0%, transparent 100%)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  opacity: 0, transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                <ChevronLeft size={32} />
              </button>

              <div
                ref={catalogCarouselRef}
                style={{
                  display: 'flex', gap: '16px', overflowX: 'auto',
                  scrollBehavior: 'smooth', paddingBottom: '8px',
                  scrollbarWidth: 'none', msOverflowStyle: 'none'
                }}
              >
                {allMovies.map(movie => (
                  <div
                    key={movie.movieId}
                    onClick={() => setSelectedMovie(movie)}
                    className="glass-panel"
                    style={{
                      flex: '0 0 200px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <div style={{ height: '280px', overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={movie.poster || DEFAULT_POSTER}
                        alt={movie.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                      />
                    </div>
                    <div style={{ padding: '12px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h3>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#a1a1aa', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f5f5f7' }}>
                          <Star size={10} fill="#e50914" color="#e50914" />
                          {movie.rating}
                        </span>
                        <span>{movie.duration}</span>
                        <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                          {movie.genre}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => scroll(catalogCarouselRef.current, 'right')}
                style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 10,
                  background: 'linear-gradient(to left, rgba(10,10,12,0.8) 0%, transparent 100%)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  opacity: 0, transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                <ChevronRight size={32} />
              </button>
            </div>
          </div>

          {!recommendationsLoading && recommendations.length > 0 && (
            <div id="recomendaciones" style={{ padding: '40px 4% 0 4%' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#e50914" />
                <span style={{ 
                  background: 'linear-gradient(to right, #ffffff, #a1a1aa)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent' 
                }}>
                  Recomendadas para {activeProfile?.name || 'ti'}
                </span>
              </h2>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => scroll(recommendationsCarouselRef.current, 'left')}
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to right, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronLeft size={32} />
                </button>

                <div
                  ref={recommendationsCarouselRef}
                  style={{
                    display: 'flex', gap: '16px', overflowX: 'auto',
                    scrollBehavior: 'smooth', paddingBottom: '8px',
                    scrollbarWidth: 'none', msOverflowStyle: 'none'
                  }}
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const leftBtn = container.previousElementSibling as HTMLElement;
                    const rightBtn = container.nextElementSibling as HTMLElement;
                    if (leftBtn) leftBtn.style.opacity = container.scrollLeft > 10 ? '1' : '0';
                    if (rightBtn) {
                      rightBtn.style.opacity =
                        container.scrollLeft + container.clientWidth < container.scrollWidth - 10 ? '1' : '0';
                    }
                  }}
                >
                  {recommendations.map(movie => (
                    <div
                      key={movie.movieId}
                      onClick={() => setSelectedMovie(movie)}
                      className="glass-panel"
                      style={{
                        flex: '0 0 200px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <div style={{ height: '280px', overflow: 'hidden', position: 'relative' }}>
                        <img
                           src={movie.poster || DEFAULT_POSTER}
                           alt={movie.title}
                           style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                           onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                        />
                      </div>
                      <div style={{ padding: '12px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h3>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#a1a1aa', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f5f5f7' }}>
                            <Star size={10} fill="#e50914" color="#e50914" />
                            {movie.rating}
                          </span>
                          <span>{movie.duration}</span>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                            {movie.genre}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => scroll(recommendationsCarouselRef.current, 'right')}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to left, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronRight size={32} />
                </button>
              </div>
            </div>
          )}

          {recommendationsLoading && (
            <div style={{ padding: '40px 4% 0 4%' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#e50914" style={{ opacity: 0.5 }} />
                <div className="animate-pulse" style={{ width: '250px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }} />
              </h2>
              <div style={{ display: 'flex', gap: '16px', overflow: 'hidden' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse"
                    style={{
                      flex: '0 0 200px',
                      height: '344px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ height: '280px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }} />
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', width: '80%' }} />
                      <div style={{ height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allMovies.length > 0 && (
            <div style={{ padding: '40px 4% 0 4%' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Film size={22} className="text-secondary" />
                Top Películas
              </h2>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => scroll(topCarouselRef.current, 'left')}
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to right, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronLeft size={32} />
                </button>

                <div
                  ref={topCarouselRef}
                  style={{
                    display: 'flex', gap: '16px', overflowX: 'auto',
                    scrollBehavior: 'smooth', paddingBottom: '8px',
                    scrollbarWidth: 'none', msOverflowStyle: 'none'
                  }}
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const leftBtn = container.previousElementSibling as HTMLElement;
                    const rightBtn = container.nextElementSibling as HTMLElement;
                    if (leftBtn) leftBtn.style.opacity = container.scrollLeft > 10 ? '1' : '0';
                    if (rightBtn) {
                      rightBtn.style.opacity =
                        container.scrollLeft + container.clientWidth < container.scrollWidth - 10 ? '1' : '0';
                    }
                  }}
                >
                  {allMovies.map((movie, index) => (
                    <div
                      key={movie.movieId}
                      onClick={() => setSelectedMovie(movie)}
                      className="glass-panel"
                      style={{
                        flex: '0 0 200px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <div style={{ height: '280px', overflow: 'hidden', position: 'relative' }}>
                        <span style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          zIndex: 2,
                          fontSize: '48px',
                          fontWeight: 900,
                          color: '#e50914',
                          textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 8px rgba(0,0,0,0.8)',
                          lineHeight: 1,
                          fontStyle: 'italic',
                        }}>
                          {index + 1}
                        </span>
                        <img
                          src={movie.poster || DEFAULT_POSTER}
                          alt={movie.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                        />
                      </div>
                      <div style={{ padding: '12px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h3>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#a1a1aa', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f5f5f7' }}>
                            <Star size={10} fill="#e50914" color="#e50914" />
                            {movie.rating}
                          </span>
                          <span>{movie.duration}</span>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                            {movie.genre}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => scroll(topCarouselRef.current, 'right')}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to left, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronRight size={32} />
                </button>
              </div>
            </div>
          )}

          {genreRowsLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{
                width: '36px', height: '36px', border: '3px solid rgba(229, 9, 20, 0.2)',
                borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
            </div>
          )}

          {genreRows.map(genre => (
            <div key={genre.genreId} style={{ padding: '40px 4% 0 4%' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Film size={22} className="text-secondary" />
                {genre.name}
              </h2>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    const el = genreCarouselRefs.current[genre.genreId];
                    if (el) scroll(el, 'left');
                  }}
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to right, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronLeft size={32} />
                </button>

                <div
                  ref={el => { genreCarouselRefs.current[genre.genreId] = el; }}
                  style={{
                    display: 'flex', gap: '16px', overflowX: 'auto',
                    scrollBehavior: 'smooth', paddingBottom: '8px',
                    scrollbarWidth: 'none', msOverflowStyle: 'none'
                  }}
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const leftBtn = container.previousElementSibling as HTMLElement;
                    const rightBtn = container.nextElementSibling as HTMLElement;
                    if (leftBtn) leftBtn.style.opacity = container.scrollLeft > 10 ? '1' : '0';
                    if (rightBtn) {
                      rightBtn.style.opacity =
                        container.scrollLeft + container.clientWidth < container.scrollWidth - 10 ? '1' : '0';
                    }
                  }}
                >
                  {genre.movies.map(movie => (
                    <div
                      key={movie.movieId}
                      onClick={() => setSelectedMovie(movie)}
                      className="glass-panel"
                      style={{
                        flex: '0 0 200px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <div style={{ height: '280px', overflow: 'hidden', position: 'relative' }}>
                        <img
                          src={movie.poster || DEFAULT_POSTER}
                          alt={movie.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                        />
                      </div>
                      <div style={{ padding: '12px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h3>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#a1a1aa', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f5f5f7' }}>
                            <Star size={10} fill="#e50914" color="#e50914" />
                            {movie.rating}
                          </span>
                          <span>{movie.duration}</span>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                            {movie.genre}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const el = genreCarouselRefs.current[genre.genreId];
                    if (el) scroll(el, 'right');
                  }}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 10,
                    background: 'linear-gradient(to left, rgba(10,10,12,0.8) 0%, transparent 100%)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    opacity: 0, transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (e.currentTarget.parentElement) e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <ChevronRight size={32} />
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {playingMovie && user && activeProfile && (
        <VideoPlayer
          movie={playingMovie}
          userId={user.sub}
          profileId={activeProfile.profileId}
          initialTime={initialPlayTime}
          onClose={async () => {
            setPlayingMovie(null);
            setInitialPlayTime(undefined);
            await fetchMyListAndHistory();
          }}
        />
      )}

      {selectedMovie && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '40px 20px'
        }}>
          <div
            className="glass-panel animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '800px',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#0f0f12'
            }}
          >
            <div style={{ height: '350px', position: 'relative' }}>
              <img
                src={selectedMovie.poster || DEFAULT_POSTER}
                alt={selectedMovie.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(to top, #0f0f12 0%, rgba(15, 15, 18, 0) 100%)'
              }} />
              <button
                onClick={() => setSelectedMovie(null)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '30px 40px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>{selectedMovie.title}</h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#a1a1aa', marginBottom: '20px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontWeight: 600 }}>
                  <Star size={14} fill="#e50914" color="#e50914" />
                  {realMovieData && realMovieData.rating !== undefined 
                    ? `${realMovieData.rating} (${realMovieData.ratingCount || 0} votos)` 
                    : selectedMovie.rating}
                </span>
                <span>{selectedMovie.duration}</span>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                  {selectedMovie.genre}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '25px' }}>
                <button
                  onClick={() => {
                    setPlayingMovie(selectedMovie);
                    setSelectedMovie(null);
                  }}
                  style={{
                    backgroundColor: '#e50914',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(229, 9, 20, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Play size={16} fill="#fff" /> Ver Ahora
                </button>
                <button
                  onClick={() => handleToggleMyList(selectedMovie)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '10px 24px',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  {isInMyList(selectedMovie.movieId) ? (
                    <>
                      <Check size={16} /> En Mi Lista
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Mi Lista
                    </>
                  )}
                </button>
              </div>

              <p style={{ color: '#d4d4d8', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
                {selectedMovie.description}
              </p>
              <ReviewsSection movieId={selectedMovie.movieId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
