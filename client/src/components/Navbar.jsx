import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Radio, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';

export default function Navbar({ title = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="h-16 px-6 bg-dark-900 border-b border-slate-800/80 flex items-center justify-between z-10 shrink-0">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-100">{title}</h1>
      </div>

      {/* Right Controls: Live Socket Pulse & User Menu */}
      <div className="flex items-center gap-4">
        {/* Live WebSocket Status Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-dark-800 border border-slate-700/60 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="font-mono text-[11px] text-slate-300">
            {isConnected ? 'Real-Time Connected' : 'Reconnecting...'}
          </span>
        </div>

        {/* In-App Notification Center Bell */}
        <NotificationBell />

        {/* User Account */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-semibold uppercase">
              {user?.email ? user.email.slice(0, 2) : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden md:block">
              <span className="font-medium text-slate-200 block leading-tight truncate max-w-[140px]">
                {user?.name || user?.email}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {user?.role || 'Tenant'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-dark-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
