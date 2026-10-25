import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AddServerPage from './pages/AddServerPage';
import ServerDetailsPage from './pages/ServerDetailsPage';
import AlertsPage from './pages/AlertsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public Landing */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth Layout */}
            <Route element={<AuthLayout />}>
              <Route path="/auth" element={<AuthPage />} />
            </Route>

            {/* Protected SaaS App */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/servers" element={<DashboardPage />} />
              <Route path="/servers/new" element={<AddServerPage />} />
              <Route path="/servers/:id" element={<ServerDetailsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/ai-assistant" element={<AIAssistantPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
