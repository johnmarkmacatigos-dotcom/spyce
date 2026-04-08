// ============================================================
// SPYCE - App Root with Router
// ============================================================
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { useAuthStore } from './utils/store';

// Pages
import LoginPage from './pages/LoginPage';
import FeedPage from './pages/FeedPage';
import ChallengePage from './pages/ChallengePage';
import MarketplacePage from './pages/MarketplacePage';
import ListingDetailPage from './pages/ListingDetailPage';
import ProfilePage from './pages/ProfilePage';
import EarningsPage from './pages/EarningsPage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';

// Layout
import BottomNav from './components/ui/BottomNav';
import LoadingScreen from './components/ui/LoadingScreen';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Public Route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { initAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: '12px',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
          },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />

        {/* Protected */}
        <Route path="/" element={
          <ProtectedRoute><FeedPage /></ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute><SearchPage /></ProtectedRoute>
        } />
        <Route path="/challenge" element={
          <ProtectedRoute><ChallengePage /></ProtectedRoute>
        } />
        <Route path="/marketplace" element={
          <ProtectedRoute><MarketplacePage /></ProtectedRoute>
        } />
        <Route path="/marketplace/:id" element={
          <ProtectedRoute><ListingDetailPage /></ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute><UploadPage /></ProtectedRoute>
        } />
        <Route path="/earnings" element={
          <ProtectedRoute><EarningsPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/profile/:username" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Bottom Nav — only show when authenticated */}
      {isAuthenticated && <BottomNav />}
    </BrowserRouter>
  );
}
