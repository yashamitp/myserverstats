const { z } = require('zod');

// Auth Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(100),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100)
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// Server Schemas
const createServerSchema = z.object({
  name: z.string().min(2, 'Server name must be at least 2 characters').max(100),
  hostname: z.string().min(1, 'Hostname or IP is required').max(255),
  port: z.number().int().min(1).max(65535).default(22),
  osDistro: z.enum(['ubuntu', 'debian', 'other']).default('ubuntu'),
  monitoringMethod: z.enum(['ssh', 'agent']).default('ssh'),
  authMethod: z.enum(['key', 'password']).default('key'),
  username: z.string().min(1, 'SSH username is required').max(64).default('agentops'),
  privateKey: z.string().max(16384).optional(),
  password: z.string().max(256).optional(),
  keyPassphrase: z.string().max(256).optional(),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  monitoringInterval: z.number().int().min(5).max(300).default(10)
}).refine((data) => {
  if (data.monitoringMethod === 'ssh') {
    if (data.authMethod === 'password') {
      return Boolean(data.password && data.password.trim().length > 0);
    }
    if (data.authMethod === 'key') {
      return Boolean(data.privateKey && data.privateKey.trim().length > 0);
    }
  }
  return true;
}, {
  message: 'Credentials must match chosen authMethod (password required for password auth, privateKey required for key auth)',
  path: ['authMethod']
});

const updateServerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  hostname: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  monitoringInterval: z.number().int().min(5).max(300).optional(),
  isMonitoringEnabled: z.boolean().optional(),
  username: z.string().min(1).max(64).optional(),
  authMethod: z.enum(['key', 'password']).optional(),
  privateKey: z.string().max(16384).optional(),
  password: z.string().max(256).optional(),
  keyPassphrase: z.string().max(256).optional()
});

const testConnectionSchema = z.object({
  hostname: z.string().min(1, 'Hostname or IP is required').max(255),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1, 'Username is required').default('agentops'),
  authMethod: z.enum(['key', 'password']).default('key'),
  privateKey: z.string().optional(),
  password: z.string().optional(),
  keyPassphrase: z.string().optional()
});

// Alert Rule Schemas
const createAlertRuleSchema = z.object({
  serverId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid server ID').nullable().optional(),
  name: z.string().min(2).max(100),
  metricType: z.enum(['cpu', 'memory', 'disk', 'status', 'stale_metrics', 'service']),
  condition: z.enum(['gt', 'lt', 'eq', 'ne']).default('gt'),
  threshold: z.number(),
  durationSec: z.number().int().min(5).max(3600).default(30),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  serviceName: z.string().max(100).optional(),
  isEnabled: z.boolean().default(true)
});

const updateAlertRuleSchema = createAlertRuleSchema.partial();

// Query Schemas
const metricHistoryQuerySchema = z.object({
  range: z.enum(['15m', '1h', '6h', '24h', '7d']).default('1h'),
  limit: z.coerce.number().int().min(1).max(1000).default(100)
});

const logQuerySchema = z.object({
  lines: z.coerce.number().int().min(10).max(500).default(50),
  service: z.string().max(100).optional(),
  severity: z.enum(['emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug', 'all']).default('all')
});

// AI Schemas
const aiChatSchema = z.object({
  serverId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid server ID'),
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000)
});

const aiAnalyzeSchema = z.object({
  focus: z.enum(['general', 'cpu', 'memory', 'disk', 'network', 'services', 'logs']).default('general')
});

module.exports = {
  registerSchema,
  loginSchema,
  createServerSchema,
  updateServerSchema,
  testConnectionSchema,
  createAlertRuleSchema,
  updateAlertRuleSchema,
  metricHistoryQuerySchema,
  logQuerySchema,
  aiChatSchema,
  aiAnalyzeSchema
};
