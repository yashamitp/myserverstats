# AgentOps System Architecture & Design Specification

## 1. High-Level Overview

AgentOps is an AI-powered, multi-tenant Linux server monitoring and automated troubleshooting SaaS platform. It decouples high-frequency background server telemetry collection from dashboard rendering, ensuring that the user interface remains responsive and instant without blocking on remote SSH connections.

```
                      +-----------------------------+
                      |     React SPA Client        |
                      |  (Vite + Tailwind + Recharts|
                      +--------------+--------------+
                                     |
                         HTTPS / WSS | Socket.IO
                                     v
                      +-----------------------------+
                      |     Express API Gateway     |
                      |  - Auth & Tenant Validation |
                      |  - SSRF & Outbound Policy   |
                      |  - OpenAPI 3.0 Documentation|
                      +-------+--------------+------+
                              |              |
           +------------------+              +-------------------+
           |                                                     |
           v                                                     v
+-----------------------+                             +--------------------+
|  Background Worker    |                             |  AI Troubleshooter |
|  - Overlap Lock Map   |                             |  - 10 Auth Tools   |
|  - SSH2 Collector     |                             |  - LLM Tool Calling|
|  - Parser Engine      |                             |  - Evidence Ground |
+----------+------------+                             +---------+----------+
           |                                                    |
           v                                                    v
+-----------------------+                             +--------------------+
|   MongoDB Database    |                             |   Remote Linux     |
|   - Multi-tenant Docs |<----------------------------|   Ubuntu / Debian  |
|   - Time-series TTL   |                             |   Target Nodes     |
+-----------------------+                             +--------------------+
```

---

## 2. Component Subsystems

### 2.1 Frontend Client (`client/`)
- **Technology**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, Socket.IO Client.
- **Design Language**: Dark-first technical aesthetic (`#07090E`, `#0B0F19`, `#141D33`, `#1E293B`) optimized for information density, system administration, and zero decorative clutter.
- **State & Real-Time**: Context-based authentication (`AuthContext`) and real-time event streaming (`SocketContext`). When a server is inspected, the client subscribes to that server's isolated WebSocket room (`server:${id}`) for live metric updates without manual polling.

### 2.2 API Server & Middleware (`server/src/`)
- **Layered Architecture**: Routes -> Controllers -> Services -> Security & Parsers -> Database Models.
- **Security Middleware**:
  - `helmet`: Secure HTTP headers.
  - `cors`: Explicit origin allowlisting.
  - `rateLimiter`: Tiered rate limiting (300 req/15min general, 30 req/15min for sensitive actions like SSH testing).
  - `auth`: Multi-tenant token verification (JWT + optional Clerk JWKS).
  - `authorizeServer`: Guarantees that any server operation matches `{ _id: serverId, tenantId: user.tenantId }`. Never relies on client-provided IDs.
  - `validate`: Zod-based request payload validation.

### 2.3 Monitoring Subsystem & Adapter Pattern
- **Collector Abstraction (`monitoringAdapter.js`)**: Encapsulates collection behind an adapter interface (`IMonitoringCollector`). Currently implements `SshMonitoringCollector` using Node.js `ssh2`, allowing transparent migration to a future outbound-connecting monitoring agent without changing database models or controllers.
- **Read-Only Commands (`commands.js`)**: A strictly fixed allowlist of safe Linux queries:
  - System Snapshot: `cat /proc/uptime`, `cat /proc/meminfo`, `cat /proc/loadavg`, `/proc/stat`, `df -PB1`, `cat /proc/net/dev`.
  - Processes: `ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu --no-headers | head -n 50`.
  - Services: `systemctl list-units --type=service --all --no-legend --no-pager`.
  - Logs: `journalctl -n <lines> --no-pager -o short-iso` with service and severity flags.
- **Security Principle**: Neither the frontend nor the AI model can execute arbitrary shell commands.

### 2.4 Background Monitoring Worker (`monitoringWorker.js`)
- Runs as a persistent background process.
- Evaluates servers due for polling based on each server's configured interval (5s to 300s).
- **Concurrency Locks**: Utilizes an in-memory `Set` of active `serverId`s to prevent overlapping SSH sessions for the same host.
- **Fault Recovery**: Tracks consecutive failures. If a node fails twice consecutively, its status transitions to `offline` and an `unreachable` critical alert is dispatched.

### 2.5 Real-Time WebSocket Pipeline (`socketHandler.js`)
- Authenticates incoming socket connections with Bearer token.
- Joins clients to their private tenant room (`tenant:${tenantId}`).
- Enforces strict server authorization before joining per-server rooms (`server:${serverId}`).
- Emits real-time events:
  - `server:metrics`: Live metric snapshots.
  - `server:status`: Online / Offline / Warning status changes.
  - `alert:created`: New threshold violations.
  - `alert:resolved`: Auto-resolved alerts.

### 2.6 Alerting Engine (`alertService.js`)
- **Threshold Evaluation**: Inspects CPU %, Memory %, Disk mount %, and service status against configured `AlertRule` records.
- **Deduplication**: If an active alert already exists for a server and type, updates triggering value without creating duplicate notifications.
- **Auto-Resolution**: When telemetry values fall back below configured thresholds, marks alerts as `resolved`, timestamps resolution, and notifies connected clients.

### 2.7 AI Troubleshooting Engine (`aiService.js`)
- **Provider-Independent Interface**: Uses standard OpenAI-compatible tool-calling specification (compatible with OpenAI, Azure OpenAI, Gemini, Anthropic proxies, and local Ollama).
- **Strictly Grounded Tools**: 10 read-only inspection tools:
  - `get_server_overview`
  - `get_cpu_metrics`
  - `get_memory_metrics`
  - `get_disk_metrics`
  - `get_network_metrics`
  - `get_top_processes`
  - `get_service_status`
  - `get_recent_logs`
  - `get_metric_history`
  - `get_active_alerts`
- **Tenant Scope Enforcement**: Every tool execution explicitly validates tenant ownership before accessing any database record or executing an SSH command.
- **Honest Feedback**: Returns structured 503 errors if AI credentials are not configured; never fabricates mock diagnostic output.
