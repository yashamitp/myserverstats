import React, { useState } from 'react';
import { Terminal, Copy, Check, Filter, RefreshCw } from 'lucide-react';

export default function LogsViewer({ logs = [], isLoading = false, onReload, options = {}, onOptionsChange }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = logs.map((l) => l.raw || `${l.timestamp} ${l.process}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-dark-850 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm flex flex-col h-[520px]">
      {/* Log Header Controls */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-dark-900/40">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-100">Journalctl System Logs</h3>
          <span className="text-xs font-mono text-slate-400 bg-dark-800 px-2 py-0.5 rounded border border-slate-700/40">
            {logs.length} lines
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity selector */}
          <select
            value={options.severity || 'all'}
            onChange={(e) => onOptionsChange && onOptionsChange({ ...options, severity: e.target.value })}
            className="bg-dark-900 border border-slate-800 rounded-lg text-xs text-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
          >
            <option value="all">Severity: All</option>
            <option value="err">Errors & Critical</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>

          {/* Lines selector */}
          <select
            value={options.lines || 50}
            onChange={(e) => onOptionsChange && onOptionsChange({ ...options, lines: parseInt(e.target.value, 10) })}
            className="bg-dark-900 border border-slate-800 rounded-lg text-xs text-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
          >
            <option value={30}>30 lines</option>
            <option value={50}>50 lines</option>
            <option value={100}>100 lines</option>
          </select>

          {/* Copy Logs */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 border border-slate-700/60 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={onReload}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 border border-slate-700/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-4 bg-dark-950 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 selection:bg-brand-500 selection:text-white terminal-scroll">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            Querying journalctl over SSH...
          </div>
        ) : logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            No log entries match the selected filters.
          </div>
        ) : (
          logs.map((log, index) => {
            const isError = log.message?.toLowerCase().includes('error') || log.message?.toLowerCase().includes('fail');
            const isWarn = log.message?.toLowerCase().includes('warn');

            return (
              <div
                key={`${index}-${log.timestamp}`}
                className={`py-0.5 hover:bg-dark-850/60 px-1 rounded flex gap-3 ${
                  isError ? 'text-rose-400 bg-rose-500/5' : isWarn ? 'text-amber-400 bg-amber-500/5' : ''
                }`}
              >
                <span className="text-slate-500 shrink-0 select-none">{log.timestamp}</span>
                {log.process && <span className="text-brand-400 shrink-0">[{log.process}]</span>}
                <span className="break-all">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
