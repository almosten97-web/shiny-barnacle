import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './page.tsx';
import './index.css';

class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean; errorMessage: string | null }
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown application error';
    return { hasError: true, errorMessage };
  }

  componentDidCatch(error: unknown) {
    console.error('Uncaught render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Application Error</h1>
          <p style={{ marginTop: '8px' }}>
            {this.state.errorMessage || 'An unexpected render error occurred.'}
          </p>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>
            Check the browser console for stack traces.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
