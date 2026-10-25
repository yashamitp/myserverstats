# AgentOps REST API Specification (v1)

Base URL: `http://localhost:5000/api/v1`  
Interactive Swagger UI Documentation: `http://localhost:5000/api/v1/docs`  
OpenAPI 3.0 JSON: `http://localhost:5000/api/v1/openapi.json`

All requests except registration, login, and health checks require an `Authorization` header:
```http
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication Endpoints

### Register User
- **Method**: `POST`
- **Path**: `/auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "name": "Jane DevOps",
    "password": "Password123!"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "671b56a1b9f7a90012345678",
        "email": "user@example.com",
        "name": "Jane DevOps",
        "role": "user"
      }
    }
  }
  ```

### User Login
- **Method**: `POST`
- **Path**: `/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (`200 OK`): Token and user object.

### Current User Profile
- **Method**: `GET`
- **Path**: `/auth/me`
- **Response** (`200 OK`): Authenticated user and tenant identification.

---

## 2. Server Management Endpoints

### List Servers
- **Method**: `GET`
- **Path**: `/servers`
- **Response** (`200 OK`): Array of servers owned by authenticated tenant.

### Add Server
- **Method**: `POST`
- **Path**: `/servers`
- **Request Body**:
  ```json
  {
    "name": "Production VPS",
    "hostname": "203.0.113.10",
    "port": 22,
    "osDistro": "ubuntu",
    "authMethod": "key",
    "username": "agentops",
    "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
    "tags": ["web", "production"],
    "monitoringInterval": 10
  }
  ```
- **Response** (`201 Created`): Server object (with encrypted credentials omitted from response).

### Pre-flight Test Connection
- **Method**: `POST`
- **Path**: `/servers/test-connection`
- **Request Body**: Hostname, port, username, authMethod, privateKey or password.
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Connection successful. Detected Ubuntu 22.04 LTS (5.15.0-89-generic)",
    "data": {
      "latencyMs": 42,
      "hostKeyFingerprint": "SHA256:abcd1234efgh5678...",
      "os": {
        "distro": "ubuntu",
        "distroName": "Ubuntu 22.04.3 LTS",
        "version": "22.04",
        "kernel": "5.15.0-89-generic",
        "arch": "x86_64"
      }
    }
  }
  ```

### Get Server By ID
- **Method**: `GET`
- **Path**: `/servers/:id`

### Update Server
- **Method**: `PATCH`
- **Path**: `/servers/:id`
- **Request Body**: `name`, `monitoringInterval`, `tags`, `isMonitoringEnabled`.

### Delete Server
- **Method**: `DELETE`
- **Path**: `/servers/:id`
- **Behavior**: Stops background collection worker, deletes server, purges time-series metrics and associated alerts, and creates audit log entry.

### On-Demand Server Refresh
- **Method**: `POST`
- **Path**: `/servers/:id/refresh`
- **Behavior**: Immediately executes a live probe over SSH and emits results via WebSocket.

---

## 3. Metrics & System Inspection Endpoints

### Latest Telemetry Snapshot
- **Method**: `GET`
- **Path**: `/servers/:id/metrics/current`
- **Response** (`200 OK`): Returns current CPU %, memory, disk, network throughput, and uptime seconds.

### Historical Metrics Time-Series
- **Method**: `GET`
- **Path**: `/servers/:id/metrics/history?range=1h&limit=100`
- **Query Parameters**:
  - `range`: `15m`, `1h`, `6h`, `24h`, `7d`
  - `limit`: Integer (1-1000)

### Top Processes
- **Method**: `GET`
- **Path**: `/servers/:id/processes`
- **Response**: Array of processes sorted by CPU utilization (`pid`, `user`, `cpuPercent`, `memPercent`, `command`).

### Systemd Services
- **Method**: `GET`
- **Path**: `/servers/:id/services`
- **Response**: List of systemd units with active and substate values (`running`, `failed`, `inactive`).

### System Journalctl Logs
- **Method**: `GET`
- **Path**: `/servers/:id/logs?lines=50&severity=warning&service=nginx`
- **Query Parameters**:
  - `lines`: Integer (10 to 200, default 50).
  - `severity`: `emerg`, `alert`, `crit`, `err`, `warning`, `info`, `all`.
  - `service`: Optional systemd unit name.

---

## 4. Alerts Endpoints

### List Alerts
- **Method**: `GET`
- **Path**: `/alerts?status=active`
- **Query Parameters**: `status` (`active` | `resolved` | `acknowledged`), `severity`.

### Acknowledge Alert
- **Method**: `PATCH`
- **Path**: `/alerts/:id/acknowledge`

### Create Alert Rule
- **Method**: `POST`
- **Path**: `/alerts/rules`
- **Request Body**:
  ```json
  {
    "serverId": "671b56a1b9f7a90012345678",
    "name": "High CPU Alert",
    "metricType": "cpu",
    "condition": "gt",
    "threshold": 90,
    "severity": "warning"
  }
  ```

---

## 5. AI Troubleshooting Endpoints

### Interactive Troubleshooting
- **Method**: `POST`
- **Path**: `/ai/chat`
- **Request Body**:
  ```json
  {
    "serverId": "671b56a1b9f7a90012345678",
    "prompt": "Why is CPU usage high and which processes are responsible?"
  }
  ```
- **Response** (`200 OK`): Returns investigation report including executed tool calls, findings, and evidence-grounded summary. If AI is not configured, returns `503 Service Unavailable`.

### Holistic Server Health Analysis
- **Method**: `POST`
- **Path**: `/ai/servers/:id/analyze`
- **Request Body**: `{ "focus": "general" }`

### Past AI Insights
- **Method**: `GET`
- **Path**: `/ai/servers/:id/insights`
