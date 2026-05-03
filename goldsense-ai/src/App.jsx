import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoldSenseProvider } from './context/GoldSenseContext';
import NavBar from './components/NavBar';
import Welcome from './screens/Welcome';
import Capture from './screens/Capture';
import Analysing from './screens/Analysing';
import Result from './screens/Result';
import NeedsVerification from './screens/NeedsVerification';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('App Error:', error, errorInfo); }
  render() { 
    if (this.state.hasError) {
      return (
        <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: 16 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)' }}>An unexpected error occurred in this screen.</p>
          <button style={{ background: 'transparent', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', padding: '12px 24px', borderRadius: 8, marginTop: 24, cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
            Return to Start
          </button>
        </div>
      );
    }
    return this.props.children; 
  }
}

export default function App() {
  return (
    <GoldSenseProvider>
      <BrowserRouter>
        <div className="app-shell">
          <NavBar />
          <ErrorBoundary>
            <Routes>
              <Route path="/"                   element={<Welcome />} />
              <Route path="/capture"            element={<Capture />} />
              <Route path="/analysing"          element={<Analysing />} />
              <Route path="/result"             element={<Result />} />
              <Route path="/needs-verification" element={<NeedsVerification />} />
              <Route path="*"                   element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </BrowserRouter>
    </GoldSenseProvider>
  );
}
