# Database Integration — Neon + Prisma 7

## Overview

The app uses **Neon** (serverless PostgreSQL) as its database, accessed via **Prisma 7** ORM. The integration covers three concerns:

1. **Auth persistence** — NextAuth sessions, users, and OAuth accounts stored in DB instead of ephemeral JWTs
2. **Credit tracking** — each user has a `Subscription` row that tracks their tier and how many generation runs they've consumed
3. **Run history** — every generation attempt is recorded with its status and output artifacts

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Database | Neon (serverless Postgres) | Scales to zero, free tier, works on Vercel edge |
| ORM | Prisma 7 | Type-safe queries, migration tooling, NextAuth adapter |
| Auth adapter | `@auth/prisma-adapter` | Wires NextAuth directly to Prisma models |

---

## Environment Variables

Add to `.env.local`:

```env
# Use the non-pooled (direct) connection string from Neon dashboard
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

> **Where to find it:** Neon dashboard → your project → Connection Details → toggle to **"Direct connection"** → copy the connection string.

Prisma reads this via `prisma.config.ts`, which uses `@next/env` to load `.env.local` the same way Next.js does — so the same variable works for both the app runtime and `prisma migrate`.

---

## Schema Design

File: [`prisma/schema.prisma`](../prisma/schema.prisma)

### Entity Relationship

```
User ──< Account          (one user, many OAuth providers)
User ──< Session          (one user, many active sessions)
User ──1 Subscription     (one user, exactly one subscription)
User ──< Run              (one user, many generation runs)
```

### NextAuth Models

These four models are **required by `@auth/prisma-adapter`** and managed automatically — you never write to them directly.

```prisma
model User {
  id            String         @id @default(cuid())
  name          String?
  email         String         @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  subscription  Subscription?
  runs          Run[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String        // e.g. "google"
  providerAccountId String        // Google's user ID
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  ...
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

### App Models

#### `Subscription`

Tracks a user's current plan and credit balance. Created automatically on first sign-in via the `createUser` NextAuth event.

```prisma
enum Tier {
  FREE      // 3 lifetime credits — never renews
  STARTER   // $9/mo  — 10 credits/cycle
  PRO       // $49/mo — 100 credits/cycle
  AGENCY    // $299/mo — 750 credits/cycle
}

model Subscription {
  id           String    @id @default(cuid())
  userId       String    @unique
  tier         Tier      @default(FREE)
  creditsTotal Int       @default(3)   // set by billing webhook on upgrade
  creditsUsed  Int       @default(0)   // incremented at run start
  renewsAt     DateTime?               // null for FREE tier
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

| Field | Purpose |
|---|---|
| `creditsTotal` | Maximum runs allowed. 3 for FREE; updated by billing webhook on paid plans |
| `creditsUsed` | Runs consumed this cycle. Checked before every generation |
| `renewsAt` | When `creditsUsed` resets to 0. `null` means FREE (never resets) |

#### `Run`

One row per generation attempt. Created before the pipeline starts; updated when it ends.

```prisma
enum RunStatus {
  PENDING     // created but not yet streaming
  RUNNING     // SSE stream is active
  COMPLETED   // pipeline finished successfully
  FAILED      // pipeline threw an error
}

model Run {
  id          String    @id @default(cuid())
  userId      String
  idea        String                    // the user's input
  status      RunStatus @default(PENDING)
  artifacts   Json?                     // { websiteUrl, finalVideoUrl, productDoc }
  createdAt   DateTime  @default(now())
  completedAt DateTime?
}
```

The `artifacts` JSON field stores output URLs/content from the pipeline so run history can be displayed without re-running.

---

## DB Connection

### Singleton pattern

File: [`lib/prisma.ts`](../lib/prisma.ts)

```ts
import { PrismaClient } from "./generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Next.js hot-reloads modules in dev, which would create a new `PrismaClient` instance on every file change and exhaust the connection pool. The `globalThis` trick keeps a single instance alive across reloads.

In production, module-level state is stable, so the singleton guard is skipped.

### Prisma config

File: [`prisma.config.ts`](../prisma.config.ts)

```ts
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

const { combinedEnv } = loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: combinedEnv.DATABASE_URL },
});
```

Prisma 7 reads the datasource URL from this config file, not from `schema.prisma`. Using `@next/env` ensures `DATABASE_URL` from `.env.local` is loaded for CLI commands (`prisma migrate`, `prisma studio`) — the same way Next.js loads it for the app.

### Generated client location

Prisma generates the typed client at `lib/generated/prisma/` (set in `schema.prisma` generator output). This is imported directly in `lib/prisma.ts` as `"./generated/prisma"`.

---

## Request Flow

### First sign-in

```
Browser → Google OAuth → NextAuth callback
  → PrismaAdapter.createUser()     creates User row
  → events.createUser()            creates Subscription row (FREE, 3 credits, 0 used)
  → PrismaAdapter.createSession()  creates Session row
```

### Generation request (`POST /api/generate`)

```
Client sends { idea } with session cookie
  │
  ├─ auth()                        verify session via DB lookup
  │
  ├─ subscription.upsert()         fetch credit balance
  │   └─ if creditsUsed >= creditsTotal → return 429 { error: "credit_limit_reached" }
  │
  ├─ $transaction([               atomic: both succeed or both fail
  │     run.create(RUNNING),
  │     subscription.update(creditsUsed += 1)
  │   ])
  │
  ├─ runPipeline(idea)             SSE stream: strategy → website → media → stitch
  │   └─ collect artifact URLs from "artifact" events
  │
  └─ run.update()                  set status COMPLETED/FAILED, store artifacts JSON
```

**Why deduct credits at start, not on success?**
Deducting upfront prevents a user from repeatedly triggering expensive pipeline phases (Kling video generation, RunPod FFmpeg) by cancelling mid-run. The cost is incurred regardless of whether the browser tab is open at the end.

### Credit limit enforcement

```
creditsUsed < creditsTotal  →  run proceeds normally
creditsUsed >= creditsTotal →  HTTP 429 returned immediately, no pipeline work done
```

The 429 response body includes `{ error: "credit_limit_reached", tier: "FREE" }` so the frontend can show a targeted upgrade prompt based on the current tier.

---

## Migrations

### Initial setup

```bash
# 1. Fill in DATABASE_URL in .env.local with your Neon connection string
# 2. Run the migration — creates all tables and generates the Prisma client
npx prisma migrate dev --name init
```

### Subsequent schema changes

```bash
# Edit prisma/schema.prisma, then:
npx prisma migrate dev --name <description>
```

### Production deploys

```bash
npx prisma migrate deploy   # applies pending migrations without prompts
```

Add this to your CI/CD pipeline before starting the Next.js server.

### Viewing data

```bash
npx prisma studio           # opens a browser UI at localhost:5555
```

---

## Upgrading a User's Plan

When a billing event fires (e.g. Stripe webhook), update the `Subscription` row:

```ts
await prisma.subscription.update({
  where: { userId },
  data: {
    tier: "PRO",
    creditsTotal: 100,
    creditsUsed: 0,                          // reset on new cycle
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});
```

Monthly credit resets work the same way — set `creditsUsed = 0` and advance `renewsAt` by one month.

---

## File Map

```
prisma/
  schema.prisma           — model definitions + generator config
  migrations/             — generated SQL migration files (committed to git)

prisma.config.ts          — Prisma 7 config (datasource URL, migration path)

lib/
  prisma.ts               — PrismaClient singleton
  generated/
    prisma/               — auto-generated typed client (gitignored)

auth.ts                   — NextAuth config with PrismaAdapter + createUser event
app/api/generate/route.ts — credit gate + run tracking around the pipeline
.env.local                — DATABASE_URL (never committed)
```
