import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Shield, Key, Network, Server } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Organization & Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your tenant credentials, security isolation parameters, and telemetry intervals.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <User className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Authenticated Identity</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Email Address:</span>
            <span className="text-white font-semibold">{user?.email || 'user@example.com'}</span>
          </div>

          <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Role:</span>
            <span className="text-brand-400 font-semibold uppercase">{user?.role || 'user'}</span>
          </div>

          <div className="p-3 bg-dark-900 rounded-lg border border-slate-800 sm:col-span-2">
            <span className="text-slate-500 block text-[11px]">Tenant Isolation ID:</span>
            <span className="text-slate-300 select-all">{user?.tenantId || user?.id || '—'}</span>
          </div>
        </div>
      </div>

      {/* Security & Network Policy */}
      <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Outbound Security & SSRF Policy</h3>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              <strong>Host-Key Verification:</strong> Remote SSH host keys are verified and stored upon onboarding to prevent MITM attacks.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              <strong>SSRF Defense:</strong> Loopback (127.0.0.0/8), Link-local (169.254.0.0/16), and cloud metadata endpoints (169.254.169.254) are rejected by default.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              <strong>Secret Encryption:</strong> SSH private keys and passwords are encrypted using authenticated AES-256-GCM.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
