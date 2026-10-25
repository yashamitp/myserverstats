const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AgentOps REST API',
    version: '1.0.0',
    description: 'Production REST API for AgentOps AI-Powered Multi-Server Monitoring and Troubleshooting Platform'
  },
  servers: [
    {
      url: '/api/v1',
      description: 'AgentOps API v1'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' }
        }
      },
      Server: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          hostname: { type: 'string' },
          port: { type: 'integer' },
          status: { type: 'string', enum: ['online', 'offline', 'warning', 'error', 'pending'] },
          monitoringMethod: { type: 'string', enum: ['ssh', 'agent'] },
          authMethod: { type: 'string', enum: ['key', 'password'] },
          monitoringInterval: { type: 'integer' },
          lastContact: { type: 'string', format: 'date-time' },
          lastMetrics: { type: 'object' }
        }
      },
      MetricSnapshot: {
        type: 'object',
        properties: {
          cpu: { type: 'object' },
          memory: { type: 'object' },
          disk: { type: 'array' },
          network: { type: 'array' },
          uptime: { type: 'object' }
        }
      },
      Alert: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          serverId: { type: 'string' },
          serverName: { type: 'string' },
          type: { type: 'string' },
          severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
          message: { type: 'string' },
          status: { type: 'string', enum: ['active', 'acknowledged', 'resolved'] }
        }
      }
    }
  },
  security: [
    { BearerAuth: [] }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Application Health Check',
        responses: {
          200: { description: 'Service health status' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'User registered' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate and receive JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Authentication token' } }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current user identity',
        responses: { 200: { description: 'Current authenticated user profile' } }
      }
    },
    '/servers': {
      get: {
        summary: 'List all servers owned by user',
        responses: { 200: { description: 'Array of servers' } }
      },
      post: {
        summary: 'Add a new server to monitor',
        responses: { 201: { description: 'Created server object' } }
      }
    },
    '/servers/test-connection': {
      post: {
        summary: 'Pre-flight test SSH connection parameters',
        responses: { 200: { description: 'Test result with OS details and latency' } }
      }
    },
    '/servers/{id}': {
      get: {
        summary: 'Get server details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Server object' } }
      },
      patch: {
        summary: 'Update server configuration',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated server' } }
      },
      delete: {
        summary: 'Delete server and revoke monitoring',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Server deleted' } }
      }
    },
    '/servers/{id}/test-connection': {
      post: {
        summary: 'Test connection of an existing server',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Connectivity test results' } }
      }
    },
    '/servers/{id}/refresh': {
      post: {
        summary: 'Immediately collect latest metrics for this server',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated metrics' } }
      }
    },
    '/servers/{id}/metrics/current': {
      get: {
        summary: 'Get latest metrics snapshot',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Latest metrics' } }
      }
    },
    '/servers/{id}/metrics/history': {
      get: {
        summary: 'Get historical metric samples',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'range', in: 'query', schema: { type: 'string', enum: ['15m', '1h', '6h', '24h', '7d'] } }
        ],
        responses: { 200: { description: 'Metric samples array' } }
      }
    },
    '/servers/{id}/processes': {
      get: {
        summary: 'Get top processes by CPU/memory',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Process list' } }
      }
    },
    '/servers/{id}/services': {
      get: {
        summary: 'Get systemd services status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Services list' } }
      }
    },
    '/servers/{id}/logs': {
      get: {
        summary: 'Get filtered journalctl logs',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'lines', in: 'query', schema: { type: 'integer' } },
          { name: 'service', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Log entries' } }
      }
    },
    '/alerts': {
      get: {
        summary: 'List user alerts',
        responses: { 200: { description: 'Alerts array' } }
      }
    },
    '/alerts/rules': {
      post: {
        summary: 'Create an alert rule',
        responses: { 201: { description: 'Created rule' } }
      }
    },
    '/alerts/{id}/acknowledge': {
      patch: {
        summary: 'Acknowledge an active alert',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Acknowledged alert' } }
      }
    },
    '/ai/chat': {
      post: {
        summary: 'Interactive AI troubleshooting with tool calling',
        responses: { 200: { description: 'Investigation report' } }
      }
    },
    '/ai/servers/{id}/analyze': {
      post: {
        summary: 'Run automated health diagnostic on server',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Analysis report' } }
      }
    },
    '/ai/servers/{id}/insights': {
      get: {
        summary: 'Get past AI investigations for server',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Past reports' } }
      }
    }
  }
};

module.exports = openapiSpec;
