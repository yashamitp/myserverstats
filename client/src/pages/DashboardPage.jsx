import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import ServerCard from '../components/ServerCard';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import {
  Server,
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Bell,
  Search,
  Plus,
  RefreshCw
} from 'lucide-react';

export default function DashboardPage() {
  const { setServerCount, setAlertCount } = useOutletContext() || {};
  const { liveServerMetrics } = useSocket();

  const [servers, setServers] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshingMap, setRefreshingMap] = useState({});

  const fetchDashboardData = async () => {
    try {
      const [serversRes, alertsRes] = await Promise.all([
        api.getServers(),
        api.getAlerts('active')
      ]);

      setServers(serversRes.data || []);
      setActiveAlerts(alertsRes.data || []);

      if (setServerCount) setServerCount(serversRes.data?.length || 0);
      if (setAlertCount) setAlertCount(alertsRes.data?.length || 0);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Merge latest WebSocket metrics into local server objects
  const mergedServers = servers.map((s) => {
    const live = liveServerMetrics[s._id];
    if (live) {
      return {
        ...s,
        status: live.status || s.status,
        lastMetrics: {
          ...(s.lastMetrics || {}),
          ...live
        },
        lastContact: live.updatedAt || s.lastContact
      };
    }
    return s;
  });

  const handleRefreshServer = async (serverId) => {
    setRefreshingMap((prev) => ({ ...prev, [serverId]: true }));
    try {
      await api.refreshServer(serverId);
      await fetchDashboardData();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshingMap((prev) => ({ ...prev, [serverId]: false }));
    }
  };

  // Calculate Aggregates
  const totalCount = mergedServers.length;
  const onlineCount = mergedServers.filter((s) => s.status === 'online').length;
  const offlineCount = mergedServers.filter((s) => s.status === 'offline').length;
  const warningCount = mergedServers.filter((s) => s.status === 'warning').length;

  const reportingServers = mergedServers.filter(
    (s) => s.status === 'online' && s.lastMetrics?.cpu?.usagePercent !== undefined
  );

  const avgCpu = reportingServers.length > 0
    ? (reportingServers.reduce((sum, s) => sum + (s.lastMetrics.cpu.usagePercent || 0), 0) / reportingServers.length).toFixed(1)
    : '0.0';

  const avgMem = reportingServers.length > 0
    ? (reportingServers.reduce((sum, s) => sum + (s.lastMetrics.memory?.usagePercent || 0), 0) / reportingServers.length).toFixed(1)
    : '0.0';

  // Filter servers
  const filteredServers = mergedServers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.hostname.toLowerCase().includes(search.toLowerCase()) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));

    if (!matchesSearch) return false;

    if (statusFilter === 'online') return s.status === 'online';
    if (statusFilter === 'offline') return s.status === 'offline';
    if (statusFilter === 'warning') return s.status === 'warning';
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <SkeletonLoader count={6} type="list" />
        </div>
        <SkeletonLoader count={3} type="card" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <MetricCard
          title="Total Servers"
          value={totalCount}
          subtitle="Registered nodes"
          icon={Server}
          color="indigo"
        />
        <MetricCard
          title="Online"
          value={onlineCount}
          subtitle="Reporting live"
          icon={Activity}
          color="emerald"
        />
        <MetricCard
          title="Offline"
          value={offlineCount}
          subtitle="Unreachable"
          icon={AlertTriangle}
          color="rose"
        />
        <MetricCard
          title="Avg CPU"
          value={avgCpu}
          unit="%"
          percent={parseFloat(avgCpu)}
          subtitle="Online nodes"
          icon={Cpu}
          color="cyan"
        />
        <MetricCard
          title="Avg RAM"
          value={avgMem}
          unit="%"
          percent={parseFloat(avgMem)}
          subtitle="Online nodes"
          icon={Database}
          color="indigo"
        />
        <MetricCard
          title="Active Alerts"
          value={activeAlerts.length}
          subtitle="Needs review"
          icon={Bell}
          color={activeAlerts.length > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Main Server Explorer Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-dark-850 border border-slate-800 p-1 rounded-xl text-xs w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'all' ? 'bg-dark-750 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Nodes ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('online')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'online' ? 'bg-dark-750 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Online ({onlineCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('offline')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'offline' ? 'bg-dark-750 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Offline ({offlineCount})
          </button>
          {warningCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'warning' ? 'bg-dark-750 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Warning ({warningCount})
            </button>
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search servers or tags..."
              className="w-full pl-9 pr-3 py-2 bg-dark-850 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <Link
            to="/servers/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Server</span>
          </Link>
        </div>
      </div>

      {/* Servers Grid or Empty State */}
      {totalCount === 0 ? (
        <EmptyState />
      ) : filteredServers.length === 0 ? (
        <div className="bg-dark-850 border border-slate-800/80 rounded-xl p-12 text-center text-slate-400 text-xs">
          No servers found matching query "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServers.map((server) => (
            <ServerCard
              key={server._id}
              server={server}
              onRefresh={handleRefreshServer}
              isRefreshing={Boolean(refreshingMap[server._id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}
