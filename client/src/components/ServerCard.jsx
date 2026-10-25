import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import {
  Cpu,
  Database,
  HardDrive,
  Clock,
  ArrowRight,
  RefreshCw,
  MoreVertical,
  Activity,
  Edit2,
  Trash2
} from 'lucide-react';
import { formatBytes, formatDuration, formatTimeAgo } from '../utils/formatters';

export default function ServerCard({ server, onRefresh, onEdit, onDelete, isRefreshing = false }) {
  const metrics = server.lastMetrics;
  const cpuPercent = metrics?.cpu?.usagePercent ?? null;
  const memPercent = metrics?.memory?.usagePercent ?? null;
  const uptimeSeconds = metrics?.uptime?.seconds ?? null;

  // Calculate highest disk usage
  let maxDisk = null;
  if (metrics?.disk && Array.isArray(metrics.disk) && metrics.disk.length > 0) {
    maxDisk = metrics.disk.reduce((max, d) => (d.usagePercent > max.usagePercent ? d : max), metrics.disk[0]);
  }

  // Stale detection: if lastContact is older than 2x interval
  const isStale = server.lastContact
    ? (Date.now() - new Date(server.lastContact).getTime()) > ((server.monitoringInterval || 10) * 2000)
    : true;

  return (
    <div className="bg-dark-850 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between">
      {/* Card Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white truncate hover:text-brand-300 transition-colors">
                <Link to={`/servers/${server._id}`}>{server.name}</Link>
              </h3>
              <StatusBadge status={server.status} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
              <span>{server.hostname}:{server.port || 22}</span>
              <span>•</span>
              <span className="capitalize">{server.os?.distro || 'Ubuntu'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onRefresh && onRefresh(server._id)}
              disabled={isRefreshing}
              title="Refresh Metrics Now"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-750 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => onEdit && onEdit(server)}
              title="Edit VM Credentials"
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-dark-750 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDelete && onDelete(server)}
              title="Delete Server"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-dark-750 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Gauges */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/60">
          {/* CPU */}
          <div className="bg-dark-900/60 rounded-lg p-2.5 border border-slate-800/40">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-400" />
                CPU
              </span>
              <span className="font-mono font-medium text-slate-200">
                {cpuPercent !== null ? `${cpuPercent}%` : '--'}
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (cpuPercent || 0) > 85 ? 'bg-rose-500' : (cpuPercent || 0) > 70 ? 'bg-amber-400' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, cpuPercent || 0))}%` }}
              />
            </div>
          </div>

          {/* RAM */}
          <div className="bg-dark-900/60 rounded-lg p-2.5 border border-slate-800/40">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-cyan-400" />
                RAM
              </span>
              <span className="font-mono font-medium text-slate-200">
                {memPercent !== null ? `${memPercent}%` : '--'}
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (memPercent || 0) > 85 ? 'bg-rose-500' : (memPercent || 0) > 70 ? 'bg-amber-400' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, memPercent || 0))}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div className="bg-dark-900/60 rounded-lg p-2.5 border border-slate-800/40">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                Disk
              </span>
              <span className="font-mono font-medium text-slate-200">
                {maxDisk ? `${maxDisk.usagePercent}%` : '--'}
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (maxDisk?.usagePercent || 0) > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, maxDisk?.usagePercent || 0))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Uptime & Stale Indicator */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Uptime:</span>
            <span className="font-mono text-slate-300">
              {uptimeSeconds ? formatDuration(uptimeSeconds) : 'Unknown'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span>Last seen:</span>
            <span className={isStale ? 'text-amber-400' : 'text-slate-300'}>
              {formatTimeAgo(server.lastContact)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {server.tags?.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-mono bg-dark-750 text-slate-400 border border-slate-700/50">
              #{tag}
            </span>
          ))}
        </div>

        <Link
          to={`/servers/${server._id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
