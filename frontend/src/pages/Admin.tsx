import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';
import { adminService } from '../api/client';
import type { CreateMovieInput, Movie } from '../api/client';
import { LogOut, Settings, Plus, Edit2, Trash2, X, AlertCircle, CheckCircle, Clock, Copy } from 'lucide-react';

// Extend Movie with admin fields
interface AdminMovie extends Movie {
  director?: string;
  releaseYear?: number;
  durationMinutes?: number;
  genreId?: string;
  videoStatus?: 'pending' | 'transcoding' | 'ready';
  posterUrl?: string | null;
  synopsis?: string;
}

const DEFAULT_POSTER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">' +
  '<rect width="400" height="600" fill="#1a1a2e"/>' +
  '<rect x="120" y="160" width="160" height="280" rx="8" fill="none" stroke="#333" stroke-width="6"/>' +
  '<circle cx="200" cy="300" r="50" fill="none" stroke="#333" stroke-width="6"/>' +
  '<polygon points="200,265 200,335 245,300" fill="#333"/>' +
  '</svg>'
);

const VALID_GENRES = [
  'action', 'comedy', 'drama', 'horror', 'sci-fi', 'thriller', 'romance', 'documentary', 'animation', 'fantasy'
];

interface FormData extends CreateMovieInput {
}

interface ConfirmDialog {
  isOpen: boolean;
  movieId?: string;
  movieTitle?: string;
}

interface SuccessDialog {
  isOpen: boolean;
  movieId?: string;
}

