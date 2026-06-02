import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('SW registered:', reg.scope);
        // Once the SW is active, send it the list of every asset on the page
        // so it can pre-cache them. This is what makes a cold offline refresh work.
        const sendPrecache = () => {
          if (!navigator.serviceWorker.controller) return;
          const urls = [
            ...performance.getEntriesByType('resource')
              .map((r) => r.name)
              .filter((u) => u.startsWith(self.location.origin)),
          ];
          if (urls.length > 0) {
            navigator.serviceWorker.controller.postMessage({
              type: 'PRECACHE_URLS',
              urls: [...new Set(urls)],
            });
          }
        };
        if (reg.active) sendPrecache();
        else reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') sendPrecache();
          });
        });
        // Also re-send on every successful navigation, to catch lazy chunks
        navigator.serviceWorker.addEventListener('controllerchange', sendPrecache);
        window.addEventListener('load', sendPrecache);
      })
      .catch((err) => {
        console.log('SW registration failed:', err);
      });
  });
}

// Request persistent storage so the browser doesn't evict cached models under pressure
// Without this, browsers can silently delete Cache API / IndexedDB data when disk is low
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((persisted) => {
    if (persisted) {
      console.log('Storage persistence granted — cached models are safe from eviction');
    } else {
      console.log('Storage persistence denied — browser may evict cached data under pressure');
    }
  });
}

// Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#888', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);