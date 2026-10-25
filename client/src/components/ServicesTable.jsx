import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function ServicesTable({ services = [], isLoading = false }) {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (stateFilter === 'running') return s.sub === 'running';
    if (stateFilter === 'failed') return s.active === 'failed' || s.sub === 'failed';
    return true;
  });

  return (
    <div className="bg-dark-850 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-100">Systemd Services</h3>
          <div className="flex items-center gap-1 bg-dark-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setStateFilter('all')}
              className={`px-2 py-0.5 rounded font-medium ${
                stateFilter === 'all' ? 'bg-dark-750 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({services.length})
            </button>
            <button
              type="button"
              onClick={() => setStateFilter('running')}
              className={`px-2 py-0.5 rounded font-medium ${
                stateFilter === 'running' ? 'bg-dark-750 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Running
            </button>
            <button
              type="button"
              onClick={() => setStateFilter('failed')}
              className={`px-2 py-0.5 rounded font-medium ${
                stateFilter === 'failed' ? 'bg-dark-750 text-rose-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Failed ({services.filter((s) => s.active === 'failed').length})
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service name..."
            className="pl-8 pr-3 py-1.5 bg-dark-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-xs">
          <thead className="bg-dark-900/50 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800/60 sticky top-0">
            <tr>
              <th className="py-3 px-4">Unit Name</th>
              <th className="py-3 px-4">Active State</th>
              <th className="py-3 px-4">Sub State</th>
              <th className="py-3 px-4">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  Retrieving systemctl unit statuses...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No matching system services found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const isFailed = s.active === 'failed' || s.sub === 'failed';
                const isRunning = s.sub === 'running';

                return (
                  <tr key={s.name} className="hover:bg-dark-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-200">{s.name}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isFailed
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : isRunning
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        {isFailed ? (
                          <XCircle className="w-3 h-3 text-rose-400" />
                        ) : isRunning ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-slate-400" />
                        )}
                        {s.active}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{s.sub}</td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans truncate max-w-sm">
                      {s.description || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
