import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Terminal, Shield, Cpu, Activity } from 'lucide-react';

export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-cyan/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Logo and Tagline */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 mb-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Agent<span className="text-brand-400">Ops</span>
          </span>
        </Link>
        <p className="mt-2 text-xs text-slate-400 font-medium">
          Enterprise AI Multi-Server Monitoring Platform
        </p>
      </div>

      {/* Centered Auth Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex justify-center">
        <Outlet />
      </div>

      {/* Trust & Security Badge */}
      <div className="mt-8 text-center z-10 flex items-center justify-center gap-2 text-slate-500 text-xs">
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span>Multi-Tenant Isolated &bull; End-to-End Encrypted Telemetry</span>
      </div>
    </div>
  );
}
