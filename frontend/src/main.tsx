import React from 'react';
import ReactDOM from 'react-dom/client';
import { CustomAuthProvider } from './auth/auth';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CustomAuthProvider>
      <App />
    </CustomAuthProvider>
  </React.StrictMode>
);
