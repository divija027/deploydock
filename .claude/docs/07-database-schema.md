# Database Schema (Prisma + SQLite)

## Install

```bash
pnpm add prisma @prisma/client
pnpm prisma init --datasource-provider sqlite
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

---

## Full Schema

**`prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ── Auth Models (required by NextAuth PrismaAdapter) ─────────────────────────

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  password      String?   // bcrypt hash — only for credentials provider
  role          String    @default("viewer") // "admin" | "developer" | "viewer"
  createdAt     DateTime  @default(now()) @map("created_at")

  accounts    Account[]
  sessions    Session[]
  deployments Deployment[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ── App-Specific Models ──────────────────────────────────────────────────────

model Deployment {
  id          String   @id @default(cuid())
  appName     String   @map("app_name")
  imageTag    String   @map("image_tag")
  status      String   // "building" | "success" | "failed"
  triggeredBy String   @map("triggered_by") // "webhook" | "manual"
  logs        String?  // full build output text
  userId      String?  @map("user_id")
  createdAt   DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([appName])
  @@index([createdAt])
  @@map("deployments")
}

model AppConfig {
  id        String   @id @default(cuid())
  appName   String   @unique @map("app_name")
  envVars   String   @default("[]") @map("env_vars")
  // envVars stored as JSON array: [{"key":"PORT","value":"3000"},...]
  domain    String?
  port      Int?
  repoUrl   String?  @map("repo_url")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("app_configs")
}
```

---

## Migration Commands

```bash
# Create and apply initial migration
pnpm prisma migrate dev --name init

# After any schema change
pnpm prisma migrate dev --name <description>

# Apply migrations in production (no dev prompt)
pnpm prisma migrate deploy

# Open Prisma Studio (GUI to browse data)
pnpm prisma studio

# Reset DB (DEV ONLY — drops all data)
pnpm prisma migrate reset
```

---

## Prisma Client Singleton

**`lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

// Prevent multiple client instances in Next.js development (hot-reload)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## Example Queries

### List recent deployments for an app
```typescript
const deployments = await prisma.deployment.findMany({
  where: { appName: 'my-app' },
  orderBy: { createdAt: 'desc' },
  take: 10,
  include: { user: { select: { name: true } } }
});
```

### Upsert app configuration
```typescript
await prisma.appConfig.upsert({
  where: { appName },
  update: { envVars: JSON.stringify(envArray), port, domain },
  create: { appName, envVars: JSON.stringify(envArray), port, domain }
});
```

### Mark deployment as failed
```typescript
await prisma.deployment.update({
  where: { id: deploymentId },
  data: {
    status: 'failed',
    logs: existingLogs + '\nFATAL: Build failed'
  }
});
```

### Get all users (admin page)
```typescript
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true, role: true, createdAt: true },
  orderBy: { createdAt: 'desc' }
});
```

---

## AppConfig.envVars Format

Stored as a JSON string (SQLite has no native JSON column):

```typescript
// In code, always parse/stringify
const envVars: Array<{ key: string; value: string }> = JSON.parse(config.envVars);

// When saving:
await prisma.appConfig.update({
  where: { appName },
  data: { envVars: JSON.stringify(envVars) }
});

// When passing to Docker:
const dockerEnv = envVars.map(e => `${e.key}=${e.value}`);
// → ["PORT=3000", "NODE_ENV=production"]
```

---

## `.env.local` for Database

```bash
# SQLite file path — stored in prisma/ directory
DATABASE_URL="file:./prisma/dev.db"
```

> Add `prisma/dev.db` to `.gitignore`.

---

## Backup Strategy (for report)

SQLite is a single file. Backup = copy the file.

```bash
# Simple backup script (run via cron or scheduled task)
cp prisma/dev.db "backups/dev-$(date +%Y%m%d-%H%M%S).db"
```

For the report, mention that production would use PostgreSQL (change one line in schema.prisma) with proper backup tooling.
