import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';
import MetricsChart from '../components/MetricsChart';
import ProcessTable from '../components/ProcessTable';
import ServicesTable from '../components/ServicesTable';
import LogsViewer from '../components/LogsViewer';
import AlertsList from '../components/AlertsList';
import ConsoleTerminal from '../components/ConsoleTerminal';
import EditServerModal from '../components/EditServerModal';
import DeleteServerModal from '../components/DeleteServerModal';
import {
  Server,
  Activity,
  Cpu,
  Database,
  HardDrive,
  Network,
  ListOrdered,
  Layers,
  Terminal,
  TerminalSquare,
  Bell,
  Sparkles,
  Settings,
  RefreshCw,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Send,
  HelpCircle,
  Edit2,
  Key
} from 'lucide-react';
import { formatBytes, formatDuration, formatDate, formatTimeAgo } from '../utils/formatters';

export default function ServerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isConnected, liveServerMetrics, subscribeToServer, unsubscribeFromServer } = useSocket();

  // Server metadata & metrics state
  const [server, setServer] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedRange, setSelectedRange] = useState('1h');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Operational sub-tabs data
  const [processes, setProcesses] = useState([]);
  const [services, setServices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [logOptions, setLogOptions] = useState({ lines: 50, severity: 'all' });
  const [isSubLoading, setIsSubLoading] = useState(false);

  // AI Chat Tab state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiInvestigations, setAiInvestigations] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Settings tab state
  const [editName, setEditName] = useState('');
  const [editInterval, setEditInterval] = useState(10);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch base server metadata
  const fetchServerData = async () => {
    try {
      const res = await api.getServer(id);
      setServer(res.data);
      setEditName(res.data.name);
      setEditInterval(res.data.monitoringInterval || 10);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load server');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch historical metrics for charts
  const fetchHistory = async (range = selectedRange) => {
    try {
      const res = await api.getMetricHistory(id, range);
      setHistory(res.data?.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  // Socket room subscription
  useEffect(() => {
    fetchServerData();
    fetchHistory(selectedRange);

    subscribeToServer(id);

    return () => {
      unsubscribeFromServer(id);
    };
  }, [id, isConnected]);

  // Handle active sub-tab switching
  useEffect(() => {
    if (!server) return;

    if (activeTab === 'processes' && processes.length === 0) {
      loadProcesses();
    } else if (activeTab === 'services' && services.length === 0) {
      loadServices();
    } else if (activeTab === 'logs' && logs.length === 0) {
      loadLogs();
    } else if (activeTab === 'alerts') {
      loadAlerts();
    } else if (activeTab === 'ai') {
      loadAiInsights();
    }
  }, [activeTab]);

  const loadProcesses = async () => {
    setIsSubLoading(true);
    try {
      const res = await api.getProcesses(id);
      setProcesses(res.data?.processes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubLoading(false);
    }
  };

  const loadServices = async () => {
    setIsSubLoading(true);
    try {
      const res = await api.getServices(id);
      setServices(res.data?.services || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubLoading(false);
    }
  };

  const loadLogs = async () => {
    setIsSubLoading(true);
    try {
      const res = await api.getLogs(id, logOptions);
      setLogs(res.data?.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await api.getServerAlerts(id);
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAiInsights = async () => {
    try {
      const res = await api.aiInsights(id);
      setAiInvestigations(res.data?.insights || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.refreshServer(id);
      await Promise.all([fetchServerData(), fetchHistory(selectedRange)]);
    } catch (err) {
      setErrorMsg(err.message || 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRangeChange = (newRange) => {
    setSelectedRange(newRange);
    fetchHistory(newRange);
  };

  const handleAiInvestigate = async (promptToRun) => {
    const prompt = promptToRun || aiPrompt;
    if (!prompt.trim()) return;

    setIsAiLoading(true);
    setAiError('');

    try {
      const res = await api.aiChat(id, prompt);
      setAiInvestigations((prev) => [res.data, ...prev]);
      setAiPrompt('');
    } catch (err) {
      setAiError(err.message || 'AI investigation failed');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await api.updateServer(id, {
        name: editName,
        monitoringInterval: parseInt(editInterval, 10)
      });
      setServer(res.data);
      alert('Server settings saved successfully');
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteServer = async () => {
    if (!window.confirm(`Are you sure you want to remove "${server.name}"? This stops background monitoring immediately.`)) {
      return;
    }
    try {
      await api.deleteServer(id);
      navigate('/dashboard');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-400 font-mono">Loading server telemetry...</span>
      </div>
    );
  }

  if (errorMsg && !server) {
    return (
      <div className="p-8 bg-dark-850 border border-slate-800 rounded-xl text-center">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-white">Server Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 rounded-lg bg-dark-750 text-xs font-semibold text-slate-200"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Merge live socket updates into server metrics
  const live = liveServerMetrics[id];
  const currentMetrics = live || server.lastMetrics;
  const currentStatus = live?.status || server.status;
  const lastContactTime = live?.updatedAt || server.lastContact;

  const cpuPercent = currentMetrics?.cpu?.usagePercent ?? 0;
  const memPercent = currentMetrics?.memory?.usagePercent ?? 0;
  const uptimeSeconds = currentMetrics?.uptime?.seconds ?? 0;
  const diskMounts = currentMetrics?.disk || [];
  const networkIfaces = currentMetrics?.network || [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'cpu', label: 'CPU', icon: Cpu },
    { id: 'memory', label: 'Memory', icon: Database },
    { id: 'disk', label: 'Disk', icon: HardDrive },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'processes', label: 'Processes', icon: ListOrdered },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'console', label: 'Console', icon: TerminalSquare },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles, highlight: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Compact Header */}
      <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{server.name}</h2>
              <StatusBadge status={currentStatus} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-mono text-slate-400">
              <span className="text-slate-300">{server.hostname}:{server.port || 22}</span>
              <span>•</span>
              <span className="capitalize">{server.os?.distroName || server.os?.distro || 'Ubuntu'}</span>
              <span>•</span>
              <span>Kernel: {server.os?.kernel || (server.os?.distro === 'windows' ? 'NT' : 'Linux')}</span>
              <span>•</span>
              <span>Arch: {server.os?.arch || 'x86_64'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right text-xs font-mono text-slate-400 hidden sm:block">
              <div>Uptime: <span className="text-slate-200">{uptimeSeconds ? formatDuration(uptimeSeconds) : 'Unknown'}</span></div>
              <div className="text-[11px] text-slate-500">Updated {formatTimeAgo(lastContactTime)}</div>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 sm:p-2.5 rounded-xl bg-dark-750 hover:bg-dark-700 disabled:opacity-50 text-slate-200 border border-slate-700/60 shadow-sm transition-colors flex items-center gap-1.5 sm:gap-2 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
              <span className="hidden xs:inline">{isRefreshing ? 'Polling...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              title="Edit VM Host & Credentials"
              className="p-2 sm:p-2.5 rounded-xl bg-dark-750 hover:bg-dark-700 text-slate-200 hover:text-brand-300 border border-slate-700/60 shadow-sm transition-colors flex items-center gap-1.5 sm:gap-2 text-xs font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit VM</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Delete Server"
              className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm transition-colors flex items-center gap-1.5 sm:gap-2 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="mt-6 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-3 -mx-2 px-2 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
                } ${tab.highlight && !isActive ? 'text-brand-400 hover:text-brand-300' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="CPU Usage"
              value={cpuPercent}
              unit="%"
              percent={cpuPercent}
              subtitle={`Load: ${currentMetrics?.cpu?.loadAvg?.join(', ') || '0, 0, 0'}`}
              icon={Cpu}
              color="indigo"
            />
            <MetricCard
              title="Memory Usage"
              value={memPercent}
              unit="%"
              percent={memPercent}
              subtitle={`${formatBytes(currentMetrics?.memory?.usedBytes)} / ${formatBytes(currentMetrics?.memory?.totalBytes)}`}
              icon={Database}
              color="cyan"
            />
            <MetricCard
              title="Primary Disk"
              value={diskMounts[0]?.usagePercent || 0}
              unit="%"
              percent={diskMounts[0]?.usagePercent || 0}
              subtitle={`${diskMounts[0]?.mount || '/'} (${formatBytes(diskMounts[0]?.usedBytes)} used)`}
              icon={HardDrive}
              color="emerald"
            />
            <MetricCard
              title="System Uptime"
              value={uptimeSeconds ? formatDuration(uptimeSeconds) : '--'}
              subtitle={`Boot: ${currentMetrics?.uptime?.bootTime ? formatDate(currentMetrics.uptime.bootTime) : 'Recorded'}`}
              icon={Clock}
              color="indigo"
            />
          </div>

          {/* Historical Area Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricsChart
              title="CPU Utilization %"
              data={history.map((h) => ({ timestamp: h.timestamp, value: h.cpu?.usagePercent || 0 }))}
              dataKey="value"
              color="#6366F1"
              unit="%"
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
              domain={[0, 100]}
            />
            <MetricsChart
              title="RAM Utilization %"
              data={history.map((h) => ({ timestamp: h.timestamp, value: h.memory?.usagePercent || 0 }))}
              dataKey="value"
              color="#06B6D4"
              unit="%"
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
              domain={[0, 100]}
            />
          </div>
        </div>
      )}

      {/* Tab 2: CPU */}
      {activeTab === 'cpu' && (
        <div className="space-y-6">
          <MetricsChart
            title="CPU Utilization History"
            data={history.map((h) => ({ timestamp: h.timestamp, value: h.cpu?.usagePercent || 0 }))}
            dataKey="value"
            color="#6366F1"
            unit="%"
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            domain={[0, 100]}
          />

          <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white">CPU Profile & Load Average</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">1-Min Load Average:</span>
                <span className="text-base font-bold text-white">{currentMetrics?.cpu?.loadAvg?.[0] ?? '--'}</span>
              </div>
              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">5-Min Load Average:</span>
                <span className="text-base font-bold text-white">{currentMetrics?.cpu?.loadAvg?.[1] ?? '--'}</span>
              </div>
              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">15-Min Load Average:</span>
                <span className="text-base font-bold text-white">{currentMetrics?.cpu?.loadAvg?.[2] ?? '--'}</span>
              </div>
            </div>

            {currentMetrics?.cpu?.perCore && currentMetrics.cpu.perCore.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 mb-3">Per-Core Utilization</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {currentMetrics.cpu.perCore.map((coreUsage, idx) => (
                    <div key={idx} className="p-2.5 bg-dark-900 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Core #{idx}</span>
                        <span className="text-white font-semibold">{coreUsage}%</span>
                      </div>
                      <div className="w-full bg-dark-750 rounded-full h-1 mt-2 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all"
                          style={{ width: `${coreUsage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: MEMORY */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <MetricsChart
            title="Memory Utilization History"
            data={history.map((h) => ({ timestamp: h.timestamp, value: h.memory?.usagePercent || 0 }))}
            dataKey="value"
            color="#06B6D4"
            unit="%"
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            domain={[0, 100]}
          />

          <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white">Physical RAM & Swap Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Total Memory:</span>
                <span className="text-sm font-bold text-white">{formatBytes(currentMetrics?.memory?.totalBytes)}</span>
              </div>
              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Used Memory:</span>
                <span className="text-sm font-bold text-cyan-400">{formatBytes(currentMetrics?.memory?.usedBytes)}</span>
              </div>
              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Available (Reclaimable):</span>
                <span className="text-sm font-bold text-emerald-400">{formatBytes(currentMetrics?.memory?.availableBytes)}</span>
              </div>
              <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Swap Usage:</span>
                <span className="text-sm font-bold text-amber-400">
                  {currentMetrics?.memory?.swapPercent ?? 0}% ({formatBytes(currentMetrics?.memory?.swapUsedBytes)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: DISK */}
      {activeTab === 'disk' && (
        <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-white">Mounted Filesystem Partitions</h3>
          {diskMounts.length === 0 ? (
            <p className="text-xs text-slate-500">No disk partition telemetry collected yet.</p>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              {diskMounts.map((mount) => (
                <div key={mount.mount} className="p-4 bg-dark-900 rounded-xl border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-white text-sm">{mount.mount}</span>
                      <span className="text-slate-500 text-[11px] ml-2 font-sans">({mount.filesystem})</span>
                    </div>
                    <div className="text-slate-300 text-xs">
                      <span className="font-bold text-white">{formatBytes(mount.usedBytes)}</span> used of{' '}
                      <span className="font-bold text-white">{formatBytes(mount.totalBytes)}</span> ({mount.usagePercent}%)
                    </div>
                  </div>
                  <div className="w-full bg-dark-750 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        mount.usagePercent > 85 ? 'bg-rose-500' : mount.usagePercent > 70 ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${mount.usagePercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: NETWORK */}
      {activeTab === 'network' && (
        <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-white">Network Interfaces Throughput</h3>
          {networkIfaces.length === 0 ? (
            <p className="text-xs text-slate-500">No network interface telemetry collected yet.</p>
          ) : (
            <div className="overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-dark-900/60 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Interface</th>
                    <th className="py-2.5 px-3">Rx Rate</th>
                    <th className="py-2.5 px-3">Tx Rate</th>
                    <th className="py-2.5 px-3">Total Rx</th>
                    <th className="py-2.5 px-3">Total Tx</th>
                    <th className="py-2.5 px-3">Errors / Drops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {networkIfaces.map((iface) => (
                    <tr key={iface.interface} className="hover:bg-dark-800/30">
                      <td className="py-2.5 px-3 font-bold text-white">{iface.interface}</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-semibold">
                        {formatBytes(iface.rxRateBytesPerSec || 0)}/s
                      </td>
                      <td className="py-2.5 px-3 text-indigo-400 font-semibold">
                        {formatBytes(iface.txRateBytesPerSec || 0)}/s
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{formatBytes(iface.rxBytes)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{formatBytes(iface.txBytes)}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {iface.errors || 0} err / {iface.dropped || 0} drop
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: PROCESSES */}
      {activeTab === 'processes' && (
        <ProcessTable processes={processes} isLoading={isSubLoading} />
      )}

      {/* Tab 7: SERVICES */}
      {activeTab === 'services' && (
        <ServicesTable services={services} isLoading={isSubLoading} />
      )}

      {/* Tab 8: LOGS */}
      {activeTab === 'logs' && (
        <LogsViewer
          logs={logs}
          isLoading={isSubLoading}
          onReload={loadLogs}
          options={logOptions}
          onOptionsChange={(opts) => {
            setLogOptions(opts);
            setTimeout(() => loadLogs(), 50);
          }}
        />
      )}

      {/* Tab: CONSOLE */}
      {activeTab === 'console' && (
        <ConsoleTerminal server={server} />
      )}

      {/* Tab 9: ALERTS */}
      {activeTab === 'alerts' && (
        <AlertsList alerts={alerts} onAcknowledge={async (alertId) => {
          await api.acknowledgeAlert(alertId);
          loadAlerts();
        }} />
      )}

      {/* Tab 10: AI ASSISTANT */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">AI Diagnostic Assistant</h3>
                <p className="text-xs text-slate-400">
                  Ask the assistant to investigate problems. It accesses read-only monitoring tools (<code className="text-slate-300 font-mono">top_processes</code>, <code className="text-slate-300 font-mono">recent_logs</code>) to ground its diagnosis in real server measurements.
                </p>
              </div>
            </div>

            {/* Prompt Quick Starters */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                'Why is CPU or memory spiking?',
                'Inspect top active processes for anomalies',
                'Check if any systemd services have failed',
                'Analyze recent warning logs from journalctl'
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAiInvestigate(q)}
                  className="px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-750 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="pt-2">
              <div className="relative">
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask a question about this server's performance, services, or logs..."
                  className="w-full p-3 bg-dark-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  disabled={isAiLoading || !aiPrompt.trim()}
                  onClick={() => handleAiInvestigate()}
                  className="absolute right-3 bottom-3 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAiLoading ? 'Investigating...' : 'Ask AI'}</span>
                </button>
              </div>
            </div>

            {aiError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}
          </div>

          {/* Past Investigations List */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Investigation Reports ({aiInvestigations.length})
            </h4>

            {aiInvestigations.length === 0 ? (
              <div className="p-8 bg-dark-850 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No AI investigations conducted yet for this server.
              </div>
            ) : (
              aiInvestigations.map((inv) => (
                <div key={inv._id} className="bg-dark-850 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-xs font-semibold text-brand-300">"{inv.query}"</span>
                    <span className="text-[11px] font-mono text-slate-500">{formatDate(inv.createdAt)}</span>
                  </div>

                  {/* Tool execution timeline */}
                  {inv.toolCalls && inv.toolCalls.length > 0 && (
                    <div className="p-3 bg-dark-900/80 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Telemetry Inspected by AI:</span>
                      {inv.toolCalls.map((tc, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-brand-400">{tc.tool}</span>
                          <span className="text-slate-500">({Object.keys(tc.params || {}).join(', ') || 'default params'})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Final Markdown Summary */}
                  <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-dark-900/30 p-4 rounded-lg border border-slate-800/40">
                    {inv.summary}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 11: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-dark-850 border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl">
          <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">Server Configuration</h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Server Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Polling Interval (Seconds)</label>
              <input
                type="number"
                min={5}
                max={300}
                value={editInterval}
                onChange={(e) => setEditInterval(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">Default: 10 seconds. Range: 5s - 300s.</span>
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              {isSavingSettings ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>

          {/* VM Credentials & SSH Access Card */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-brand-400" />
                  <span>SSH Credentials & Host Parameters</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update IP address, SSH port, username, authentication keys or password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-brand-600/10 hover:bg-brand-600/20 text-brand-300 border border-brand-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Credentials</span>
              </button>
            </div>

            <div className="p-4 bg-dark-900 rounded-xl border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Host / IP:</span>
                <span>{server.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Port:</span>
                <span>{server.port || 22}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span>{server.username || 'agentops'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auth Method:</span>
                <span className="capitalize">{server.authMethod === 'key' ? 'SSH Private Key (Encrypted)' : 'Password (Encrypted)'}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone: Delete Server */}
          <div className="pt-6 border-t border-rose-500/20">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Danger Zone</h4>
            <p className="text-xs text-slate-400 mt-1">
              Removing this server will permanently revoke monitoring, delete historical telemetry samples, and stop all background collection workers.
            </p>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Server and Revoke Access</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit VM Credentials Modal */}
      <EditServerModal
        server={server}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={(updated) => {
          setServer(updated);
          setEditName(updated.name);
          setEditInterval(updated.monitoringInterval || 10);
        }}
      />

      {/* Delete Server Modal */}
      <DeleteServerModal
        server={server}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleted={() => {
          navigate('/dashboard');
        }}
      />
    </div>
  );
}
