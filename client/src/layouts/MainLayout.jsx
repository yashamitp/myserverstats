import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function MainLayout() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [serverCount, setServerCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Close mobile sidebar automatically whenever user navigates
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      api.getServers().then((res) => {
        setServerCount(res?.data?.length || 0);
      }).catch(() => {});

      api.getAlerts('active').then((res) => {
        setAlertCount(res?.data?.length || 0);
      }).catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Derive title from pathname
  const path = location.pathname;
  let title = 'Infrastructure Dashboard';
  if (path.startsWith('/servers/new')) title = 'Connect Remote Server';
  else if (path.startsWith('/servers/')) title = 'Server Telemetry Details';
  else if (path === '/servers') title = 'Managed Linux Servers';
  else if (path === '/alerts') title = 'Active Alerts & Thresholds';
  else if (path === '/ai-assistant') title = 'AI Troubleshooting Assistant';
  else if (path === '/audit') title = 'Security & Audit Trail';
  else if (path === '/settings') title = 'Organization & Monitoring Settings';

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900 text-slate-100">
      <Sidebar
        serverCount={serverCount}
        alertCount={alertCount}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          title={title}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ setServerCount, setAlertCount }} />
          </div>
        </main>
      </div>
    </div>
  );
}
