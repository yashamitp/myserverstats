import React from 'react';
import { Link } from 'react-router-dom';
import { Server, Plus } from 'lucide-react';

export default function EmptyState({
  title = 'No servers connected',
  description = 'Connect your first remote Linux server over SSH to begin real-time monitoring and AI diagnostics.',
  actionText = 'Connect First Server',
  actionTo = '/servers/new'
}) {
  return (
    <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mx-auto shadow-inner">
        <Server className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-white mt-4">{title}</h3>
      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{description}</p>
      {actionTo && (
        <div className="mt-6">
          <Link
            to={actionTo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{actionText}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