export const Admin: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState<AdminMovie | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    synopsis: '',
    genreId: 'action',
    director: '',
    releaseYear: new Date().getFullYear(),
    durationMinutes: 120
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ isOpen: false });
  const [successDialog, setSuccessDialog] = useState<SuccessDialog>({ isOpen: false });
  const [copiedMovieId, setCopiedMovieId] = useState<string | null>(null);

  // Verificar si el usuario tiene rol de admin
  const isAdmin =
    user?.['custom:role'] === 'super_admin' ||
    user?.['custom:role'] === 'content_admin' ||
    user?.roles?.includes('super_admin') ||
    user?.roles?.includes('content_admin');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
      return;
    }
    loadMovies();
  }, [isAdmin, navigate]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllMovies();
      setMovies(data);
    } catch (err) {
      console.error('Error al cargar películas:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) errors.title = 'El título es requerido';
    if (!formData.synopsis.trim()) errors.synopsis = 'La sinopsis es requerida';
    if (!formData.director.trim()) errors.director = 'El director es requerido';
    if (!formData.genreId) errors.genreId = 'El género es requerido';
    if (!formData.releaseYear || formData.releaseYear < 1900) errors.releaseYear = 'Año inválido';
    if (!formData.durationMinutes || formData.durationMinutes < 1) errors.durationMinutes = 'Duración inválida';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (editingMovie) {
        await adminService.updateMovie(editingMovie.movieId, formData);
      } else {
        const newMovie = await adminService.createMovie(formData);
        setSuccessDialog({ isOpen: true, movieId: newMovie.movieId });
      }
      await loadMovies();
      setShowForm(false);
      setEditingMovie(null);
      setFormData({
        title: '',
        synopsis: '',
        genreId: 'action',
        director: '',
        releaseYear: new Date().getFullYear(),
        durationMinutes: 120
      });
    } catch (err: any) {
      console.error('Error al guardar película:', err);
      setFormErrors({ submit: err.message || 'Error al guardar' });
    }
  };

  const handleEdit = (movie: AdminMovie) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      synopsis: movie.synopsis || movie.description,
      genreId: movie.genreId || 'action',
      director: movie.director || '',
      releaseYear: movie.releaseYear || new Date().getFullYear(),
      durationMinutes: movie.durationMinutes || 120
    });
    setShowForm(true);
    setFormErrors({});
  };

  const handleDeleteClick = (movie: AdminMovie) => {
    setConfirmDialog({
      isOpen: true,
      movieId: movie.movieId,
      movieTitle: movie.title
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDialog.movieId) return;

    try {
      await adminService.deleteMovie(confirmDialog.movieId);
      await loadMovies();
      setConfirmDialog({ isOpen: false });
    } catch (err) {
      console.error('Error al eliminar película:', err);
    }
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const getVideoStatusBadge = (status?: string) => {
    const bgColor = 
      status === 'ready' ? 'rgba(34, 197, 94, 0.1)' :
      status === 'transcoding' ? 'rgba(234, 179, 8, 0.1)' :
      'rgba(107, 114, 128, 0.1)';

    const borderColor =
      status === 'ready' ? 'rgba(34, 197, 94, 0.3)' :
      status === 'transcoding' ? 'rgba(234, 179, 8, 0.3)' :
      'rgba(107, 114, 128, 0.3)';

    const textColor =
      status === 'ready' ? '#22c55e' :
      status === 'transcoding' ? '#eab308' :
      '#6b7280';

    const icon = 
      status === 'ready' ? <CheckCircle size={14} /> :
      status === 'transcoding' ? <Clock size={14} /> :
      null;

    const label = status === 'ready' ? 'Listo' : status === 'transcoding' ? 'Transcodificando' : 'Pendiente';

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        fontSize: '11px',
        color: textColor,
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}>
        {icon}
        {label}
      </div>
    );
  };

  const handleOpenNewForm = () => {
    setEditingMovie(null);
    setFormData({
      title: '',
      synopsis: '',
      genreId: 'action',
      director: '',
      releaseYear: new Date().getFullYear(),
      durationMinutes: 120
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMovie(null);
    setFormErrors({});
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMovieId(text);
    setTimeout(() => setCopiedMovieId(null), 2000);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0c', color: '#f5f5f7' }}>
      {/* HEADER / NAVBAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 4%',
        backgroundColor: 'rgba(10, 10, 12, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={24} color="#e50914" />
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Netflix Admin</h1>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{user?.email}</span>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'transparent',
              color: '#a1a1aa',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#e50914';
              e.currentTarget.style.color = '#e50914';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = '#a1a1aa';
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: '40px 4%' }}>
        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 600, margin: 0 }}>Gestión de Películas</h2>
          <button
            onClick={handleOpenNewForm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#e50914',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(229, 9, 20, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(229, 9, 20, 0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(229, 9, 20, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={18} /> Nueva Película
          </button>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{
              width: '40px', height: '40px', border: '3px solid rgba(229, 9, 20, 0.2)',
              borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        )}

        {/* TABLA DE PELÍCULAS */}
        {!loading && (
          <div style={{
            overflowX: 'auto',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            backgroundColor: 'rgba(255, 255, 255, 0.01)'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#a1a1aa' }}>Poster</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#a1a1aa' }}>Título</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#a1a1aa' }}>Género</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#a1a1aa' }}>Director</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#a1a1aa' }}>Año</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#a1a1aa' }}>Duración</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#a1a1aa' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#a1a1aa' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movies.map((movie) => (
                  <tr
                    key={movie.movieId}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <img
                        src={movie.poster || DEFAULT_POSTER}
                        alt={movie.title}
                        style={{
                          width: '40px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER; }}
                      />
                    </td>
                    <td style={{ padding: '12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {movie.title}
                    </td>
                    <td style={{ padding: '12px' }}>{movie.genreId || movie.genre}</td>
                    <td style={{ padding: '12px' }}>{movie.director || '–'}</td>
                    <td style={{ padding: '12px' }}>{movie.releaseYear || '–'}</td>
                    <td style={{ padding: '12px' }}>{movie.durationMinutes ? `${movie.durationMinutes} min` : '–'}</td>
                    <td style={{ padding: '12px' }}>
                      {getVideoStatusBadge(movie.videoStatus)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(movie)}
                          title="Editar"
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#a1a1aa',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#60a5fa';
                            e.currentTarget.style.color = '#60a5fa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.color = '#a1a1aa';
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(movie)}
                          title="Eliminar"
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#a1a1aa',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#ef4444';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.color = '#a1a1aa';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movies.length === 0 && (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#a1a1aa',
                fontSize: '14px'
              }}>
                No hay películas en el catálogo. ¡Crea la primera!
              </div>
            )}
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div
            style={{
              backgroundColor: 'rgba(20, 20, 24, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '32px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'slideUp 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
                {editingMovie ? 'Editar Película' : 'Nueva Película'}
              </h3>
              <button
                onClick={handleCloseForm}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* FORM FIELDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Título */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#a1a1aa' }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: formErrors.title ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f5f5f7',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e50914';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    if (!formErrors.title) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                />
                {formErrors.title && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{formErrors.title}</p>}
              </div>

              {/* Sinopsis */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#a1a1aa' }}>
                  Sinopsis *
                </label>
                <textarea
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: formErrors.synopsis ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f5f5f7',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e50914';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    if (!formErrors.synopsis) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                />
                {formErrors.synopsis && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{formErrors.synopsis}</p>}
              </div>

              {/* Género */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#a1a1aa' }}>
                  Género *
                </label>
                <select
                  value={formData.genreId}
                  onChange={(e) => setFormData({ ...formData, genreId: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f5f5f7',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {VALID_GENRES.map((genre) => (
                    <option key={genre} value={genre} style={{ backgroundColor: '#1a1a1a', color: '#f5f5f7' }}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Director */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#a1a1aa' }}>
                  Director *
                </label>
                <input
                  type="text"
                  value={formData.director}
                  onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: formErrors.director ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f5f5f7',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e50914';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    if (!formErrors.director) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                />
                {formErrors.director && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{formErrors.director}</p>}
              </div>

              {/* Año de Lanzamiento */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#a1a1aa' }}>
                  Año de Lanzamiento *
                </label>
                <input
                  type="number"
                  value={formData.releaseYear}
                  onChange={(e) => setFormData({ ...formData, releaseYear: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: formErrors.releaseYear ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f5f5f7',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e50914';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    if (!formErrors.releaseYear) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                />
                {formErrors.releaseYear && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{formErrors.releaseYear}</p>}
              </div>

              {/* Duración */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#a1a1aa' }}>
                  Duración (minutos) *
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: formErrors.durationMinutes ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#f5f5f7',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e50914';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    if (!formErrors.durationMinutes) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                />
                {formErrors.durationMinutes && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{formErrors.durationMinutes}</p>}
              </div>

              {formErrors.submit && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  fontSize: '12px',
                  color: '#fca5a5'
                }}>
                  <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* BUTTONS */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 1,
                    backgroundColor: '#e50914',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(229, 9, 20, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {editingMovie ? 'Guardar Cambios' : 'Crear Película'}
                </button>
                <button
                  onClick={handleCloseForm}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    color: '#a1a1aa',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#a1a1aa';
                    e.currentTarget.style.color = '#f5f5f7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {confirmDialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2100,
          padding: '20px'
        }}>
          <div
            style={{
              backgroundColor: 'rgba(20, 20, 24, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '32px',
              width: '100%',
              maxWidth: '400px',
              textAlign: 'center',
              animation: 'slideUp 0.3s ease'
            }}
          >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <AlertCircle size={48} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>¿Eliminar película?</h3>
            <p style={{ color: '#a1a1aa', marginBottom: '24px', fontSize: '14px' }}>
              Esta acción es irreversible. Se eliminará "{confirmDialog.movieTitle}".
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmDialog({ isOpen: false })}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  color: '#a1a1aa',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS DIALOG */}
      {successDialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2100,
          padding: '20px'
        }}>
          <div
            style={{
              backgroundColor: 'rgba(20, 20, 24, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '32px',
              width: '100%',
              maxWidth: '450px',
              animation: 'slideUp 0.3s ease'
            }}
          >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={48} color="#22c55e" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
              ¡Película creada exitosamente!
            </h3>
            <p style={{ color: '#a1a1aa', marginBottom: '20px', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>
              Para activar la transcodificación, sube el video con el siguiente comando:
            </p>
            <div
              className="glass-panel"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '20px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#a1a1aa',
                wordBreak: 'break-all',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <span style={{ flex: 1 }}>
                aws s3 cp tu_video.mp4 s3://&lt;RawVideosBucket&gt;/movies/{successDialog.movieId}/video.mp4
              </span>
              <button
                onClick={() => copyToClipboard(`aws s3 cp tu_video.mp4 s3://<RawVideosBucket>/movies/${successDialog.movieId}/video.mp4`)}
                title="Copiar"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e50914',
                  cursor: 'pointer',
                  padding: '0',
                  marginTop: '2px'
                }}
              >
                {copiedMovieId === `aws s3 cp tu_video.mp4 s3://<RawVideosBucket>/movies/${successDialog.movieId}/video.mp4` ? '✓' : <Copy size={14} />}
              </button>
            </div>
            <p style={{ color: '#a1a1aa', marginBottom: '24px', fontSize: '12px', textAlign: 'center' }}>
              Movie ID para referencia: <span style={{ color: '#f5f5f7', fontWeight: 600 }}>{successDialog.movieId}</span>
            </p>
            <button
              onClick={() => setSuccessDialog({ isOpen: false })}
              style={{
                width: '100%',
                backgroundColor: '#e50914',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  );
};
