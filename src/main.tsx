import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyDocumentLocale, readStoredLocale } from '@/i18n';
import './index.css';
import './iphone.css';

applyDocumentLocale(readStoredLocale());

function setAppHeight() {
  const layoutH = window.innerHeight;
  const visualH = window.visualViewport?.height ?? layoutH;
  // When the keyboard is open, visualViewport shrinks a lot. Keep the layout
  // height so the app shell doesn't squash (looks like a broken zoom/resolution).
  const keyboardOpen = layoutH - visualH > 120;
  const h = keyboardOpen ? layoutH : visualH;
  const vh = h * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.documentElement.style.setProperty('--app-visible-height', `${h}px`);
  document.documentElement.classList.toggle('keyboard-open', keyboardOpen);
}

setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 100));
window.visualViewport?.addEventListener('resize', setAppHeight);
window.visualViewport?.addEventListener('scroll', setAppHeight);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
