import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { setupFetchInterceptor } from './lib/api';
import './index.css';

// Initialize global fetch interceptor with automatic 401 refresh
setupFetchInterceptor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
