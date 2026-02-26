# CS Concepts for Report & Viva

This file maps each project feature to the underlying Computer Science concept it demonstrates. Use this for your project report, presentation slides, and viva answers.

---

## 1. Operating Systems — Containers & Isolation

### What the project does
- Creates, starts, stops, and monitors Docker containers
- Reads per-container CPU and memory stats from the Docker Stats API

### CS concepts demonstrated

**Linux Namespaces** — Docker uses kernel namespaces to give each container an isolated view of the system:
| Namespace | Isolates |
|-----------|---------|
| `pid` | Process IDs — container has its own PID 1 |
| `net` | Network interfaces, routing, firewall rules |
| `mnt` | Filesystem mount points |
| `uts` | Hostname and domain name |
| `ipc` | IPC objects (semaphores, message queues) |
| `user` | User and group IDs |

**cgroups (Control Groups)** — Limits and meters resource usage per container:
- `cpu.cfs_quota_us` / `cpu.cfs_period_us` — CPU throttling
- `memory.limit_in_bytes` — RAM ceiling
- `blkio.throttle` — Disk I/O rate limiting

The metrics we stream from `/api/docker/containers/[id]/stats` come directly from cgroup counters via the Docker Engine API.

**Explain in viva**: "A container is not a VM. It shares the host kernel but uses namespaces for isolation and cgroups for resource limits. Our metrics panel reads cgroup data in real-time through the Docker Engine Unix socket."

---

## 2. Computer Networks

### What the project does
- Maps container-to-network relationships (Docker bridge/overlay networks)
- Visualizes port bindings (host port → container port)
- Implements a webhook receiver over HTTP
- Streams data using SSE (HTTP/1.1 persistent connection)

### CS concepts demonstrated

**Docker Networking**:
- **Bridge network** (default): containers on same host can talk via virtual ethernet (`veth`) pairs on a software bridge (`docker0`)
- **Port binding**: kernel's `iptables` NAT rules forward `hostPort` → `containerIP:containerPort`
- **Network namespaces**: each container has its own network stack — own IP, routing table, `lo` interface

**HTTP Protocol**:
- Webhook = standard `POST` request with JSON body + custom headers (`X-Hub-Signature-256`)
- SSE = `GET` request with `Content-Type: text/event-stream` — server keeps connection open and pushes `data: ...\n\n` frames
- SSE framing: each event is `data: <payload>\n\n` — double newline terminates the event

**TCP/Unix Sockets**: dockerode connects to `/var/run/docker.sock` — a Unix domain socket. Same as a TCP socket but in the filesystem; no IP overhead, only accessible locally (a security boundary).

**Explain in viva**: "Docker's networking model uses Linux bridge networking and iptables for port forwarding. Our network topology graph shows which Docker networks each container is attached to, and the IP address assigned to each container within that network."

---

## 3. Databases

### What the project does
- Stores users, sessions, deploy history, and app configs in SQLite
- Uses Prisma ORM for type-safe queries and schema migrations

### CS concepts demonstrated

**Relational Model**:
- Tables: `users`, `deployments`, `app_configs`, `sessions`, `accounts`
- Foreign key: `deployments.user_id → users.id`
- Cascade delete: deleting a user cascades to their accounts and sessions

**ACID Properties** (SQLite guarantees these):
- **Atomicity**: deploy pipeline either creates the record AND updates it to success/failed, never leaves it in an unknown state
- **Consistency**: `email UNIQUE` constraint prevents duplicate user accounts
- **Isolation**: SQLite's WAL (Write-Ahead Log) mode allows concurrent reads with one writer
- **Durability**: SQLite fsync's WAL file to disk — data survives crashes

**ORM vs raw SQL**:
- Prisma generates type-safe client from schema — compile-time error if you query a column that doesn't exist
- Prisma Migrate: declarative schema → generates SQL diff → applies migration → versioned in `prisma/migrations/`

**Explain in viva**: "We use SQLite with Prisma ORM. The schema defines relationships between users and deployments. Prisma Migrate handles schema evolution by generating SQL migration files, which is comparable to version control for database structure."

---

## 4. Security

### What the project does
- HMAC-SHA256 webhook signature verification
- JWT-based session management with role claims
- bcrypt password hashing
- Role-Based Access Control (RBAC) — admin/developer/viewer
- Secrets management (env vars masked in UI, stored as JSON in DB)

### CS concepts demonstrated

