import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function AlertsList({ alerts = [], onAcknowledge }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-200">No Active Alerts</h4>
        <p className="text-xs text-slate-400 mt-1">All monitored servers are operating within configured healthy thresholds.</p>
      </div>
    );
  }

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
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
      {alerts.map((alert) => {
        const isResolved = alert.status === 'resolved';
        const isAck = alert.status === 'acknowledged';

        return (
          <div key={alert._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-dark-800/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${getSeverityPill(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <Link
                    to={`/servers/${alert.serverId}`}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 font-mono"
                  >
                    {alert.serverName}
                  </Link>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">{formatDate(alert.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-200 mt-1 font-medium">{alert.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {isResolved ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolved {alert.resolvedAt ? formatDate(alert.resolvedAt) : ''}
                </span>
              ) : isAck ? (
                <span className="text-[11px] font-mono text-slate-400 bg-dark-750 border border-slate-700/40 px-2.5 py-1 rounded-full">
                  Acknowledged
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onAcknowledge && onAcknowledge(alert._id)}
                  className="px-3 py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-200 border border-slate-700/60 text-xs font-medium transition-colors"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
