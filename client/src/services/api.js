const API_BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api/v1';

let tokenGetter = null;

export function setTokenGetter(getter) {
  tokenGetter = getter;
}

async function request(endpoint, options = {}) {
  let token = localStorage.getItem('agentops_token');

  // Obtain fresh token dynamically if a token getter (such as Clerk) is registered
  if (typeof tokenGetter === 'function') {
    try {
      const freshToken = await tokenGetter();
      if (freshToken) {
        token = freshToken;
        localStorage.setItem('agentops_token', freshToken);
      }
    } catch (_) {}
  }

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

  const getHeaders = (authToken) => ({
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...(userEmail ? { 'X-Clerk-User-Email': userEmail } : {}),
    ...(userName ? { 'X-Clerk-User-Name': userName } : {}),
    ...(options.headers || {})
  });

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: getHeaders(token)
  });

  // If unauthorized and dynamic getter is available, force a cache bypass and retry once
  if (response.status === 401 && typeof tokenGetter === 'function') {
    try {
      const forcedToken = await tokenGetter({ skipCache: true });
      if (forcedToken && forcedToken !== token) {
        token = forcedToken;
        localStorage.setItem('agentops_token', forcedToken);
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers: getHeaders(forcedToken)
        });
      }
    } catch (_) {}
  }

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
