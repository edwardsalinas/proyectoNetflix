import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/auth';
import { useProfile } from '../context/ProfileContext';
import { reviewService } from '../api/client';
import type { Review } from '../api/client';
import { Star, MessageSquare, AlertCircle, Trash2 } from 'lucide-react';

interface ReviewsSectionProps {
  movieId: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ movieId }) => {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number>(10);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const userId = user?.sub || 'anonymous_user';
  const profileId = activeProfile?.profileId || 'p1';
  const profileName = activeProfile?.name || 'Usuario';

  const loadReviews = useCallback(async () => {
    try {
      const items = await reviewService.getReviews(movieId);
      setReviews(items);
    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  }, [movieId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!comment.trim()) {
      setError('El comentario no puede estar vacío.');
      return;
    }

    setIsLoading(true);
    try {
      await reviewService.createReview(
        movieId, 
        userId, 
        profileId, 
        profileName, 
        rating, 
        comment.trim()
      );
      setComment('');
      setRating(10);
      await loadReviews();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar la reseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('¿Eliminar esta reseña?')) return;
    setIsDeleting(reviewId);
    try {
      await reviewService.deleteReview(movieId, reviewId);
      setReviews(prev => prev.filter(r => r.reviewId !== reviewId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la reseña.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div style={{
      marginTop: '40px',
      borderTop: '1px solid #27272a',
      paddingTop: '30px'
    }}>
      <h3 style={{
        fontSize: '22px',
        fontWeight: 600,
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <MessageSquare size={20} className="text-secondary" />
        Calificaciones y Reseñas
      </h3>

      {/* Formulario para escribir reseña */}
      <form 
        onSubmit={handleSubmit}
        className="glass-panel"
        style={{
          padding: '24px',
          borderRadius: '10px',
          marginBottom: '30px'
        }}
      >
        <h4 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '15px', color: '#f5f5f7' }}>
          Escribe tu opinión como <span style={{ color: '#e50914' }}>{profileName}</span>
        </h4>

        {error && (
          <div style={{
            backgroundColor: 'rgba(229, 9, 20, 0.1)',
            border: '1px solid #e50914',
            color: '#f87171',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Selector de calificación (0-10) */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ display: 'block', fontSize: '14px', color: '#a1a1aa', marginBottom: '8px' }}>
            Tu Calificación: <strong style={{ color: '#e50914', fontSize: '16px' }}>{rating} / 10</strong>
          </span>
          <div style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starValue) => (
              <button
                key={starValue}
                type="button"
                onClick={() => setRating(starValue)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Star 
                  size={24} 
                  fill={starValue <= rating ? '#e50914' : 'transparent'} 
                  color={starValue <= rating ? '#e50914' : '#52525b'} 
                  strokeWidth={2}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comentario */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#a1a1aa', marginBottom: '8px' }}>
            Comentario
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Qué te pareció la película?"
            rows={4}
            required
            style={{
              width: '100%',
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '6px',
              padding: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              resize: 'vertical'
            }}
            onFocus={(e) => e.target.style.borderColor = '#e50914'}
            onBlur={(e) => e.target.style.borderColor = '#3f3f46'}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: '#e50914',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = '#b9090b';
          }}
          onMouseLeave={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = '#e50914';
          }}
        >
          {isLoading ? 'Enviando...' : 'Publicar Reseña'}
        </button>
      </form>

      {/* Listado de reseñas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reviews.length === 0 ? (
          <p style={{ color: '#71717a', fontStyle: 'italic' }}>Aún no hay reseñas para esta película. Sé el primero en calificarla.</p>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.reviewId}
              style={{
                background: '#111115',
                border: '1px solid #1f1f23',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontWeight: 600,
                    fontSize: '15px',
                    color: '#f5f5f7'
                  }}>{rev.profileName || rev.userId}</span>
                  <span style={{
                    fontSize: '12px',
                    color: '#71717a'
                  }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'rgba(229, 9, 20, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid rgba(229, 9, 20, 0.2)'
                  }}>
                    <Star size={14} fill="#e50914" color="#e50914" />
                    <span style={{
                      color: '#f5f5f7',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>{rev.rating}/10</span>
                  </div>
                  {/* Botón eliminar: solo visible para el autor */}
                  {rev.userId === userId && (
                    <button
                      onClick={() => handleDelete(rev.reviewId)}
                      disabled={isDeleting === rev.reviewId}
                      title="Eliminar reseña"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isDeleting === rev.reviewId ? '#52525b' : '#71717a',
                        cursor: isDeleting === rev.reviewId ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { if (isDeleting !== rev.reviewId) e.currentTarget.style.color = '#e50914'; }}
                      onMouseLeave={(e) => { if (isDeleting !== rev.reviewId) e.currentTarget.style.color = '#71717a'; }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              <p style={{
                color: '#d4d4d8',
                fontSize: '15px',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>{rev.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
