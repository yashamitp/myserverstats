export function formatBytes(bytes, decimals = 1) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);

  return parts.join(' ');
}

export function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function getStatusBadgeConfig(status) {
  switch (status) {
    case 'online':
      return {
        label: 'Online',
        dotClass: 'bg-emerald-400',
        bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      };
    case 'offline':
      return {
        label: 'Offline',
        dotClass: 'bg-rose-500',
        bgClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      };
    case 'warning':
      return {
        label: 'Warning',
        dotClass: 'bg-amber-400',
        bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      };
    default:
      return {
        label: 'Pending',
        dotClass: 'bg-slate-400',
        bgClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      };
  }
}
