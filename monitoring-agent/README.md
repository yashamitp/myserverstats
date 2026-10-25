# AgentOps Dedicated Linux Monitoring Agent (Architecture & Ingestion Roadmap)

## Overview

The initial release of AgentOps utilizes an agentless SSH-based monitoring adapter (`SshMonitoringCollector`), allowing instant zero-installation monitoring of remote Ubuntu and Debian VPS servers.

To support large-scale deployments where inbound SSH ports cannot be exposed, AgentOps is architected with an adapter pattern (`IMonitoringCollector`) to support a dedicated outbound-connecting daemon: the **AgentOps Monitoring Agent**.

---

## Agent Architecture

```
+-------------------------------------------------------------+
| Customer Server (Behind NAT / Firewall)                     |
|                                                             |
| +---------------------------------------------------------+ |
| | agentops-agent daemon (systemd service)                 | |
| | - Local read-only /proc and systemd collectors          | |
| | - High-frequency sampling (5s intervals)                | |
| | - Signed payload with unique Agent Token                | |
| +----------------------------+----------------------------+ |
+------------------------------|------------------------------+
                               | Outbound HTTPS / WSS
                               | (No inbound open ports required!)
                               v
               +-------------------------------+
               | AgentOps Ingestion Gateway    |
               | - Authenticates Agent Token   |
               | - Validates & Stores Metrics  |
               +-------------------------------+
```

---

## Key Design Principles

1. **Outbound Only (No Inbound Firewall Ports)**:
   The customer server does not need to open port 22 or any inbound ports. The agent initiates an outbound TLS connection over port 443 to the AgentOps API gateway.

2. **Secure Enrollment & Identity**:
   - Each agent is enrolled with a unique, one-time enrollment token generated from the AgentOps web interface.
   - Upon enrollment, AgentOps exchanges the enrollment token for an authenticated mTLS certificate or rotating API key.
   - No shared global secrets exist across customers.

3. **Least Privilege**:
   - The daemon runs under an unprivileged `agentops-agent` system user.
   - It only reads `/proc`, `/sys`, and communicates with systemd over the read-only D-Bus socket.

4. **Fault Tolerance & Local Buffering**:
   - If network connectivity to AgentOps is temporarily interrupted, the agent buffers metrics in local memory (up to 30 minutes) and transmits them with exponential backoff when connectivity resumes.
