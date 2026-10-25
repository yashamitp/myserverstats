import React from 'react';

export default function MetricCard({
  title,
  value,
  unit = '',
  subtitle = '',
  percent = null,
  icon: Icon,
  color = 'indigo'
}) {
  const colorMap = {
    indigo: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      bar: 'bg-indigo-500'
    },
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      bar: 'bg-cyan-500'
    },
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      bar: 'bg-emerald-500'
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      bar: 'bg-amber-500'
    },
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      bar: 'bg-rose-500'
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-5 shadow-sm hover:border-slate-700/80 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg ${scheme.bg} ${scheme.border} border`}>
            <Icon className={`w-4 h-4 ${scheme.text}`} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
        {unit && <span className="text-sm font-medium text-slate-400 font-mono">{unit}</span>}
      </div>

      {percent !== null && (
        <div className="mt-3">
          <div className="w-full bg-dark-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scheme.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        </div>
      )}

      {subtitle && <p className="mt-2 text-xs text-slate-400 truncate">{subtitle}</p>}
    </div>
  );
}
