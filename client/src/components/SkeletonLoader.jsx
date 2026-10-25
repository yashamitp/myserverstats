import React from 'react';

export default function SkeletonLoader({ count = 3, type = 'card' }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-dark-850 border border-slate-800/80 rounded-xl p-5 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-dark-700 rounded w-1/3" />
              <div className="h-4 bg-dark-700 rounded-full w-16" />
            </div>
            <div className="h-3 bg-dark-750 rounded w-1/2 mt-2" />
            <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-800/60">
              <div className="h-12 bg-dark-800 rounded" />
              <div className="h-12 bg-dark-800 rounded" />
              <div className="h-12 bg-dark-800 rounded" />
            </div>
            <div className="h-3 bg-dark-750 rounded w-1/4 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 bg-dark-850 border border-slate-800 rounded-lg" />
      ))}
    </div>
  );
}
