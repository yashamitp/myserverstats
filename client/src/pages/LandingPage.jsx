import React from 'react';
import { Link } from 'react-router-dom';
import {
  Terminal,
  Server,
  Activity,
  Sparkles,
  ShieldCheck,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="h-18 px-6 lg:px-12 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-dark-950/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Agent<span className="text-brand-400">Ops</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all flex items-center gap-1.5"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth?mode=register"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-12 pt-20 pb-16 max-w-6xl mx-auto text-center overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Production AI Linux Multi-Server Telemetry</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
          Connect, Monitor, and Troubleshoot Remote Servers with <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-accent-cyan bg-clip-text text-transparent">AI Precision</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Real-time measurement graphs, process inspection, systemd unit monitoring, and an autonomous AI troubleshooter grounded in verifiable telemetry evidence.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={isAuthenticated ? '/dashboard' : '/auth?mode=register'}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-xl shadow-brand-600/25 transition-all flex items-center justify-center gap-2"
          >
            <span>{isAuthenticated ? 'Open Dashboard' : 'Start Monitoring Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-dark-850 hover:bg-dark-800 border border-slate-700/80 text-slate-200 text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span>Explore OpenAPI Spec</span>
          </a>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="bg-dark-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Real Linux Telemetry</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Calculates CPU usage from <code className="text-slate-300 font-mono">/proc/stat</code> differentials, parses <code className="text-slate-300 font-mono">/proc/meminfo</code> with reclaimable buffer handling, and tracks network throughput over time.
            </p>
          </div>

          <div className="bg-dark-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Tool-Grounded AI Troubleshooter</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The AI assistant calls strictly authorized, read-only monitoring tools (<code className="text-slate-300 font-mono">get_top_processes</code>, <code className="text-slate-300 font-mono">get_recent_logs</code>) to diagnose root causes without guessing.
            </p>
          </div>

          <div className="bg-dark-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Defensive Architecture</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              SSRF validation blocking loopback and cloud metadata endpoints, SSH host-key verification, AES-256-GCM encrypted credentials, and strict multi-tenant isolation.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-6 lg:px-12 text-center text-xs text-slate-500">
        <p>AgentOps Platform • Built for Ubuntu/Debian Servers • Production Multi-Tenant Architecture</p>
      </footer>
    </div>
  );
}
