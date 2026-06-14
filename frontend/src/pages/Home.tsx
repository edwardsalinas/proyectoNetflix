import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/auth';
import { useProfile } from '../context/ProfileContext';
import { ReviewsSection } from '../components/ReviewsSection';
import { movieService } from '../api/client';
import { LogOut, User, Film, Play, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Movie {
  movieId: string;
  title: string;
  description: string;
  rating: number;
  duration: string;
  genre: string;
  bannerUrl: string;
  thumbnailUrl: string;
}

const MOCK_MOVIES: Movie[] = [
  {
    movieId: 'm1',
    title: 'Stranger Things',
    description: 'Cuando un niño desaparece, sus amigos, una madre y un jefe de policía deben enfrentarse a fuerzas terroríficas para recuperarlo.',
    rating: 8.7,
    duration: '45 min',
    genre: 'Sci-Fi / Drama',
    bannerUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=1200&h=500&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=300&h=180&q=80',
  },
  {
    movieId: 'm2',
    title: 'The Witcher',
    description: 'Geralt de Rivia, un cazador de monstruos mutante, viaja hacia su destino en un mundo turbulento donde las personas a menudo demuestran ser más perversas que las bestias.',
    rating: 8.1,
    duration: '60 min',
    genre: 'Fantasía / Acción',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&h=500&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&h=180&q=80',
  },
  {
    movieId: 'm3',
    title: 'Cobra Kai',
    description: 'Treinta y cuatro años después de los eventos del torneo de karate de All Valley de 1984, Johnny Lawrence busca la redención al reabrir el infame dojo Cobra Kai.',
    rating: 8.5,
    duration: '30 min',
    genre: 'Acción / Comedia',
    bannerUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=1200&h=500&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=300&h=180&q=80',
  }
];

export const Home: React.FC = () => {
  const { logout } = useAuth();
  const { activeProfile, clearActiveProfile } = useProfile();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>(MOCK_MOVIES);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [realMovieData, setRealMovieData] = useState<any>(null);

  useEffect(() => {
    // Cargar catálogo de películas real y actualizar calificaciones en el estado
    movieService.getMovies().then(apiMovies => {
      if (apiMovies && apiMovies.length > 0) {
        setMovies(prevMovies => 
          prevMovies.map(mockMovie => {
            const match = apiMovies.find(apiM => apiM.movieId === mockMovie.movieId);
            if (match) {
              return {
                ...mockMovie,
                rating: match.rating !== undefined ? match.rating : mockMovie.rating
              };
            }
            return mockMovie;
          })
        );
      }
    });
  }, []);

  useEffect(() => {
    if (selectedMovie) {
      setRealMovieData(null);
      movieService.getMovie(selectedMovie.movieId).then(data => {
        if (data) {
          setRealMovieData(data);
          // Actualizar también la película en la lista principal por si cambió la puntuación tras una reseña
          setMovies(prevMovies =>
            prevMovies.map(m => m.movieId === selectedMovie.movieId ? { ...m, rating: data.rating } : m)
          );
        }
      });
    }
  }, [selectedMovie]);

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleSwitchProfile = () => {
    clearActiveProfile();
    navigate('/profiles');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', paddingBottom: '60px' }}>
      {/* Barra de Navegación */}
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
          <span style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#e50914',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>Netflix</span>
          <span style={{ fontSize: '15px', color: '#f5f5f7', fontWeight: 500, cursor: 'pointer' }}>Inicio</span>
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

      {/* Hero Banner */}
      <div 
        style={{
          height: '60vh',
          backgroundImage: movies.length > 0 ? `linear-gradient(to top, #0a0a0c 0%, rgba(10, 10, 12, 0.4) 100%), url(${movies[0].bannerUrl})` : '',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 4% 40px 4%',
        }}
      >
        <h1 style={{ fontSize: '56px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>
          {movies.length > 0 ? movies[0].title : ''}
        </h1>
        <p style={{ fontSize: '16px', color: '#d4d4d8', maxWidth: '600px', marginBottom: '24px', lineHeight: '1.6' }}>
          {movies.length > 0 ? movies[0].description : ''}
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={() => movies.length > 0 && setSelectedMovie(movies[0])}
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

      {/* Catálogo de películas */}
      <div style={{ padding: '40px 4% 0 4%' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Film size={22} className="text-secondary" />
          Mi Lista de Contenido
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {movies.map(movie => (
            <div
              key={movie.movieId}
              onClick={() => setSelectedMovie(movie)}
              className="glass-panel"
              style={{
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
              <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                <img 
                  src={movie.thumbnailUrl} 
                  alt={movie.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{movie.title}</h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#a1a1aa', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f5f5f7' }}>
                    <Star size={12} fill="#e50914" color="#e50914" />
                    {movie.rating}
                  </span>
                  <span>{movie.duration}</span>
                  <span style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                    {movie.genre}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalle de Película */}
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
            {/* Cabecera del Modal con imagen */}
            <div style={{ height: '350px', position: 'relative' }}>
              <img 
                src={selectedMovie.bannerUrl} 
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

            {/* Contenido de Detalles */}
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
              <p style={{ color: '#d4d4d8', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
                {selectedMovie.description}
              </p>

              {/* Sección de Reseñas */}
              <ReviewsSection movieId={selectedMovie.movieId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
