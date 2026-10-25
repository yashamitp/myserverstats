# AgentOps Local Setup & Server Connection Guide

## 1. Prerequisites

- **Node.js**: v18.0.0 or later (tested on Node v22).
- **npm**: v9.0.0 or later.
- **MongoDB**: Optional for local development. If MongoDB is not installed locally, AgentOps automatically boots an embedded in-memory database (`mongodb-memory-server`) with zero setup!
- **Target Linux Host**: Any Ubuntu (20.04+) or Debian (11+) server, VPS (DigitalOcean, AWS EC2, Hetzner, Linode), or local VM (VirtualBox, VMware, WSL2).

---

## 2. Quickstart Installation

### Step 1: Clone and Install Dependencies
From the project root:
```bash
# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client
```

### Step 2: Configure Environment
Copy the example environment template:
```bash
cp .env.example .env
```
Key configuration items in `.env`:
- `JWT_SECRET`: Any random 32+ character string.
- `ENCRYPTION_KEY`: A 64-character hex string (32 bytes) for AES-256-GCM.
- `ALLOW_PRIVATE_NETWORKS`: Set to `true` if testing against local virtual machines on private IP subnets (e.g., `192.168.x.x` or `10.x.x.x`). Set to `false` in public production.

### Step 3: Run the Application
You can run client and server concurrently:

**Terminal 1 (Backend API & Monitoring Worker):**
```bash
npm run dev --prefix server
# Server starts on http://localhost:5000
# REST API: http://localhost:5000/api/v1
# Swagger UI: http://localhost:5000/api/v1/docs
# Health Check: http://localhost:5000/health
```

**Terminal 2 (Frontend React App):**
```bash
npm run dev --prefix client
# Vite dev server starts on http://localhost:3000
```

Open your browser at `http://localhost:3000` to access the application.

---

## 3. Configuring an Ubuntu/Debian Host for Monitoring

To monitor a remote server, we recommend creating a dedicated, least-privileged `agentops` user account that requires no interactive login password or root privileges.

### Step 1: Create Monitoring User on Remote Server
Log into your remote server as root or sudo:
```bash
# Create the user with disabled password login
sudo adduser --disabled-password --gecos "" agentops

# Create the .ssh directory with strict permissions
sudo mkdir -p /home/agentops/.ssh
sudo chmod 700 /home/agentops/.ssh
```

### Step 2: Generate an SSH Keypair (on your workstation)
If you don't already have a dedicated keypair:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/agentops_key -C "agentops-monitoring"
```
This generates:
- `~/.ssh/agentops_key` (Private key - paste this into the AgentOps Add Server form)
- `~/.ssh/agentops_key.pub` (Public key)

### Step 3: Authorize the Public Key on Remote Server
Append the public key content to the remote user's `authorized_keys`:
```bash
# Copy content of ~/.ssh/agentops_key.pub into /home/agentops/.ssh/authorized_keys:
echo "YOUR_PUBLIC_KEY_CONTENT_HERE" | sudo tee -a /home/agentops/.ssh/authorized_keys

# Set strict permissions
sudo chmod 600 /home/agentops/.ssh/authorized_keys
sudo chown -R agentops:agentops /home/agentops/.ssh
```

### Step 4: Verify SSH Connectivity
Test that you can connect from your terminal:
```bash
ssh -i ~/.ssh/agentops_key agentops@YOUR_SERVER_IP
```
Once connected, verify that the read-only monitoring commands work without root:
```bash
cat /proc/meminfo
cat /proc/uptime
df -PB1
ps -eo pid,user,%cpu,%mem,comm | head -n 10
```

---

## 4. Connecting VirtualBox or VMware Local Virtual Machines

If you are running an Ubuntu server VM inside VirtualBox or VMware:

1. **Network Adapter**: Configure the VM network adapter as **Bridged Adapter** (so it receives an IP address on your local network such as `192.168.1.150`), or configure **Host-Only Adapter**.
2. **Environment Setting**: Ensure `ALLOW_PRIVATE_NETWORKS=true` is set in your `.env` file so the outbound network validator permits connections to RFC1918 private subnets for your local lab.
3. Open `http://localhost:3000/servers/new`, enter your VM IP address, username `agentops`, and paste your private key.
4. Click **Test Connection** to verify latency and host key fingerprint before saving.
