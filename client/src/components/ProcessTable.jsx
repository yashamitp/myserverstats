import React, { useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';

export default function ProcessTable({ processes = [], isLoading = false }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('cpuPercent');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filtered = processes.filter((p) => {
    const cmd = (p.command || p.name || '').toLowerCase();
    const usr = (p.user || '').toLowerCase();
    const pidStr = (p.pid || '').toString();
    const q = search.toLowerCase();
    return cmd.includes(q) || usr.includes(q) || pidStr.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-dark-850 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-100">Top Processes</h3>
          <span className="text-xs font-mono text-slate-400 bg-dark-750 px-2 py-0.5 rounded border border-slate-700/40">
            {filtered.length} total
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search PID, command, user..."
            className="pl-8 pr-3 py-1.5 bg-dark-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-dark-900/50 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800/60">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('pid')}
              >
                <div className="flex items-center gap-1">
                  PID <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('user')}
              >
                <div className="flex items-center gap-1">
                  User <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 text-right"
                onClick={() => handleSort('cpuPercent')}
              >
                <div className="flex items-center justify-end gap-1">
                  CPU % <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200 text-right"
                onClick={() => handleSort('memPercent')}
              >
                <div className="flex items-center justify-end gap-1">
                  Mem % <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200"
                onClick={() => handleSort('command')}
              >
                <div className="flex items-center gap-1">
                  Command <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Inspecting process table via SSH...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No matching processes found.
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={`${p.pid}-${p.command}`} className="hover:bg-dark-800/40 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 font-semibold">{p.pid}</td>
                  <td className="py-2.5 px-4 text-slate-300">{p.user}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className={`font-semibold ${
                        p.cpuPercent > 50
                          ? 'text-rose-400'
                          : p.cpuPercent > 20
                          ? 'text-amber-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      {p.cpuPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-cyan-400 font-semibold">
                    {p.memPercent.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 font-mono truncate max-w-md">
                    {p.command}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 rounded bg-dark-800 border border-slate-700/60 disabled:opacity-40 hover:text-white"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 rounded bg-dark-800 border border-slate-700/60 disabled:opacity-40 hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
