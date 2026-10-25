import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Terminal,
  Activity,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function AIAssistantPage() {
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [investigations, setInvestigations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    api.getServers().then((res) => {
      const list = res.data || [];
      setServers(list);
      if (list.length > 0) {
        setSelectedServerId(list[0]._id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedServerId) {
      api.aiInsights(selectedServerId).then((res) => {
        setInvestigations(res.data?.insights || []);
      }).catch(() => {});
    }
  }, [selectedServerId]);

  const handleInvestigate = async (overridePrompt) => {
    const q = overridePrompt || prompt;
    if (!q.trim() || !selectedServerId) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await api.aiChat(selectedServerId, q);
      setInvestigations((prev) => [res.data, ...prev]);
      setPrompt('');
    } catch (err) {
      setErrorMsg(err.message || 'Investigation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedServer = servers.find((s) => s._id === selectedServerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-medium mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tool-Grounded Autonomous Diagnostics</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">AI Infrastructure Troubleshooting Assistant</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          The AI assistant directly inspects read-only server metrics, process tables, and journalctl logs to find the root cause of CPU spikes, memory leaks, or crashed services without guessing.
        </p>
      </div>

      {/* Query Composer Box */}
      <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-semibold text-white">Target Server:</span>
          </div>

          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            className="px-3 py-1.5 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
          >
            {servers.length === 0 ? (
              <option value="">No servers registered</option>
            ) : (
              servers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.hostname}) - {s.status}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Quick Diagnostic Suggestions */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Suggested Questions:</span>
          <div className="flex flex-wrap gap-2">
            {[
              'Why is this server running slowly?',
              'Inspect memory usage and identify potential leaks',
              'Check for any crashed or degraded systemd units',
              'Inspect top CPU consuming processes and correlate with load average',
              'Search recent system logs for authentication or kernel warnings'
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleInvestigate(q)}
                disabled={isLoading || !selectedServerId}
                className="px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-750 disabled:opacity-50 text-slate-300 border border-slate-800 text-xs transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input Area */}
        <div className="pt-2">
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to investigate on this server..."
              className="w-full p-3.5 bg-dark-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 leading-relaxed"
            />
            <button
              type="button"
              disabled={isLoading || !prompt.trim() || !selectedServerId}
              onClick={() => handleInvestigate()}
              className="absolute right-3 bottom-3 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Investigating...' : 'Ask Assistant'}</span>
            </button>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>AI Service Notification</span>
            </div>
            <p className="leading-relaxed">{errorMsg}</p>
            {errorMsg.toLowerCase().includes('not configured') && (
              <div className="pt-2 border-t border-rose-500/20 text-[11px] text-slate-300 font-mono">
                Setup: Add <code className="text-white">AI_API_KEY=your_key</code> and <code className="text-white">AI_PROVIDER=openai</code> (or Gemini) to your backend <code className="text-white">.env</code> file.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Investigation Reports Feed */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
          Telemetry Diagnostic Reports ({investigations.length})
        </h3>

        {investigations.length === 0 ? (
          <div className="p-10 bg-dark-850 border border-slate-800 rounded-2xl text-center text-xs text-slate-500">
            No past investigation records found for this server.
          </div>
        ) : (
          investigations.map((inv) => (
            <div key={inv._id} className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <span className="text-sm font-bold text-white">"{inv.query}"</span>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>{formatDate(inv.createdAt)}</span>
                  {inv.modelUsed && <span className="text-brand-400">[{inv.modelUsed}]</span>}
                </div>
              </div>

              {/* Tools Called */}
              {inv.toolCalls && inv.toolCalls.length > 0 && (
                <div className="p-4 bg-dark-900 rounded-xl border border-slate-800/60 text-xs font-mono space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Backend Inspection Tools Executed:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inv.toolCalls.map((tc, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-300 bg-dark-850 p-2 rounded-lg border border-slate-800/40">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-brand-300">{tc.tool}</span>
                        <span className="text-slate-500 truncate text-[11px]">
                          {Object.keys(tc.params || {}).length > 0 ? JSON.stringify(tc.params) : '(server scope)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis Output */}
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-dark-900/40 p-5 rounded-xl border border-slate-800/40">
                {inv.summary}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
