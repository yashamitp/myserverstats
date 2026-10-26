const env = require('../config/env');
const Server = require('../models/Server');
const Metric = require('../models/Metric');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const AuditEvent = require('../models/AuditEvent');
const { getMonitoringCollector } = require('../services/monitoringAdapter');
const logger = require('../config/logger');

// Available tool definitions declared for the LLM
const TOOLS_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_server_overview',
      description: 'Get server operating system, status, uptime, and hardware profile.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_cpu_metrics',
      description: 'Get latest CPU utilization percentage, 1/5/15m load averages, and core count.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_memory_metrics',
      description: 'Get latest RAM total, used, free, available, swap, and usage percentages.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_disk_metrics',
      description: 'Get mounted filesystems, total capacity, used space, and partition utilization percentages.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_network_metrics',
      description: 'Get network interface throughput rates, rx/tx counters, and error/dropped packet stats.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_top_processes',
      description: 'Get the top 20 active processes sorted by CPU and memory consumption.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_service_status',
      description: 'Inspect status of systemd services running or failed on the server.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_logs',
      description: 'Fetch recent filtered system journalctl log entries to diagnose system errors.',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', description: 'Optional systemd service unit name to filter' },
          severity: { type: 'string', enum: ['emerg', 'alert', 'crit', 'err', 'warning', 'info', 'all'], description: 'Log severity level' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_metric_history',
      description: 'Get historical metric samples over the past 1 hour for trend and spike analysis.',
      parameters: {
        type: 'object',
        properties: {
          points: { type: 'number', description: 'Number of recent data points to fetch (max 60)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_active_alerts',
      description: 'Get currently active threshold alerts for this server.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
];

class AIService {
  isConfigured() {
    return Boolean(env.AI_API_KEY && env.AI_API_KEY.trim() !== '');
  }

  /**
   * Safe execution of individual monitoring tool, strictly validating tenant and server permissions
   */
  async executeTool(toolName, args, server, tenantId) {
    // Audit tool execution
    await AuditEvent.create({
      tenantId,
      actorId: 'ai-assistant',
      action: 'ai.tool_executed',
      resourceType: 'server',
      resourceId: server._id.toString(),
      metadata: { toolName, args }
    });

    switch (toolName) {
      case 'get_server_overview': {
        return {
          name: server.name,
          hostname: server.hostname,
          os: server.os,
          status: server.status,
          uptimeSeconds: server.lastMetrics?.uptime?.seconds || 0,
          lastContact: server.lastContact
        };
      }

      case 'get_cpu_metrics': {
        return server.lastMetrics?.cpu || { usagePercent: 0, loadAvg: [0, 0, 0], coreCount: 1 };
      }

      case 'get_memory_metrics': {
        return server.lastMetrics?.memory || { totalBytes: 0, usedBytes: 0, usagePercent: 0 };
      }

      case 'get_disk_metrics': {
        return server.lastMetrics?.disk || [];
      }

      case 'get_network_metrics': {
        return server.lastMetrics?.network || [];
      }

      case 'get_top_processes': {
        try {
          const collector = getMonitoringCollector(server.monitoringMethod);
          const procs = await collector.getProcesses(server);
          return procs.slice(0, 20);
        } catch (e) {
          return { error: `Failed to inspect processes: ${e.message}` };
        }
      }

      case 'get_service_status': {
        try {
          const collector = getMonitoringCollector(server.monitoringMethod);
          const services = await collector.getServices(server);
          // Highlight failed services and key services
          const failed = services.filter(s => s.active === 'failed' || s.sub === 'failed');
          return {
            total: services.length,
            failedServices: failed,
            sample: services.slice(0, 15)
          };
        } catch (e) {
          return { error: `Failed to inspect services: ${e.message}` };
        }
      }

      case 'get_recent_logs': {
        try {
          const collector = getMonitoringCollector(server.monitoringMethod);
          const logs = await collector.getLogs(server, {
            lines: 30,
            service: args?.service,
            severity: args?.severity || 'warning'
          });
          return logs.map(l => l.raw || l.message);
        } catch (e) {
          return { error: `Failed to retrieve logs: ${e.message}` };
        }
      }

      case 'get_metric_history': {
        const points = Math.min(parseInt(args?.points, 10) || 20, 60);
        const history = await Metric.find({ serverId: server._id, tenantId })
          .sort({ timestamp: -1 })
          .limit(points)
          .select('timestamp cpu.usagePercent memory.usagePercent')
          .lean();
        return history.reverse();
      }

      case 'get_active_alerts': {
        const [alerts, incidents] = await Promise.all([
          Alert.find({ serverId: server._id, tenantId, status: 'active' }).lean(),
          Incident.find({ serverId: server._id, tenantId, status: 'active' }).lean()
        ]);
        return { activeAlerts: alerts, activeIncidents: incidents };
      }

      default:
        throw new Error(`Unrecognized tool: ${toolName}`);
    }
  }

  /**
   * Run multi-turn AI investigation using LLM tool calling
   */
  async runInvestigation(server, userPrompt, tenantId, actorId) {
    if (!this.isConfigured()) {
      const err = new Error('AI service is not configured. Set AI_API_KEY in your environment configuration.');
      err.statusCode = 503;
      err.code = 'AI_NOT_CONFIGURED';
      throw err;
    }

    const isWindows = server.os?.distro === 'windows';
    const osDescription = isWindows
      ? `Windows Server (${server.os?.distroName || 'Windows'}, Arch: ${server.os?.arch || 'x86_64'})`
      : `Linux (${server.os?.distroName || server.os?.distro || 'Ubuntu'}, Kernel: ${server.os?.kernel || 'Linux'})`;

    const systemPrompt = `You are AgentOps 2.0 AI, an expert cross-platform infrastructure troubleshooter and systems reliability engineer.
Your task is to investigate issues on the user's remote server "${server.name}" (${server.hostname}, Target Platform: ${osDescription}).

MANDATORY RULES:
1. ONLY make claims based on actual metrics, logs, services, and processes retrieved using your tools.
2. If data is missing or server is offline, clearly distinguish live tool calls from previously cached historical evidence. Never assume missing data equals zero.
3. Never invent or hallucinate metrics, command outputs, or uptime statistics.
4. Distinguish confirmed observations from hypotheses.
5. All operations are strictly read-only diagnostics; do not attempt or suggest destructive commands without explicit operator authorization.
6. Format your final diagnosis with the following structured sections:
   ### 1. Problem Summary
   ### 2. Evidence Collected (Live vs. Historical)
   ### 3. Relevant Timestamps
   ### 4. Likely Root Cause
   ### 5. Confidence and Uncertainty
   ### 6. Alternative Explanations
   ### 7. Recommended Next Steps
   ### 8. Verification Procedure
   ### 9. Limitations (Missing or Stale Telemetry)`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const toolCallsRecord = [];
    const maxSteps = 5;
    let step = 0;
    let finalSummary = '';

    while (step < maxSteps) {
      step++;

      // Call LLM endpoint with strict 25s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let response;
      try {
        response = await fetch(`${env.AI_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.AI_API_KEY}`
          },
          body: JSON.stringify({
            model: env.AI_MODEL,
            messages,
            tools: TOOLS_DEFINITIONS,
            tool_choice: 'auto',
            temperature: 0.2
          }),
          signal: controller.signal
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error('AI Provider request timed out after 25 seconds');
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Provider returned HTTP ${response.status}: ${errText}`);
      }

      const resJson = await response.json();
      const choice = resJson.choices?.[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) {
        throw new Error('Invalid response structure from AI provider');
      }

      messages.push(assistantMessage);

      // Check if tool calls were requested by the model
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const tc of assistantMessage.tool_calls) {
          const fnName = tc.function.name;
          let fnArgs = {};
          try {
            fnArgs = JSON.parse(tc.function.arguments || '{}');
          } catch (_) {}

          logger.info('Executing AI tool call', { tool: fnName, serverId: server._id });

          let toolResult = null;
          try {
            toolResult = await this.executeTool(fnName, fnArgs, server, tenantId);
          } catch (execErr) {
            toolResult = { error: execErr.message };
          }

          toolCallsRecord.push({
            tool: fnName,
            params: fnArgs,
            resultSummary: toolResult,
            timestamp: new Date()
          });

          // Feed tool response back into the conversation
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult)
          });
        }
      } else {
        // Model provided final answer without further tool calls
        finalSummary = assistantMessage.content || '';
        break;
      }
    }

    // Persist AI investigation
    const investigation = await AIInvestigation.create({
      tenantId,
      serverId: server._id,
      query: userPrompt,
      status: 'completed',
      toolCalls: toolCallsRecord,
      findings: [],
      recommendations: [],
      summary: finalSummary,
      modelUsed: env.AI_MODEL
    });

    return investigation;
  }
}

module.exports = new AIService();
