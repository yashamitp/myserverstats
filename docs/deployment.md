# AgentOps Production Deployment Guide

## 1. Hosting Requirements

AgentOps requires a hosting environment capable of:
1. Running a persistent Node.js process (for the API and background monitoring worker scheduler).
2. Maintaining persistent WebSocket connections (Socket.IO).
3. Outbound TCP connections to monitored servers on port 22 (or configured SSH ports).
4. Connection to a persistent MongoDB instance (e.g. MongoDB Atlas or self-hosted MongoDB 6.0+).

Recommended deployment targets:
- Dedicated VPS (Hetzner, DigitalOcean, Linode, AWS EC2, GCP Compute Engine).
- Container platforms (Render, Railway, Fly.io with persistent process).
- Kubernetes / Docker Swarm with persistent worker replica.

---

## 2. Docker Deployment (Recommended)

AgentOps provides a multi-stage `Dockerfile` and a production `docker-compose.yml`.

### Step 1: Clone Repository on Production Server
```bash
git clone https://github.com/your-org/agentops.git /opt/agentops
cd /opt/agentops
```

### Step 2: Configure Production Environment
Create `.env`:
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://mongodb:27017/agentops
JWT_SECRET=generate_a_64_character_random_string_here
ENCRYPTION_KEY=generate_a_64_character_hex_string_here
ALLOW_PRIVATE_NETWORKS=false
CORS_ORIGIN=https://agentops.yourdomain.com
CLIENT_URL=https://agentops.yourdomain.com
LOG_LEVEL=info

# Optional AI Configuration
AI_PROVIDER=openai
AI_API_KEY=sk-proj-your-api-key
AI_MODEL=gpt-4o-mini
```

### Step 3: Launch with Docker Compose
```bash
docker compose up -d --build
```

Verify services are running:
```bash
docker compose ps
docker compose logs -f agentops-app
```

---

## 3. Reverse Proxy & HTTPS Configuration

### Nginx Configuration (`/etc/nginx/sites-available/agentops`)

```nginx
server {
    listen 80;
    server_name agentops.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name agentops.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/agentops.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agentops.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend and REST API
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Socket.IO Route
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

---

## 4. Health Checks & Monitoring

AgentOps provides a dedicated health endpoint at `/health` and `/api/v1/health`:
```bash
curl https://agentops.yourdomain.com/health
```
Response:
```json
{
  "status": "healthy",
  "service": "agentops-api",
  "version": "1.0.0",
  "timestamp": "2026-10-25T11:45:00.000Z",
  "uptimeSeconds": 86420,
  "database": "connected"
}
```
Uptime monitoring tools (UptimeRobot, BetterUptime, Datadog) should check this endpoint and expect HTTP 200 with `status: "healthy"`.
