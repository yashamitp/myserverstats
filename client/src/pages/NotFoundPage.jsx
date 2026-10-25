import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-6 text-center text-slate-100">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-6">
        <Terminal className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold font-mono text-white">404</h1>
      <p className="text-sm text-slate-400 mt-2 max-w-sm">
        The requested infrastructure path does not exist or has been relocated.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
