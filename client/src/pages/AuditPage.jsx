import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck, User, Clock, Terminal } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function AuditPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getAuditLogs().then((res) => {
      setEvents(res.data || []);
    }).catch((err) => {
      console.error(err);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Security Audit Log</h2>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event log of server provisioning, credential updates, connection testing, and AI tool invocations.
        </p>
      </div>

      <div className="bg-dark-850 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-dark-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Safe Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading audit events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No security events recorded yet.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt._id} className="hover:bg-dark-800/30">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{formatDate(evt.timestamp)}</td>
                    <td className="py-3 px-4 font-semibold text-brand-300">{evt.action}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-1.5 py-0.5 rounded bg-dark-750 border border-slate-700/40 text-[10px]">
                        {evt.resourceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{evt.actorId}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                      {JSON.stringify(evt.metadata || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
