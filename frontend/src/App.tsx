import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/auth';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProfileSelection } from './pages/ProfileSelection';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { setTokenGetter } from './api/client';

// Componente para decidir a dónde redirigir al usuario al ingresar
const InitialRedirect: React.FC = () => {
  const { activeProfile, isLoadingProfiles } = useProfile();

  // Esperar que los perfiles terminen de cargar antes de redirigir
  // para evitar redirigir a /profiles cuando ya existe un perfil activo cacheado
  if (isLoadingProfiles) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0c'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(229, 9, 20, 0.2)',
          borderTop: '3px solid #e50914',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!activeProfile) {
    return <Navigate to="/profiles" replace />;
  }

  return <Navigate to="/home" replace />;
};

// Configurar el interceptor de tokens dinámicamente cuando el token esté disponible en Auth0
const TokenSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      setTokenGetter(async () => {
        try {
          return await getAccessTokenSilently();
        } catch (err) {
          console.warn('Silent token retrieval failed, using null:', err);
          return null;
        }
      });
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0c'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(229, 9, 20, 0.2)',
          borderTop: '4px solid #e50914',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0c',
        gap: '20px',
        color: '#f87171'
      }}>
        <h2>Error de Autenticación</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <TokenSync>
      <ProfileProvider>
        <Router>
          <Routes>
            {/* Ruta raíz redirige a perfiles o catálogo dependiente del estado */}
            <Route path="/" element={
              <ProtectedRoute>
                <InitialRedirect />
              </ProtectedRoute>
            } />

            {/* Selección de perfiles */}
            <Route path="/profiles" element={
              <ProtectedRoute>
                <ProfileSelection />
              </ProtectedRoute>
            } />

            {/* Página Principal Catálogo */}
            <Route path="/home" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />

            {/* Panel de Administración */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ProfileProvider>
    </TokenSync>
  );
};
