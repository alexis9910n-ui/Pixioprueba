import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

const EXPECTED_REF = 'fwuspqguicemkbudweep';

function purgeStaleAuth() {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('sb-') && !key.includes(EXPECTED_REF)) {
        localStorage.removeItem(key);
      }
    }
    const sessionKeys = Object.keys(sessionStorage);
    for (const key of sessionKeys) {
      if (key.startsWith('sb-')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // storage access may be blocked in some contexts
  }
}

purgeStaleAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
