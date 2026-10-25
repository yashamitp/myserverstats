const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('agentops_token');
  const userStr = localStorage.getItem('agentops_user');
  let userEmail = '';
  let userName = '';
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      if (parsed?.email) userEmail = parsed.email;
      if (parsed?.name) userName = parsed.name;
    } catch (_) {}
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(userEmail ? { 'X-Clerk-User-Email': userEmail } : {}),
    ...(userName ? { 'X-Clerk-User-Name': userName } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `HTTP ${response.status} error`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // Servers
  getServers: () => request('/servers'),
  getServer: (id) => request(`/servers/${id}`),
  createServer: (body) => request('/servers', { method: 'POST', body: JSON.stringify(body) }),
  updateServer: (id, body) => request(`/servers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteServer: (id) => request(`/servers/${id}`, { method: 'DELETE' }),
  testPreflightConnection: (body) => request('/servers/test-connection', { method: 'POST', body: JSON.stringify(body) }),
  testServerConnection: (id) => request(`/servers/${id}/test-connection`, { method: 'POST' }),
  refreshServer: (id) => request(`/servers/${id}/refresh`, { method: 'POST' }),

  // Metrics & System details
  getCurrentMetrics: (id) => request(`/servers/${id}/metrics/current`),
  getMetricHistory: (id, range = '1h') => request(`/servers/${id}/metrics/history?range=${range}`),
  getProcesses: (id) => request(`/servers/${id}/processes`),
  getServices: (id) => request(`/servers/${id}/services`),
  getLogs: (id, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/servers/${id}/logs${q ? `?${q}` : ''}`);
  },

  // Alerts
  getAlerts: (status) => request(`/alerts${status ? `?status=${status}` : ''}`),
  getServerAlerts: (serverId) => request(`/servers/${serverId}/alerts`),
  createAlertRule: (body) => request('/alerts/rules', { method: 'POST', body: JSON.stringify(body) }),
  acknowledgeAlert: (alertId) => request(`/alerts/${alertId}/acknowledge`, { method: 'PATCH' }),

  // AI
  aiChat: (serverId, prompt) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ serverId, prompt }) }),
  aiAnalyze: (serverId, focus) => request(`/ai/servers/${serverId}/analyze`, { method: 'POST', body: JSON.stringify({ focus }) }),
  aiInsights: (serverId) => request(`/ai/servers/${serverId}/insights`),

  // Audit
  getAuditLogs: () => request('/audit')
};
