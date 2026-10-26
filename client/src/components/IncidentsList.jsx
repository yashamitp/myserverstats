import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ShieldAlert, Clock, RefreshCw } from 'lucide-react';
import { formatDate, formatTimeAgo } from '../utils/formatters';

export default function IncidentsList({ incidents = [], onAcknowledge, onResolve }) {
  if (incidents.length === 0) {
    return (
      <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-200">No Incidents Detected</h4>
        <p className="text-xs text-slate-400 mt-1">
          All monitored infrastructure components are healthy. Ongoing threshold breaches will be deduplicated and tracked here.
        </p>
      </div>
    );
  }

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  const getSeverityPill = (sev) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
  };

  return (
    <div className="bg-dark-850 border border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-800/60 shadow-sm">
      {incidents.map((incident) => {
        const isResolved = incident.status === 'resolved';
        const isAck = incident.status === 'acknowledged';

        return (
          <div
            key={incident._id}
            className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
              !isResolved && incident.severity === 'critical' ? 'bg-rose-950/10 hover:bg-rose-950/20' : 'hover:bg-dark-800/30'
            }`}
          >
            {/* Left: Info & Fingerprint */}
            <div className="flex items-start gap-3">
              <div className="mt-1">{getSeverityIcon(incident.severity)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${getSeverityPill(incident.severity)}`}>
                    {incident.severity}
                  </span>

                  <Link
                    to={`/servers/${incident.serverId?._id || incident.serverId}`}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 font-mono"
                  >
                    {incident.serverName}
                  </Link>

                  <span className="text-xs text-slate-500">•</span>

                  {/* Occurrence Badge */}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-750 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 text-slate-400" />
                    <span>{incident.occurrenceCount || 1} observation(s)</span>
                  </span>

                  {incident.inMaintenance && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800">
                      Maintenance Window
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-white mt-1.5">{incident.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 font-medium">{incident.message}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500 font-mono">
                  <span>First seen: {formatDate(incident.firstSeen)}</span>
                  <span>•</span>
                  <span>Last seen: {formatTimeAgo(incident.lastSeen)}</span>
                  <span>•</span>
                  <span className="truncate max-w-[240px]">Key: {incident.fingerprint}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
              {isResolved ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolved {incident.resolvedAt ? formatTimeAgo(incident.resolvedAt) : ''}
                </span>
              ) : (
                <>
                  {!isAck && (
                    <button
                      type="button"
                      onClick={() => onAcknowledge && onAcknowledge(incident._id)}
                      className="px-3 py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-200 border border-slate-700/60 text-xs font-medium transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onResolve && onResolve(incident._id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
                  >
                    Resolve
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
