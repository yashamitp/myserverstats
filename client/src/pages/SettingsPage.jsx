import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  User,
  Shield,
  Mail,
  Send,
  Sliders,
  Calendar,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  Layers,
  Lock
} from 'lucide-react';
import { formatDate, formatTimeAgo } from '../utils/formatters';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications', 'profiles', 'reports', 'maintenance', 'security'

  // --- Email & Notification Preferences State ---
  const [emailPrefs, setEmailPrefs] = useState({
    emailEnabled: true,
    recipients: [],
    minSeverity: 'warning',
    cooldownMinutes: 30,
    sendRecoveryEmail: true,
    customSmtp: { enabled: false, host: '', port: 587, user: '', pass: '', fromEmail: '', fromName: 'AgentOps Alerts' }
  });
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null); // { loading, success, error }
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // --- Monitoring Profiles State ---
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // --- Scheduled Reports State ---
  const [reportConfig, setReportConfig] = useState({
    title: 'Daily Infrastructure Health Report',
    frequency: 'daily',
    hour: 8,
    recipients: [],
    isEnabled: false
  });
  const [reportEmailInput, setReportEmailInput] = useState('');
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [generatingReportNow, setGeneratingReportNow] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  // --- Maintenance Windows State ---
  const [maintenanceWindows, setMaintenanceWindows] = useState([]);
  const [servers, setServers] = useState([]);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintStart, setMaintStart] = useState('');
  const [maintEnd, setMaintEnd] = useState('');
  const [maintServers, setMaintServers] = useState([]);
  const [isSchedulingMaint, setIsSchedulingMaint] = useState(false);

  // Load Initial Data
  useEffect(() => {
    loadNotificationPreferences();
    loadProfiles();
    loadReportConfig();
    loadMaintenanceWindows();
    api.getServers().then(res => setServers(res?.data || [])).catch(() => {});
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      const res = await api.getNotificationPreferences();
      if (res?.data?.preferences) {
        setEmailPrefs(prev => ({ ...prev, ...res.data.preferences }));
        setIsSmtpConfigured(Boolean(res.data.isSmtpConfigured));
      }
      loadDeliveryHistory();
    } catch (e) {
      console.error('Failed to load email preferences:', e);
    }
  };

  const loadDeliveryHistory = async () => {
    try {
      const res = await api.getDeliveryHistory({ limit: 10 });
      setDeliveryHistory(res?.data?.deliveries || []);
    } catch (e) {}
  };

  const loadProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const res = await api.getProfiles();
      setProfiles(res?.data || []);
    } catch (e) {
      console.error('Failed to load profiles:', e);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const loadReportConfig = async () => {
    try {
      const res = await api.getReportConfig();
      if (res?.data) {
        setReportConfig(res.data);
      }
    } catch (e) {}
  };

  const loadMaintenanceWindows = async () => {
    try {
      const res = await api.getMaintenanceWindows();
      setMaintenanceWindows(res?.data || []);
    } catch (e) {}
  };

  // --- Handlers: Notifications ---
  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const payload = {
        ...emailPrefs,
        // Recipients is strictly locked to the authenticated user's login email
        recipients: [user?.email || emailPrefs.recipients[0]].filter(Boolean)
      };
      await api.updateNotificationPreferences(payload);
      alert('Notification preferences updated successfully');
      loadNotificationPreferences();
    } catch (err) {
      alert(`Failed to save preferences: ${err.message}`);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTestEmailStatus({ loading: true });
    try {
      const target = user?.email || emailPrefs.recipients[0];
      await api.sendTestEmail({ targetEmail: target });
      setTestEmailStatus({ success: `Verification email queued for ${target}` });
      loadDeliveryHistory();
    } catch (err) {
      setTestEmailStatus({ error: err.message });
    }
  };

  // --- Handlers: Reports ---
  const handleSaveReportConfig = async () => {
    setIsSavingReport(true);
    try {
      await api.updateReportConfig(reportConfig);
      alert('Scheduled report settings saved successfully');
    } catch (err) {
      alert(`Failed to save report config: ${err.message}`);
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleGenerateReportNow = async () => {
    setGeneratingReportNow(true);
    try {
      const res = await api.generateReportNow();
      setReportResult(res.data);
      alert('Infrastructure health report generated and queued for delivery!');
      loadDeliveryHistory();
    } catch (err) {
      alert(`Failed to generate report: ${err.message}`);
    } finally {
      setGeneratingReportNow(false);
    }
  };

  // --- Handlers: Maintenance ---
  const handleScheduleMaintenance = async (e) => {
    e.preventDefault();
    setIsSchedulingMaint(true);
    try {
      await api.createMaintenanceWindow({
        title: maintTitle,
        startTime: maintStart,
        endTime: maintEnd,
        serverIds: maintServers,
        suppressNotifications: true
      });
      setShowMaintModal(false);
      setMaintTitle('');
      setMaintStart('');
      setMaintEnd('');
      setMaintServers([]);
      loadMaintenanceWindows();
      alert('Maintenance window scheduled successfully');
    } catch (err) {
      alert(`Failed to schedule maintenance window: ${err.message}`);
    } finally {
      setIsSchedulingMaint(false);
    }
  };

  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this maintenance window?')) return;
    try {
      await api.deleteMaintenanceWindow(id);
      loadMaintenanceWindows();
    } catch (err) {
      alert(`Failed to delete window: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Organization & Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure email alerts, monitoring profiles, scheduled reports, maintenance windows, and security policies.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2">
        {[
          { id: 'notifications', label: 'Email & Alerts', icon: Mail },
          { id: 'profiles', label: 'Monitoring Profiles', icon: Sliders },
          { id: 'reports', label: 'Health Reports', icon: FileText },
          { id: 'maintenance', label: 'Maintenance Windows', icon: Calendar },
          { id: 'security', label: 'Security & Identity', icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: NOTIFICATIONS & EMAIL ALERTS --- */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* SMTP Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            isSmtpConfigured
              ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
              : 'bg-amber-950/20 border-amber-800/60 text-amber-300'
          }`}>
            {isSmtpConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="font-semibold block">
                {isSmtpConfigured ? 'SMTP Delivery Service Active' : 'SMTP Configuration Missing or Incomplete'}
              </span>
              <span className="text-slate-400 block mt-0.5">
                {isSmtpConfigured
                  ? 'Email notifications will be delivered for critical incidents and recovery events.'
                  : 'Platform SMTP service is offline. Please verify server SMTP configuration.'}
              </span>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Alert Delivery Preferences</h3>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <span>Email Delivery Enabled</span>
                <input
                  type="checkbox"
                  checked={emailPrefs.emailEnabled}
                  onChange={(e) => setEmailPrefs(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                  className="rounded bg-dark-900 border-slate-700 text-brand-500 focus:ring-0"
                />
              </label>
            </div>

            {/* Alert Notification Recipient - Locked to Main Login Account */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Alert Notification Recipient
                </label>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" />
                  Primary Login Email • Locked
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-900 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white font-mono">
                      {user?.email || (emailPrefs.recipients && emailPrefs.recipients[0]) || 'Loading account email...'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Infrastructure alerts and recovery digests are strictly delivered to your primary account login email. This recipient cannot be changed.
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-dark-850 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                  <Shield className="w-3.5 h-3.5 text-brand-400" />
                  <span>Immutable</span>
                </div>
              </div>
            </div>

            {/* Threshold & Cooldown Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Minimum Severity</label>
                <select
                  value={emailPrefs.minSeverity}
                  onChange={(e) => setEmailPrefs(prev => ({ ...prev, minSeverity: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-white"
                >
                  <option value="info">Info & Above (All)</option>
                  <option value="warning">Warning & Critical Only</option>
                  <option value="critical">Critical Only</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notification Cooldown</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={emailPrefs.cooldownMinutes}
                    onChange={(e) => setEmailPrefs(prev => ({ ...prev, cooldownMinutes: parseInt(e.target.value, 10) }))}
                    className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-white font-mono"
                  />
                  <span className="text-slate-500">mins</span>
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer py-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={emailPrefs.sendRecoveryEmail}
                    onChange={(e) => setEmailPrefs(prev => ({ ...prev, sendRecoveryEmail: e.target.checked }))}
                    className="rounded bg-dark-900 border-slate-700 text-brand-500 focus:ring-0"
                  />
                  <span>Send Recovery Email when Cleared</span>
                </label>
              </div>
            </div>

            {/* Save & Test Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={isSavingPrefs}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {isSavingPrefs ? 'Saving Settings...' : 'Save Preferences'}
                </button>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testEmailStatus?.loading || !isSmtpConfigured}
                  className="px-3.5 py-2 bg-dark-750 hover:bg-dark-700 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testEmailStatus?.loading ? 'Sending...' : 'Send Test Email'}</span>
                </button>
              </div>

              {testEmailStatus?.success && (
                <span className="text-xs text-emerald-400 font-medium">
                  {testEmailStatus.success}
                </span>
              )}
              {testEmailStatus?.error && (
                <span className="text-xs text-rose-400 font-medium">
                  {testEmailStatus.error}
                </span>
              )}
            </div>
          </div>

          {/* Delivery History Card */}
          <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Recent Email Deliveries</h3>
              </div>
              <button
                type="button"
                onClick={loadDeliveryHistory}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {deliveryHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No email deliveries recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">Recipient</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Subject</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {deliveryHistory.map(d => (
                      <tr key={d._id} className="text-slate-300 hover:bg-dark-800/40">
                        <td className="py-2.5 font-medium text-white">{d.recipient}</td>
                        <td className="py-2.5 capitalize">{d.type?.replace('_', ' ')}</td>
                        <td className="py-2.5 truncate max-w-[200px] text-slate-400">{d.subject}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            d.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : d.status === 'retrying'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-slate-500">{formatTimeAgo(d.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: MONITORING PROFILES --- */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Reusable Monitoring Profiles</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Profiles define baseline CPU, RAM, disk thresholds, and required services tailored for specific operating systems.
                </p>
              </div>
            </div>

            {isLoadingProfiles ? (
              <p className="text-xs text-slate-500 py-6 text-center">Loading monitoring profiles...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profiles.map(profile => (
                  <div key={profile._id} className="p-4 bg-dark-900 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{profile.name}</h4>
                          {profile.isDefault && (
                            <span className="text-[10px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-full font-semibold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{profile.description}</p>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300 uppercase border border-slate-700">
                        {profile.targetOs}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-xs font-mono">
                      <div className="p-2 bg-dark-950 rounded border border-slate-800/60">
                        <span className="text-slate-500 block text-[10px]">CPU Alert:</span>
                        <span className="text-white font-semibold">{profile.thresholds?.cpu?.threshold || 85}%</span>
                      </div>
                      <div className="p-2 bg-dark-950 rounded border border-slate-800/60">
                        <span className="text-slate-500 block text-[10px]">RAM Alert:</span>
                        <span className="text-white font-semibold">{profile.thresholds?.memory?.threshold || 90}%</span>
                      </div>
                      <div className="p-2 bg-dark-950 rounded border border-slate-800/60">
                        <span className="text-slate-500 block text-[10px]">Disk Alert:</span>
                        <span className="text-white font-semibold">{profile.thresholds?.disk?.threshold || 90}%</span>
                      </div>
                    </div>

                    {profile.monitoredServices?.length > 0 && (
                      <div className="text-[11px] text-slate-400">
                        <span>Services: </span>
                        <span className="font-mono text-slate-300">
                          {profile.monitoredServices.map(s => s.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: SCHEDULED HEALTH REPORTS --- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Automated Infrastructure Health Reports</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Deliver periodic infrastructure summaries, resource trends, and incident history directly to your email inbox.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateReportNow}
                disabled={generatingReportNow}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{generatingReportNow ? 'Generating...' : 'Run Report Now'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Report Frequency</label>
                <select
                  value={reportConfig.frequency}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-white"
                >
                  <option value="daily">Daily Infrastructure Digest</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Delivery Time (UTC)</label>
                <select
                  value={reportConfig.hour}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, hour: parseInt(e.target.value, 10) }))}
                  className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-white font-mono"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>{`${i.toString().padStart(2, '0')}:00 UTC`}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={reportConfig.isEnabled}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
                  className="rounded bg-dark-900 border-slate-700 text-brand-500 focus:ring-0"
                />
                <span>Enable Automated Scheduled Delivery</span>
              </label>

              <button
                type="button"
                onClick={handleSaveReportConfig}
                disabled={isSavingReport}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
              >
                {isSavingReport ? 'Saving...' : 'Save Report Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: MAINTENANCE WINDOWS --- */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Scheduled Maintenance Windows</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Suppress alert notifications during planned server maintenance without interrupting continuous telemetry collection.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMaintModal(true)}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Maintenance</span>
              </button>
            </div>

            {maintenanceWindows.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No maintenance windows scheduled.</p>
            ) : (
              <div className="space-y-3">
                {maintenanceWindows.map(w => (
                  <div key={w._id} className="p-4 bg-dark-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white">{w.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          w.status === 'active'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-slate-700/40 text-slate-300'
                        }`}>
                          {w.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1 font-mono">
                        {formatDate(w.startTime)} &rarr; {formatDate(w.endTime)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMaintenance(w._id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-dark-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Modal */}
          {showMaintModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-dark-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white">Schedule Maintenance Window</h3>
                  <button type="button" onClick={() => setShowMaintModal(false)} className="text-slate-400">×</button>
                </div>

                <form onSubmit={handleScheduleMaintenance} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Window Title</label>
                    <input
                      type="text"
                      required
                      value={maintTitle}
                      onChange={(e) => setMaintTitle(e.target.value)}
                      placeholder="e.g. Kernel Upgrade & Reboot"
                      className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={maintStart}
                        onChange={(e) => setMaintStart(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">End Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={maintEnd}
                        onChange={(e) => setMaintEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMaintModal(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSchedulingMaint}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold"
                    >
                      {isSchedulingMaint ? 'Scheduling...' : 'Save Window'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 5: SECURITY & IDENTITY --- */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-white">Authenticated Identity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Email Address:</span>
                <span className="text-white font-semibold">{user?.email || 'user@example.com'}</span>
              </div>

              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Role:</span>
                <span className="text-brand-400 font-semibold uppercase">{user?.role || 'user'}</span>
              </div>

              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800 sm:col-span-2">
                <span className="text-slate-500 block text-[11px]">Tenant Isolation ID:</span>
                <span className="text-slate-300 select-all">{user?.tenantId || user?.id || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Outbound Security & SSRF Policy</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Host-Key Verification:</strong> Remote SSH host keys are verified and stored upon onboarding to prevent MITM attacks.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>SSRF Defense:</strong> Loopback (127.0.0.0/8), Link-local (169.254.0.0/16), and cloud metadata endpoints (169.254.169.254) are rejected by default.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Secret Encryption:</strong> SSH private keys and passwords are encrypted using authenticated AES-256-GCM.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