**HMAC (Hash-based Message Authentication Code)**:
```
HMAC-SHA256(secret, payload) = signature
```
GitHub computes this and sends it in `X-Hub-Signature-256`. We recompute it and compare with `crypto.timingSafeEqual()` — constant-time comparison prevents timing attacks (attacker can't learn the correct hash by measuring response time character by character).

**bcrypt**:
- Adaptive hash function — designed to be slow (work factor = 2^12 iterations)
- Includes random salt → same password always produces different hash
- Resistant to GPU brute-force (intentionally slow)

**JWT (JSON Web Token)**:
```
header.payload.signature
```
- We store `role` in the payload → no DB lookup needed on every request
- Signed with `NEXTAUTH_SECRET` → server can verify it wasn't tampered with
- Stateless: middleware can check role from token without hitting the database

**RBAC**:
```
Admin   → all operations
Developer → deploy, create, start, stop, edit env
Viewer  → read only (list, logs, metrics)
```
Enforced at the API layer — every mutating route checks `session.user.role`.

**Explain in viva**: "We use JWT with role claims for authorization. The role is embedded in the signed token, so middleware can enforce access control without a database round-trip. Webhook verification uses HMAC with constant-time comparison to prevent timing side-channel attacks."

---

## 5. Real-Time Systems

### What the project does
- Streams container logs live (SSE)
- Streams CPU/memory metrics live at ~1 sample/second (SSE)
- Shows live deploy status as webhook pipeline runs

### CS concepts demonstrated

**Producer-Consumer Pattern**:
- Producer: Docker Engine → pushes log chunks to our `Readable` stream
- Consumer: browser `EventSource` → receives formatted SSE events
- The Node.js event loop acts as the intermediary — non-blocking I/O

**Backpressure**:
- If browser reads slower than Docker writes, Node.js `ReadableStream` buffers data
- `req.signal.abort` → we call `logStream.destroy()` → Docker stops sending → no resource leak

**Event-Driven Architecture**:
- dockerode emits `'data'`, `'end'`, `'error'` events on log/stats streams
- This is Node.js's EventEmitter pattern applied to I/O streams

**SSE vs WebSocket vs Long-Polling**:
| | SSE | WebSocket | Long-Polling |
|--|-----|-----------|-------------|
| Direction | Server → Client | Bidirectional | Server → Client |
| Protocol | HTTP | WS upgrade | HTTP |
| Reconnect | Automatic | Manual | Manual |
| Complexity | Low | Medium | High |

We chose SSE because logs and metrics are server-to-client only, it works through HTTP/2 multiplexing, and it requires zero extra libraries.

**Explain in viva**: "Our log streaming uses Server-Sent Events — a persistent HTTP connection where the server pushes `data:` frames. This is an application of the producer-consumer pattern: the Docker Engine produces log chunks, and our SSE handler forwards them to the browser with minimal buffering."

---

## 6. Software Engineering / DevOps

### What the project does
- Git push → automatic build → deploy pipeline (CI/CD)
- Language auto-detection via buildpack detection
- Container lifecycle management (create/start/stop/remove)

### CS concepts demonstrated

**CI/CD Pipeline**:
```
Code commit → webhook trigger → clone → build → test → deploy → monitor
```
Our pipeline covers: trigger → clone → build → deploy → record result

**Infrastructure as Code** (conceptual):
- `AppConfig` table stores container configuration declaratively
- The deploy function is idempotent — running it twice produces the same result

**Twelve-Factor App** (reference Dokku's inspiration):
1. Codebase — stored in Git
2. Dependencies — declared in package.json/requirements.txt
3. Config — env vars (not hardcoded)
4. Build/release/run — separate pipeline stages
5. Stateless processes — containers are ephemeral

**Explain in viva**: "Our auto-deploy pipeline implements the core of Dokku/Heroku's workflow. On git push, a webhook triggers our server which clones the repo, auto-detects the language using a buildpack approach (checking for package.json, requirements.txt, etc.), generates a Dockerfile if none exists, builds the image, and hot-swaps the running container."

---

## 7. Data Visualization

### What the project does
- D3.js force-directed graph for container network topology
- Recharts line charts for CPU/memory metrics over time

### CS concepts demonstrated

**Force-Directed Graph Layout** (physics simulation):
- **Charge force**: nodes repel each other (like electrons) — prevents overlap
- **Link force**: edges pull connected nodes together — related containers cluster
- **Center force**: gravity toward canvas center — prevents nodes drifting off-screen
- **Collision force**: nodes maintain minimum separation radius

**Alpha (temperature) in simulations**:
- Simulation starts "hot" (alpha=1) — nodes move fast to find layout
- Alpha decays each tick toward 0 — simulation cools and stabilizes
- User drag reheats simulation (alphaTarget=0.3) — allows repositioning

**Time-Series Visualization** (Recharts):
- Rolling window of 60 data points (60 seconds)
- X-axis: time labels; Y-axis: percentage 0–100
- Multiple `<Line>` series on same chart (CPU + memory)

**Explain in viva**: "The network graph uses D3.js force simulation — a physics engine running in the browser. Each node has repulsive charge force and edges have attractive link force. The simulation runs until it reaches a stable minimum-energy layout, similar to how molecules find equilibrium."

---

## 8. System Design

### What the project shows end-to-end

```
User → Browser → Next.js (frontend + API) → Docker Engine
                                          → SQLite
                                          → GitHub (webhooks)
```

**Key design decisions to discuss**:

| Decision | Choice | Reason |
|----------|--------|--------|
| Monorepo | Next.js full-stack | Simpler deployment, shared types |
| Real-time | SSE not WebSocket | Unidirectional, zero extra library |
| DB | SQLite | Zero config, single file, Prisma manages it |
| Docker API | dockerode (SDK) | No shell injection risk, typed, streaming support |
| Auth | JWT + RBAC | Stateless, role in token = no DB on every request |

**Scalability limitations to acknowledge** (shows maturity):
- SQLite: single-writer bottleneck at high concurrency → swap to PostgreSQL for production
- Single Next.js instance: multiple servers would need shared session store (Redis)
- Docker socket: gives full Docker access → in production, use TLS-authenticated Docker daemon or rootless Docker

---

## Report Structure Suggestion

1. **Introduction** — Problem statement: managing Docker containers is complex; existing tools are either too complex (Kubernetes) or too simple (raw CLI)
2. **Related Work** — Dokku, Coolify, Portainer — compare features
3. **System Architecture** — the diagram from `01-architecture.md`
4. **Implementation** — one section per major feature, referencing CS concepts above
5. **Screenshots / Demo** — log viewer, metrics charts, network graph, deploy history
6. **Security Analysis** — HMAC, bcrypt, RBAC, secrets masking
7. **Conclusion & Future Work** — Kubernetes support, multi-server, Tor integration, AI assistant
