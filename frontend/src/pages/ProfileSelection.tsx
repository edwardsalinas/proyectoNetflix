import React, { useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X } from 'lucide-react';
import { DEFAULT_AVATARS } from '../api/client';
import type { Profile } from '../api/client';

export const ProfileSelection: React.FC = () => {
  const { profiles, selectProfile, createProfile, deleteProfile, isLoadingProfiles, profilesError } = useProfile();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const navigate = useNavigate();

  const handleSelect = (profile: Profile) => {
    if (isEditMode) return;
    selectProfile(profile);
    navigate('/home');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newName.trim()) return;

    try {
      await createProfile(newName.trim(), selectedAvatar);
      setNewName('');
      setShowAddModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el perfil.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    setDeleteError('');
    if (window.confirm('¿Estás seguro de que quieres eliminar este perfil?')) {
      try {
        await deleteProfile(profileId);
      } catch (err: unknown) {
        setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el perfil.');
      }
    }
  };

  // Spinner de carga inicial
  if (isLoadingProfiles) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#0a0a0c',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(229, 9, 20, 0.2)',
          borderTop: '4px solid #e50914',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#a1a1aa', fontSize: '16px' }}>Cargando perfiles...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0a0c',
      padding: '20px'
    }} className="animate-fade-in">
      <h1 style={{
        fontSize: '48px',
        fontWeight: 600,
        marginBottom: '40px',
        letterSpacing: '1px',
        textAlign: 'center',
        background: 'linear-gradient(to right, #f5f5f7, #a1a1aa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>¿Quién está viendo ahora?</h1>

      {/* Error al cargar perfiles desde API */}
      {profilesError && (
        <div style={{
          backgroundColor: 'rgba(229, 9, 20, 0.1)',
          border: '1px solid #e50914',
          color: '#f87171',
          padding: '12px 20px',
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '14px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>{profilesError}</div>
      )}

      {/* Error al eliminar perfil */}
      {deleteError && (
        <div style={{
          backgroundColor: 'rgba(229, 9, 20, 0.1)',
          border: '1px solid #e50914',
          color: '#f87171',
          padding: '12px 20px',
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '14px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>{deleteError}</div>
      )}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '30px',
        maxWidth: '1000px',
        marginBottom: '60px'
      }}>
        {profiles.map(p => (
          <div
            key={p.profileId}
            onClick={() => handleSelect(p)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: isEditMode ? 'default' : 'pointer',
              position: 'relative',
              width: '130px'
            }}
          >
            <div 
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '3px solid transparent',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
              className="netflix-glow"
            >
              <img 
                src={p.avatarUrl} 
                alt={p.name} 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {isEditMode && (
                <button
                  onClick={(e) => handleDelete(e, p.profileId)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: '#e50914',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <span style={{
              marginTop: '15px',
              fontSize: '18px',
              color: '#a1a1aa',
              fontWeight: 500,
              transition: 'color 0.15s ease'
            }}>{p.name}</span>
          </div>
        ))}

        {profiles.length < 5 && (
          <div
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              width: '130px'
            }}
          >
            <div 
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '8px',
                border: '2px dashed #3f3f46',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#71717a',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f5f5f7';
                e.currentTarget.style.color = '#f5f5f7';
                e.currentTarget.style.backgroundColor = '#18181b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3f3f46';
                e.currentTarget.style.color = '#71717a';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Plus size={40} />
            </div>
            <span style={{
              marginTop: '15px',
              fontSize: '18px',
              color: '#71717a'
            }}>Añadir Perfil</span>
          </div>
        )}
      </div>

      <button
        onClick={() => setIsEditMode(!isEditMode)}
        style={{
          background: 'transparent',
          border: '1px solid #52525b',
          color: '#71717a',
          padding: '10px 24px',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          letterSpacing: '1px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#f5f5f7';
          e.currentTarget.style.color = '#f5f5f7';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#52525b';
          e.currentTarget.style.color = '#71717a';
        }}
      >
        {isEditMode ? 'Listo' : 'Administrar Perfiles'}
      </button>

      {/* Modal para Crear Perfil */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div 
            className="glass-panel animate-scale-up"
            style={{
              padding: '40px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setShowAddModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 600,
              marginBottom: '10px'
            }}>Crear Perfil</h2>
            <p style={{
              color: '#71717a',
              marginBottom: '30px',
              fontSize: '15px'
            }}>Añade un perfil para otra persona que comparta tu cuenta.</p>

            <form onSubmit={handleCreate}>
              {error && (
                <div style={{
                  backgroundColor: 'rgba(229, 9, 20, 0.1)',
                  border: '1px solid #e50914',
                  color: '#f87171',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>{error}</div>
              )}

              <div style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'center',
                marginBottom: '30px'
              }}>
                <img 
                  src={selectedAvatar} 
                  alt="Avatar seleccionado" 
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '2px solid #e50914'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    color: '#a1a1aa',
                    marginBottom: '8px'
                  }}>Nombre del Perfil</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Mi lista"
                    required
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      padding: '12px',
                      color: '#fff',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#e50914'}
                    onBlur={(e) => e.target.style.borderColor = '#3f3f46'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <span style={{
                  display: 'block',
                  fontSize: '14px',
                  color: '#a1a1aa',
                  marginBottom: '12px'
                }}>Elige un Avatar</span>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  {DEFAULT_AVATARS.map(avatar => (
                    <img
                      key={avatar}
                      src={avatar}
                      alt="Opción de Avatar"
                      onClick={() => setSelectedAvatar(avatar)}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        objectFit: 'cover',
                        border: selectedAvatar === avatar ? '3px solid #e50914' : '2px solid transparent',
                        transition: 'transform 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '16px'
              }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: '#e50914',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b9090b'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e50914'}
                >
                  Guardar Perfil
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#a1a1aa',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#a1a1aa';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#3f3f46';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
