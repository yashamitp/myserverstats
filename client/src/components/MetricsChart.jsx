import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function MetricsChart({
  title,
  data = [],
  dataKey = 'value',
  color = '#6366F1',
  unit = '%',
  selectedRange = '1h',
  onRangeChange,
  domain = [0, 100]
}) {
  const formattedData = data.map((d) => ({
    ...d,
    time: d.timestamp
      ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : ''
  }));

  const ranges = ['15m', '1h', '6h', '24h'];

  return (
    <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Historical telemetry over time</p>
        </div>

        {onRangeChange && (
          <div className="flex items-center gap-1 bg-dark-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  selectedRange === r
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-56 w-full">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Awaiting metrics collection data points...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={25}
              />
              <YAxis
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={domain}
                unit={unit}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F1626',
                  borderColor: '#1E293B',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#F8FAFC',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                formatter={(val) => [`${val}${unit}`, title]}
                labelFormatter={(lbl) => `Time: ${lbl}`}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#grad-${title})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
