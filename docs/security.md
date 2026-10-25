# AgentOps Security Architecture & Threat Model

Security is a primary design tenet of the AgentOps platform. Because users can submit remote network addresses and credentials, rigorous protections are enforced across every layer.

---

## 1. Outbound Network & SSRF Mitigation (`networkValidator.js`)

When users submit hostnames or IP addresses to connect:

1. **Syntax & Port Validation**: Destination ports are restricted to valid ranges (1 to 65535).
2. **Prohibited Address Ranges**: The application inspects both direct IP addresses and DNS-resolved addresses, strictly rejecting:
   - **Cloud Metadata Endpoints**: `169.254.169.254` (AWS, GCP, Azure, OpenStack instance metadata service).
   - **Loopback Destinations**: `127.0.0.0/8`, `localhost`, `::1`.
   - **Link-Local Addresses**: `169.254.0.0/16`, `fe80::/10`.
   - **Multicast & Reserved**: `224.0.0.0/4`, `240.0.0.0/4`, `ff00::/8`.
   - **Private Networks (RFC1918)**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` are blocked by default in production. They can only be enabled explicitly in controlled lab environments via `ALLOW_PRIVATE_NETWORKS=true`.
3. **DNS Rebinding & Dual-Homed Protection**: When a hostname is supplied, `dns.promises.lookup` resolves all IPv4 and IPv6 records (`{ all: true }`). If any record resolves to a restricted IP, the connection is aborted immediately.

---

## 2. SSH Host-Key Verification & Defense-in-Depth

- **Host-Key Fingerprinting**: During initial onboarding (`testSshConnection`), AgentOps captures the remote server's public host-key fingerprint (`SHA256:...`).
- **Strict Verification**: Subsequent connections verify the server's presented host key against the stored fingerprint. Any mismatch triggers an immediate connection rejection, protecting against Man-In-The-Middle (MITM) and DNS spoofing attacks.
- **Strict Timeouts & Truncation**: All SSH command executions are bounded by `MAX_SSH_TIMEOUT_MS` (default 8000ms) and maximum output buffers (512 KB), preventing runaway processes or memory exhaustion.

---

## 3. Cryptographic Storage of Credentials (`crypto.js`)

- **Authenticated Encryption**: Stored SSH private keys, passphrases, and passwords are encrypted using **AES-256-GCM** (Galois/Counter Mode).
- **IV & Tag Integrity**: Every encryption operation uses a unique 96-bit cryptographically secure initialization vector (`crypto.randomBytes(12)`). The ciphertext is stored alongside its 128-bit authentication tag (`iv:tag:ciphertext`). Any payload tampering is detected and throws an authentication error upon decryption.
- **Database Model Projection**: In Mongoose, `credentials` fields (`encryptedPrivateKey`, `encryptedPassword`) are configured with `select: false`. Normal database queries will never return encrypted credentials to controllers or API responses.
- **Response Sanitization**: Controller methods explicitly delete credential attributes before returning server objects to the client.

---

## 4. Multi-Tenant Authorization & Isolation

- **Server-Side Enforcement**: The backend never trusts a `tenantId` or user identifier sent in a request body.
- **Session-Derived Tenant Scope**: All queries are filtered by `req.user.tenantId`, derived exclusively from the verified JWT or Clerk session token:
  ```js
  const server = await Server.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  ```
- **Real-Time Channel Isolation**: Socket.IO channels are isolated into `tenant:${tenantId}` and `server:${serverId}`. Clients must undergo server authorization before joining a server room; metrics are never broadcast globally.

---

## 5. Structured Audit Logging & Secret Masking

- **Immutable Audit Trail**: All server registrations, credential updates, connection tests, alert rule modifications, and AI tool invocations are recorded in the `AuditEvent` collection.
- **Zero-Credential Logging**: A custom Winston log formatter inspects all log metadata and replaces keys containing `password`, `privatekey`, `token`, `secret`, `authorization`, or `bearer` with `[REDACTED]`. Plaintext secrets never appear in server log streams.
