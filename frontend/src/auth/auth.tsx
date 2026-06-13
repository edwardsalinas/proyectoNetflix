import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  sub: string;
  name: string;
  email?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | undefined;
  loginWithRedirect: (options?: any) => Promise<void>;
  logout: (options?: any) => void;
  getAccessTokenSilently: (options?: any) => Promise<string>;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para generar PKCE verifier y challenge
const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return hash;
};

const base64urlencode = (a: ArrayBuffer) => {
  let str = "";
  const bytes = new Uint8Array(a);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const generateChallenge = async (verifier: string) => {
  const hashed = await sha256(verifier);
  return base64urlencode(hashed);
};

const base64UrlEncodeJson = (value: unknown) => {
  const json = JSON.stringify(value);
  const base64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64;
};

const createMockJwt = () => {
  const header = { alg: 'none', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = {
    sub: 'cognito|mockuser12345',
    email: 'invitado@netflix-clone.com',
    username: 'mockuser12345',
    scope: 'openid profile email catalog:read catalog:write mylist:read mylist:write history:read history:write',
    roles: ['super_admin'],
    exp,
    iat: Math.floor(Date.now() / 1000),
  };

  return `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(payload)}.`;
};

// Configuración de Cognito
const getCognitoConfig = () => {
  return {
    domain: import.meta.env.VITE_COGNITO_DOMAIN || '', // ej: netflix-clone.auth.us-east-1.amazoncognito.com
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    redirectUri: window.location.origin,
    region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
    scopes: import.meta.env.VITE_COGNITO_SCOPES || 'openid profile email',
  };
};

const isMockMode = () => {
  const config = getCognitoConfig();
  return !config.domain || config.domain === 'your-cognito-domain.auth.us-east-1.amazoncognito.com';
};

export const CustomAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMock = isMockMode();

  if (isMock) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }

  return <CognitoAuthProvider>{children}</CognitoAuthProvider>;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVEEDOR REAL DE COGNITO VIA NATIVE OIDC/PKCE
// ─────────────────────────────────────────────────────────────────────────────
const CognitoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const config = getCognitoConfig();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Parsear el JWT payload sin validar (seguro en el cliente para pintar la UI)
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const exchangeStarted = React.useRef(false);

  useEffect(() => {
    const handleAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const cachedToken = localStorage.getItem('netflix_cognito_access_token');
      const idToken = localStorage.getItem('netflix_cognito_id_token');

      if (code) {
        if (exchangeStarted.current) return;
        exchangeStarted.current = true;

        // Intercambiar código por tokens (PKCE)
        setIsLoading(true);
        const codeVerifier = localStorage.getItem('netflix_pkce_verifier') || '';
        try {
          const response = await fetch(`https://${config.domain}/oauth2/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: config.clientId,
              code: code,
              redirect_uri: config.redirectUri,
              code_verifier: codeVerifier,
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error('Cognito token exchange failed:', response.status, errorData);
            throw new Error(`Error al intercambiar el código de autorización por tokens: ${response.status} - ${errorData}`);
          }

          const data = await response.json();
          localStorage.setItem('netflix_cognito_access_token', data.access_token);
          localStorage.setItem('netflix_cognito_id_token', data.id_token);
          
          const payload = parseJwt(data.id_token);
          if (payload) {
            setUser({ sub: payload.sub, name: payload.email || payload['cognito:username'] || 'Usuario' });
            setIsAuthenticated(true);
          }
          
          // Limpiar parámetros URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err: any) {
          console.error(err);
          setError(err);
        } finally {
          setIsLoading(false);
        }
      } else if (cachedToken && idToken) {
        // Cargar tokens existentes
        const payload = parseJwt(idToken);
        if (payload) {
          // Validar expiración básica
          const exp = payload.exp * 1000;
          if (Date.now() < exp) {
            setUser({ sub: payload.sub, name: payload.email || payload['cognito:username'] || 'Usuario' });
            setIsAuthenticated(true);
          } else {
            // Token expirado
            logout();
          }
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };

    handleAuth();
  }, []);

  const loginWithRedirect = async (options?: any) => {
    setIsLoading(true);
    const verifier = generateRandomString(48);
    localStorage.setItem('netflix_pkce_verifier', verifier);
    const challenge = await generateChallenge(verifier);

    if (options?.appState?.returnTo) {
      localStorage.setItem('netflix_redirect_return_to', options.appState.returnTo);
    }

    const authUrl = `https://${config.domain}/login?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${encodeURIComponent(config.scopes)}&code_challenge=${challenge}&code_challenge_method=S256`;
    window.location.href = authUrl;
  };

  const logout = () => {
    localStorage.removeItem('netflix_cognito_access_token');
    localStorage.removeItem('netflix_cognito_id_token');
    localStorage.removeItem('netflix_pkce_verifier');
    setIsAuthenticated(false);
    setUser(undefined);

    // Redirección de salida de Cognito
    const logoutUrl = `https://${config.domain}/logout?client_id=${config.clientId}&logout_uri=${encodeURIComponent(config.redirectUri)}`;
    window.location.href = logoutUrl;
  };

  const getAccessTokenSilently = async () => {
    const token = localStorage.getItem('netflix_cognito_id_token');
    if (!token) throw new Error('No se encontró token activo');
    return token;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      loginWithRedirect,
      logout,
      getAccessTokenSilently,
      error,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVEEDOR DE PRUEBA (MOCK)
// ─────────────────────────────────────────────────────────────────────────────
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('netflix_mock_authenticated') === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const loginWithRedirect = async (options?: any) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      localStorage.setItem('netflix_mock_authenticated', 'true');
      setIsLoading(false);
      if (options?.appState?.returnTo) {
        window.history.replaceState({}, '', options.appState.returnTo);
      } else {
        window.history.replaceState({}, '', '/profiles');
      }
      window.location.reload();
    }, 300);
  };

  const logout = (options?: any) => {
    setIsAuthenticated(false);
    localStorage.removeItem('netflix_mock_authenticated');
    window.location.href = options?.logoutParams?.returnTo || window.location.origin;
  };

  const getAccessTokenSilently = async () => {
    return createMockJwt();
  };

  const mockUser: AuthUser = {
    sub: 'cognito|mockuser12345',
    name: 'Invitado Cognito',
    email: 'invitado@netflix-clone.com'
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user: isAuthenticated ? mockUser : undefined,
      loginWithRedirect,
      logout,
      getAccessTokenSilently,
      error: null,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de CustomAuthProvider');
  }
  return context;
};
