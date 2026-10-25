# AgentOps Troubleshooting & Diagnostic Guide

## 1. Common SSH Connection Errors

### Error: "Connection rejected: Private network addresses (RFC1918) are prohibited"
- **Cause**: By default, AgentOps blocks private IP ranges (`192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`) to prevent SSRF against internal infrastructure in production.
- **Solution**: If you are connecting to a local VirtualBox, VMware, or home lab VM, set `ALLOW_PRIVATE_NETWORKS=true` in your `.env` file and restart the backend server.

### Error: "Authentication failed: Invalid credentials or key"
- **Cause**: The remote SSH daemon rejected the supplied credentials.
- **Diagnostics**:
  1. Verify the remote user exists: `id agentops`.
  2. Check remote permissions:
     ```bash
     chmod 700 /home/agentops/.ssh
     chmod 600 /home/agentops/.ssh/authorized_keys
     chown -R agentops:agentops /home/agentops/.ssh
     ```
  3. Verify the public key was copied without line-wrap breaks.
  4. Ensure SSH daemon permits public key authentication in `/etc/ssh/sshd_config`:
     ```
     PubkeyAuthentication yes
     ```
     Then restart sshd: `sudo systemctl restart ssh` or `sudo systemctl restart sshd`.

### Error: "Connection timed out after 8000ms"
- **Cause**: Outbound network timeout reaching target host on the specified port.
- **Diagnostics**:
  1. Check if the target VPS firewall (UFW, iptables, AWS Security Group, Hetzner Firewall) allows inbound connections on the configured port.
  2. Test ping or port reachability from your host:
     ```bash
     nc -zv YOUR_SERVER_IP 22
     ```
  3. Increase `MAX_SSH_TIMEOUT_MS=12000` in `.env` if operating over high-latency satellite or mobile connections.

### Error: "Host key mismatch detected!"
- **Cause**: The server's public SSH host key fingerprint changed since the server was first registered. This can indicate an OS reinstallation, server replacement, or a Man-In-The-Middle attack.
- **Solution**: If the host was reinstalled legitimately, update the host key fingerprint via the Server Settings tab or re-add the server.

---

## 2. Telemetry & Metric Questions

### Why does memory utilization differ from the output of `free -m`?
- AgentOps parses `/proc/meminfo` and uses `MemAvailable` rather than `MemFree`. Modern Linux kernels utilize unused RAM for disk caching and buffer space; this memory is immediately reclaimable by applications when needed.
- `Used Memory = MemTotal - MemAvailable`. This provides an accurate reflection of actual memory pressure rather than falsely treating cached memory as exhausted RAM.

### How is CPU utilization calculated?
- Rather than displaying instantaneous load averages (which measure queued tasks rather than core time), AgentOps takes two samples from `/proc/stat` across a fixed interval:
  $$\text{Usage \%} = \frac{\Delta\text{Active}}{\Delta\text{Total}} \times 100$$
  where $\text{Active} = \text{user} + \text{nice} + \text{system} + \text{irq} + \text{softirq} + \text{steal}$.

---

## 3. AI Troubleshooting Assistant

### Issue: "AI troubleshooting service is not configured"
- **Cause**: The AI Assistant tab is opened, but no LLM provider key has been configured on the backend.
- **Design Principle**: AgentOps never fabricates synthetic AI diagnostic answers. If AI is not configured, the platform reports this honestly while regular server monitoring continues without interruption.
- **Solution**: Add your LLM credentials to `.env`:
  ```bash
  AI_PROVIDER=openai
  AI_API_KEY=sk-proj-your-key-here
  AI_MODEL=gpt-4o-mini
  ```
  Restart the server. The AI will immediately be able to execute read-only tools on your servers.

---

## 4. WebSocket & Real-Time Sync

### Issue: Indicator shows "Reconnecting..."
- **Cause**: The browser lost its persistent WebSocket connection to the backend.
- **Diagnostics**:
  1. Verify the backend process is running: `curl http://localhost:5000/health`.
  2. If using a reverse proxy (Nginx or Cloudflare), verify that WebSocket upgrade headers are passed:
     ```nginx
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "Upgrade";
     ```
