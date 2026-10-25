import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Bell,
  Sparkles,
  FileText,
  Settings,
  ShieldCheck,
  Plus,
  Terminal
} from 'lucide-react';

export default function Sidebar({ serverCount = 0, alertCount = 0 }) {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Servers', path: '/servers', icon: Server, badge: serverCount > 0 ? serverCount : null },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: alertCount > 0 ? alertCount : null, badgeColor: 'bg-rose-500' },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Sparkles, highlight: true },
    { name: 'Audit Logs', path: '/audit', icon: ShieldCheck },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-dark-950 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Terminal className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            Agent<span className="text-brand-400">Ops</span>
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block leading-none">
            Infrastructure AI
          </span>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="p-4">
        <NavLink
          to="/servers/new"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Server</span>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-dark-800 text-white shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850'
                } ${item.highlight ? 'hover:text-brand-300' : ''}`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${item.highlight ? 'text-brand-400' : ''}`} />
                <span>{item.name}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full text-white ${
                    item.badgeColor || 'bg-dark-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* External Docs Link & Version */}
      <div className="p-4 border-t border-slate-800/80 space-y-2">
        <a
          href="/api/v1/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-dark-850 transition-colors"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>REST API OpenAPI Spec</span>
        </a>

        <div className="px-3 pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>AgentOps Core</span>
          <span className="text-emerald-500 font-semibold">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
