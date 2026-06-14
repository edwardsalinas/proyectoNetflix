import React, { useEffect } from 'react';
import { useAuth } from '../auth/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: window.location.pathname }
      });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0c',
        gap: '20px'
      }}>
        {/* Netflix Red Spinner */}
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(229, 9, 20, 0.2)',
          borderTop: '4px solid #e50914',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{
          color: '#a1a1aa',
          fontSize: '18px',
          letterSpacing: '1px',
          fontWeight: 500
        }}>Cargando Netflix...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};
