import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { initPwa } from './pwa';
import './design/base.css';

// The GitHub-hosted mirror (built with VITE_HASH=1) lives under a sub-path, so it routes by hash.
const Router = import.meta.env.VITE_HASH ? HashRouter : BrowserRouter;

if (!import.meta.env.VITE_HASH) initPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
