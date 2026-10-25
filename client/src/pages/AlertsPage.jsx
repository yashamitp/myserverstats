import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AlertsList from '../components/AlertsList';
import { Bell, Plus, Filter, ShieldAlert } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [servers, setServers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleMetric, setRuleMetric] = useState('cpu');
  const [ruleThreshold, setRuleThreshold] = useState(85);
  const [ruleSeverity, setRuleSeverity] = useState('warning');
  const [ruleServerId, setRuleServerId] = useState('');
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await api.getAlerts(statusFilter || undefined);
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    api.getServers().then((res) => setServers(res.data || [])).catch(() => {});
  }, [statusFilter]);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setIsCreatingRule(true);
    try {
      await api.createAlertRule({
        name: ruleName,
        metricType: ruleMetric,
        threshold: parseFloat(ruleThreshold),
        severity: ruleSeverity,
        serverId: ruleServerId || null
      });
      setShowRuleModal(false);
      setRuleName('');
      alert('Alert rule configured successfully');
    } catch (err) {
      alert(`Rule creation failed: ${err.message}`);
    } finally {
      setIsCreatingRule(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Alerts & Incidents</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time threshold evaluations for CPU, memory, storage, and server connectivity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-dark-850 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === '' ? 'bg-dark-750 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'active' ? 'bg-dark-750 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'resolved' ? 'bg-dark-750 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resolved
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Rule</span>
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading alerts...</div>
      ) : (
        <AlertsList alerts={alerts} onAcknowledge={handleAcknowledge} />
      )}

      {/* New Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldAlert className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-white">Create Threshold Alert Rule</h3>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. High CPU Alert"
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Server (Optional)</label>
                <select
                  value={ruleServerId}
                  onChange={(e) => setRuleServerId(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="">Apply to All Monitored Servers</option>
                  {servers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.hostname})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Metric Type</label>
                  <select
                    value={ruleMetric}
                    onChange={(e) => setRuleMetric(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-brand-500 font-mono"
                  >
                    <option value="cpu">CPU Usage (%)</option>
                    <option value="memory">Memory Usage (%)</option>
                    <option value="disk">Disk Usage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Threshold (%)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={ruleThreshold}
                    onChange={(e) => setRuleThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Severity</label>
                <select
                  value={ruleSeverity}
                  onChange={(e) => setRuleSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRule}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md"
                >
                  {isCreatingRule ? 'Creating...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
