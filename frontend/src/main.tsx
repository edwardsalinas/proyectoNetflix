import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { CustomAuthProvider } from './auth/auth';
import { App } from './App';
import './index.css';

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN || 'netflix-clone-dev.auth0.com';
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID || 'mock_client_id_12345';
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.netflix-clone.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: auth0Audience,
        scope: 'openid profile email catalog:read catalog:write mylist:read mylist:write history:read history:write'
      }}
      cacheLocation="localstorage"
    >
      <CustomAuthProvider>
        <App />
      </CustomAuthProvider>
    </Auth0Provider>
  </React.StrictMode>
);
