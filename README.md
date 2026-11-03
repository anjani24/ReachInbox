# ReachInbox Email Scheduler

A production-style **email job scheduler** with a dashboard. Users log in with Google, upload a list of leads, and schedule emails that are sent reliably at the right time, at scale, with per-sender rate limiting, restart safety, and live Slack alerts.

> 🎥 **Demo video:** _add your link here_
> 👤 **Author:** Anjani Agarwal

---

## Table of contents

1. [Features → requirements](#features--requirements)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Getting started](#getting-started)
5. [How it works](#how-it-works)
   - [Scheduling (no cron)](#1-scheduling-no-cron)
   - [Persistence & restart recovery](#2-persistence--restart-recovery)
   - [Idempotency (never send twice)](#3-idempotency-never-send-twice)
   - [Rate limiting & minimum delay](#4-rate-limiting--minimum-delay)
   - [Concurrency](#5-concurrency)
   - [Behavior under load (1000+ emails)](#6-behavior-under-load-1000-emails)
   - [Slack notifications](#7-slack-notifications)
   - [Search (Elasticsearch)](#8-search-elasticsearch)
   - [Authentication](#9-authentication)
6. [API reference](#api-reference)
7. [Scripts](#scripts)
8. [Project structure](#project-structure)
9. [Assumptions](#assumptions)
10. [Trade-offs & future improvements](#trade-offs--future-improvements)

---

## Features → requirements

| Requirement | Implementation |
|---|---|
| Accept scheduling requests & store in a relational DB | `POST /api/campaigns` → Postgres (`campaigns` + one `emails` row per recipient) in a single transaction |
| Scheduling via BullMQ delayed jobs | One delayed job per email, `delay = scheduledAt − now` |
| **No cron** | None anywhere: no crontab, node-cron, agenda, or polling loops |
| Multiple senders via Ethereal SMTP | Each user gets 2 Ethereal accounts automatically on first login; pick one in Compose |
| Survives restarts, no duplicates, no restarting from zero | Redis AOF + Postgres as source of truth + startup reconciliation ([details](#2-persistence--restart-recovery)) |
| Idempotency | BullMQ `jobId = email.id` + atomic DB claim + unique `(campaign, recipient)` index |
| Configurable worker concurrency | `WORKER_CONCURRENCY` (default **5**) |
| Minimum delay between sends | BullMQ limiter, `MIN_SEND_DELAY_MS` (default **2000 ms**), global across all workers |
| Hourly send limit, configurable, multi-worker safe | Per-sender counter in Redis (atomic Lua), `MAX_EMAILS_PER_HOUR_PER_SENDER` (default **200**) |
| Over the limit → reschedule, never drop/fail, keep order | Job moved to the start of the next hour window; order preserved |
| Slack: real OAuth "Connect Slack", token per user | Slack OAuth v2 (`incoming-webhook`), webhook stored on the user row |
| Slack: live message when a sender hits its cap | Posted by the worker at the moment of the hit, once per sender per hour |
| Slack: no crash if not connected; works after connecting with no redeploy | Webhook read from DB at alert time; all Slack errors are caught |
| Elasticsearch indexing | Emails indexed on schedule, updated on every status change; search with DB fallback |
| Live BullMQ dashboard | Bull Board at `/admin/queues` (login-protected) |
| Google OAuth login (real) | Google OAuth 2.0 → httpOnly JWT cookie; name, email, avatar in the sidebar, plus logout |
| Dashboard: Scheduled / Sent tabs, Compose | Inbox-style lists matching the Figma, live counts, auto-refresh |
| Compose: CSV upload with detected count, start time, delay, hourly limit | Any CSV/TXT layout parsed client-side; chips with a `+N` overflow; Send Later popover |
| Loading, empty, and error states, toasts | Skeleton rows, empty states with a CTA, error states with retry, Sonner toasts |
| **Bonus:** rate limiting under load | `npm run load:test` and `npm run load:report` ([details](#6-behavior-under-load-1000-emails)) |

---

## Tech stack

**Backend:** TypeScript · Express 5 · BullMQ · Redis 7 (ioredis) · PostgreSQL 16 · Drizzle ORM · Nodemailer (Ethereal) · Elasticsearch 8 · Zod · google-auth-library · jsonwebtoken · Bull Board

**Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · TanStack Query · Tiptap (rich text) · Sonner (toasts) · lucide-react

**Infra:** Docker Compose (Postgres, Redis with AOF, Elasticsearch) · ngrok (HTTPS tunnel for the Slack OAuth callback in local development)

---

## Architecture

```mermaid
flowchart TB
    FE["Next.js dashboard<br/>(login, compose, lists)"]
    API["Express API<br/>(auth, scheduling, Slack OAuth, Bull Board)"]
    PG[("PostgreSQL<br/>source of truth")]
    RD[("Redis + BullMQ<br/>delayed jobs, rate counters")]
    ES[("Elasticsearch<br/>search index")]
    W["BullMQ worker(s)<br/>claim → rate limit → send"]
    SMTP["Ethereal SMTP"]
    SL["Slack"]

    FE -->|"REST + httpOnly cookie"| API
    API --> PG
    API -->|"addBulk (delayed)"| RD
    API -->|"index / search"| ES
    RD --> W
    W --> PG
    W --> ES
    W --> SMTP
    W -->|"limit-hit alert"| SL
```

- The **API** and the **worker** are separate processes (`src/server.ts`, `src/worker.ts`) and scale independently. You can run any number of workers.
- A job carries **only the email id**. Everything else is read from Postgres, which is the single source of truth.

---

## Getting started

### Prerequisites

- Node.js 20+
- Docker Desktop
- A Google Cloud project (for OAuth)
- *(Optional, for Slack)* a Slack workspace and a free ngrok account

### 1. Clone and start the data services

```bash
git clone <repo-url>
cd reachinbox-scheduler
docker compose up -d
```

This starts Postgres (5432), Redis (6379) with **AOF persistence** and `noeviction`, and Elasticsearch (9200).

### 2. Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/), open **Google Auth Platform** and create an **External** app.
2. Under **Audience → Test users**, add the Gmail accounts you will log in with.
3. Under **Clients → Create client**, choose **Web application**:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
4. Copy the Client ID and Client Secret into `backend/.env`.

### 3. Slack setup *(optional)*

Slack requires an HTTPS redirect URL, so the local backend is exposed through ngrok.

1. Install ngrok, claim your free static domain, then run:
   ```bash
   ngrok http --url=<your-domain>.ngrok-free.app 4000
   ```
2. At [api.slack.com/apps](https://api.slack.com/apps), choose **Create New App → From scratch**, then:
   - **Incoming Webhooks:** turn **On**
   - **OAuth & Permissions → Redirect URLs:** `https://<your-domain>.ngrok-free.app/api/slack/callback`
   - **Bot Token Scopes:** `incoming-webhook`
3. Copy the Client ID and Client Secret into `backend/.env`.

If the Slack variables are left empty, the app works normally and the "Connect Slack" option is hidden.

### 4. Backend

```bash
cd backend
cp .env.example .env    # then fill in the values below
npm install
npm run db:migrate
```

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | API port |
| `FRONTEND_URL` | — | `http://localhost:3000` (used for CORS and redirects) |
| `DATABASE_URL` | — | `postgresql://reachinbox:reachinbox@localhost:5432/scheduler` |
| `REDIS_URL` | — | `redis://localhost:6379` |
| `WORKER_CONCURRENCY` | `5` | Jobs processed in parallel per worker |
| `MIN_SEND_DELAY_MS` | `2000` | Minimum gap between any two sends, across all workers |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Hard hourly cap per sender, enforced at send time |
| `STUCK_SENDING_TIMEOUT_MS` | `120000` | After this, an email stuck in `sending` (crashed mid-send) is retried |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | From Google Cloud |
| `GOOGLE_CALLBACK_URL` | — | `http://localhost:4000/api/auth/google/callback` |
| `JWT_SECRET` | — | At least 32 characters |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | *(empty)* | Optional |
| `SLACK_REDIRECT_URI` | *(empty)* | `https://<your-domain>.ngrok-free.app/api/slack/callback` |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | |
| `ELASTICSEARCH_INDEX` | `emails` | |

Every variable is validated with Zod at startup. A missing or invalid value stops the process with a clear message.

Run the API and the worker in **separate terminals**:

```bash
npm run dev       # API → http://localhost:4000
npm run worker    # worker (start as many as you like)
```

### 5. Frontend

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # → http://localhost:3000
```

Open **http://localhost:3000** and log in with Google.

> Use `localhost`, not `127.0.0.1`. The session cookie is set for `localhost`.

### 6. Ethereal (fake SMTP)

Nothing to configure. On a user's first login, two [Ethereal](https://ethereal.email) accounts are created automatically with `nodemailer.createTestAccount()`. Mail sent through them is captured, never delivered. Every sent email has an **↗ preview link** in the Sent tab. You can also log in at ethereal.email using the sender credentials in the `senders` table (`npm run db:studio`).

### Useful URLs

| URL | What |
|---|---|
| http://localhost:3000 | Dashboard |
| http://localhost:4000/api/health | Health of Postgres, Redis, and Elasticsearch |
| http://localhost:4000/admin/queues | Bull Board (log in first) |

---

## How it works

### 1. Scheduling (no cron)

`POST /api/campaigns` receives the sender, subject, HTML body, recipients, start time, delay between emails, and hourly limit.

1. **Validate** with Zod. Recipients are lower-cased and de-duplicated. A start time in the past means "start now".
2. **Compute a send slot for every email** (`computeSendSlots`):
   - Email *i* goes at `start + i × delay`.
   - At most `hourlyLimit` emails are placed in each clock hour; overflow moves to the next hour.
   - Order is always preserved.
3. **Write to Postgres first**, in one transaction: one `campaigns` row and one `emails` row per recipient, with status `scheduled` and the computed `scheduled_at`. Inserts are batched 500 at a time.
4. **Enqueue** one BullMQ job per email with `addBulk` (batched), using `jobId = email.id` and `delay = scheduled_at − now`.
5. **Index** the emails in Elasticsearch. This step never blocks or fails scheduling.

Delayed jobs wait inside Redis until they are due. There is no cron and no polling.

### 2. Persistence & restart recovery

- **Jobs live in Redis, not in Node's memory.** Stopping the API or the workers loses nothing.
- **Redis uses AOF persistence** (`--appendonly yes`), so delayed jobs also survive a Redis restart. `noeviction` stops Redis from silently dropping keys under memory pressure, as BullMQ requires.
- **Postgres is the source of truth.** On startup each worker runs `recoverOnStartup()`:
  1. Emails stuck in `sending` for longer than `STUCK_SENDING_TIMEOUT_MS` (the worker crashed mid-send) go back to `scheduled`.
  2. Every `scheduled` email is checked against Redis. If its job is missing, or already finished while the row is still pending, it is re-queued with the same `jobId`.
- **Graceful shutdown:** on `SIGINT`/`SIGTERM`, `worker.close()` waits for in-flight jobs, then the Redis, Postgres, and Elasticsearch connections are closed.

Result: stop everything, start it again, and future emails still go out at the right time, each exactly once.

### 3. Idempotency (never send twice)

Three independent layers:

1. **Queue level:** `jobId = email.id`. BullMQ ignores a second job with an existing id, so double-enqueueing (for example during recovery) is harmless.
2. **Database claim, the main guarantee.** Before sending, the worker runs:
   ```sql
   UPDATE emails SET status = 'sending'
   WHERE id = $1 AND status = 'scheduled'
   RETURNING *;
   ```
   Only one worker can win this update. A retried, duplicated, or stalled job that loses gets nothing back and exits without sending.
3. **Data level:** a unique index on `(campaign_id, to_email)` stops the same address appearing twice in a campaign.

Failed sends are retried 3 times with exponential backoff (5 s, 10 s, 20 s). Before each retry the row returns to `scheduled` so it can be claimed again. After the last attempt it is marked `failed` with the error message.

### 4. Rate limiting & minimum delay

There are two levels of hourly limit, plus a global gap between sends.

**a) Campaign hourly limit (when scheduling).** The value entered in Compose spreads the campaign across hour windows when it is created (see [Scheduling](#1-scheduling-no-cron)). This handles the common case with no runtime cost.

**b) Per-sender hourly cap (when sending).** This guards against several campaigns sharing one sender.

- Key: `ratelimit:sender:{senderId}:{hourWindowStart}`, expiring after 2 h.
- Taken atomically with a Lua script (`INCR`, then compare with the limit, and `DECR` if over). Two workers can never both take the last slot.
- The counter lives in **Redis, not in memory**, so the cap holds across any number of worker processes or machines.
- **Over the cap:** the email is set back to `scheduled` with `scheduled_at` set to the start of the next hour window, and the job is moved there with `job.moveToDelayed()` and `DelayedError`. It is **never dropped and never counted as failed**. Overflowing jobs are moved in the order they are processed, so their relative order is kept.
- If the SMTP send fails, the slot is released.
- Configured with `MAX_EMAILS_PER_HOUR_PER_SENDER` (default **200**).

Hour windows are UTC clock hours. In IST (UTC+05:30) they begin at :30 past the hour.

**c) Minimum delay between sends.** Done with the **BullMQ worker limiter**: `{ max: 1, duration: MIN_SEND_DELAY_MS }`. The limiter is enforced through Redis, so it is **global across all workers**: at most one send every `MIN_SEND_DELAY_MS`.

**Chosen value: `MIN_SEND_DELAY_MS = 2000` (2 seconds).** That allows up to 1,800 sends an hour, comfortably above the default per-sender cap, while staying gentle on SMTP providers. The per-campaign "delay between emails" from Compose is added on top of this, at scheduling time.

**Maximum throughput per sender:** `min(MAX_EMAILS_PER_HOUR_PER_SENDER, 3600 s ÷ MIN_SEND_DELAY_MS)` per hour.

### 5. Concurrency

- `WORKER_CONCURRENCY` (default 5) sets how many jobs a worker handles at once. Run more worker processes to scale out.
- This is safe because the atomic claim prevents double sends, the rate-limit counters are atomic in Redis, and the limiter is shared through Redis.
- With the global limiter, concurrency mainly lets the slow parts (SMTP and DB I/O) overlap while sends stay spaced out.

### 6. Behavior under load (1000+ emails)

When 1000+ emails for one sender are due at about the same moment:

1. **When scheduling:** the campaign's hourly limit has already spread them into hour windows (for example, 1000 at 200/hour gives 200 per hour over 5 hours). Creating the 1000 rows and jobs takes about 1–2 s because the work is batched.
2. **When they become due:** the global limiter releases at most one send every `MIN_SEND_DELAY_MS`.
3. **When the per-sender cap is reached:** each further email is moved to the next hour window. One Slack alert is sent. Nothing fails and nothing is lost. The backlog drains hour by hour at the configured rate.

**See it yourself.** Set `MAX_EMAILS_PER_HOUR_PER_SENDER=20` and `MIN_SEND_DELAY_MS=250`, start two workers, then run:

```bash
npm run load:test -- you@gmail.com 1000 1000 0   # 1000 emails, all due now
npm run load:report -- <campaignId>
```

The report shows:
- the status breakdown (20 sent, 980 scheduled, 0 failed)
- the pending emails per hour window
- the min, avg, and max gap between real sends (≥ 250 ms)
- the live Redis counter (20 / 20)

To demo the alert again within the same hour, reset the counters (development only):

```bash
docker exec rb-redis redis-cli eval "for _,k in ipairs(redis.call('keys','ratelimit:sender:*')) do redis.call('del',k) end for _,k in ipairs(redis.call('keys','notified:ratelimit:*')) do redis.call('del',k) end return 'ok'" 0
```

### 7. Slack notifications

- **Connect:** the user clicks *Connect Slack* in the user menu and is redirected to Slack's OAuth v2 page with the `incoming-webhook` scope. The user picks a channel.
- **Callback:** the callback arrives on the ngrok domain, where the login cookie isn't present. So the user id travels inside a **signed, 10-minute `state` JWT**. That identifies the user and also blocks forged callbacks. The state uses a different secret from login sessions, so it can never be reused as a session.
- The code is exchanged for the channel's **webhook URL**, which is stored **on that user's row**.
- **Alert:** when a sender reaches its hourly cap, the worker posts a message immediately. It names the sender, the limit, and when sending resumes (rendered in each reader's own timezone). A Redis `SET NX` key makes sure there is one alert per sender per hour window, even with many workers.
- **Resilience:** the webhook is read from the DB at alert time, so connecting later works without a restart or redeploy. Slack calls time out after 5 s, and every error is caught and logged; Slack can never fail or slow down a send. A missing webhook simply means no alert.
- The dashboard menu also offers **Send test alert** and **Disconnect Slack**.

### 8. Search (Elasticsearch)

- The `emails` index maps `toEmail` and `subject` as `search_as_you_type`, so partial input like `ali` matches `alice@test.com`. It also stores a plain-text body preview, the status, and the dates.
- Documents are **bulk-indexed when scheduled** and **partially updated by the worker on every status change** (sent, failed, rescheduled).
- **Search flow:** Elasticsearch finds the matching ids, filtered by user and status and ordered by relevance, and **Postgres supplies the rows**. Results are always current even if an index update lagged. The response's `source` field shows which engine answered.
- **Graceful degradation:** if Elasticsearch is down, search falls back to a Postgres `ILIKE` query, and scheduling and sending carry on unaffected.
- **Rebuild anytime:** `npm run search:reindex` rebuilds the whole index from Postgres.

### 9. Authentication

- **Flow:** Google OAuth 2.0 authorization-code flow on the backend, using `google-auth-library`. The ID token is verified, then the user is upserted by Google `sub`.
- **CSRF protection:** a random `state` value is stored in a short-lived cookie and checked on the callback.
- **Session:** a JWT (7 days) in an **httpOnly, SameSite=Lax** cookie (`Secure` in production). Page JavaScript can't read it, which protects it from XSS.
- **Protected routes:** `requireUser` guards all API routes and Bull Board. Each user only ever sees their own senders and emails.

---

## API reference

All `/api/*` routes except health and the OAuth endpoints require the session cookie.

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Status of Postgres, Redis, and Elasticsearch (each check times out after 2 s) |
| GET | `/api/auth/google` | Start Google login |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Current user, including Slack status |
| POST | `/api/auth/logout` | Clear the session |
| GET | `/api/senders` | The user's sender accounts |
| POST | `/api/campaigns` | Schedule a campaign (body below) |
| GET | `/api/emails?status=scheduled\|sent&page=1&pageSize=20&q=` | Paginated list; `q` triggers search |
| GET | `/api/emails/counts` | `{ scheduled, sent }` for the sidebar |
| GET | `/api/slack/connect` | Start Slack OAuth |
| GET | `/api/slack/callback` | Slack OAuth callback |
| POST | `/api/slack/test` | Send a test message |
| POST | `/api/slack/disconnect` | Remove the Slack connection |
| — | `/admin/queues` | Bull Board UI |

Example `POST /api/campaigns` body:

```json
{
  "senderId": "uuid",
  "subject": "Hello",
  "body": "<p>Hi <b>there</b></p>",
  "recipients": ["a@test.com", "b@test.com"],
  "startAt": "2026-11-04T10:00:00.000Z",
  "delayMs": 5000,
  "hourlyLimit": 100
}
```

Example response:

```json
{
  "campaignId": "uuid",
  "scheduled": 2,
  "duplicatesRemoved": 0,
  "firstSendAt": "...",
  "lastSendAt": "..."
}
```

Validation errors return `400` with `{ error, issues: [{ path, message }] }`.

---

## Scripts

**Backend**

| Command | What it does |
|---|---|
| `npm run dev` | API with hot reload |
| `npm run worker` | Worker with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run start` / `npm run start:worker` | Run the compiled API / worker |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations and the DB browser |
| `npm run search:reindex` | Rebuild the Elasticsearch index from Postgres |
| `npm run load:test -- <email> [count] [hourlyLimit] [delayMs]` | Schedule a large campaign that is due now |
| `npm run load:report -- <campaignId>` | Status, hour distribution, send gaps, rate counter |

**Frontend:** `npm run dev`, `npm run build`, `npm run start`, `npm run lint`

---

## Project structure

```
backend/src/
├── config/        env.ts (Zod-validated), redis.ts
├── db/            schema.ts (Drizzle tables), index.ts (pool)
├── middleware/    auth.ts, errorHandler.ts
├── queue/         emailQueue.ts, processEmailJob.ts, bullBoard.ts
├── routes/        auth, campaigns, emails, senders, slack, health
├── search/        emailIndex.ts (Elasticsearch client, mapping, index/update/search)
├── services/      scheduling, rateLimiter, mailer, notification, slack, auth, senders, recovery
├── scripts/       reindex.ts, loadTest.ts, loadReport.ts
├── utils/         asyncHandler, chunk, time, text, withTimeout
├── app.ts         Express app factory
├── server.ts      API entry point
└── worker.ts      Worker entry point

frontend/src/
├── app/           login, dashboard/{scheduled,sent}, compose
├── components/    ui/, layout/, emails/, compose/, auth/
├── hooks/         useAuth, useEmails, useCompose, useSlack, useClickOutside, useDebouncedValue
├── lib/           api.ts (typed fetch client), format, dates, emails, cn
└── types/api.ts   API response types
```

---

## Assumptions

- **Delay** in Compose is entered in **seconds** and stored as milliseconds.
- **Hourly limit** in Compose applies to that campaign. The env `MAX_EMAILS_PER_HOUR_PER_SENDER` is the global cap per sender, shared by all of that sender's campaigns.
- Hour windows are **UTC clock hours**.
- Email/password login is shown to match the Figma but **disabled**. The assignment requires Google login only.
- Each user gets **two Ethereal senders** automatically. Real SMTP providers would plug into the same `senders` table.
- A recipient list is limited to **5,000 addresses** per campaign and a **2 MB** file. Any column layout in CSV or TXT works, because addresses are extracted by pattern.
- The **email detail view**, **attachments**, and **starring** from the Figma are outside the assignment's scope. The star icon is visual only.

---

## Trade-offs & future improvements

- **Overflow drains at limiter speed.** Emails rejected by the hourly cap still pass through the global min-delay limiter before being moved to the next hour. A big overflow therefore takes `overflow × MIN_SEND_DELAY_MS` to be rescheduled. That is correct, but not instant. *Improvement:* reserve per-sender send slots atomically in Redis so overflow is rescheduled in one pass.
- **The minimum delay is global, not per sender.** It is simple and safe for SMTP, but one busy sender slows others down. *Improvement:* a per-sender gap tracked in Redis.
- **At-least-once window.** If a worker crashes *after* the SMTP server accepted an email but *before* the DB update, recovery may send it once more after `STUCK_SENDING_TIMEOUT_MS`. Exactly-once delivery would need cooperation from the SMTP provider (for example, idempotency keys). This window is a few milliseconds per email.
- **Stuck `sending` rows are recovered at worker startup**, not continuously. That avoids any cron or polling loop. A long-running worker never restarts, so a crash in another worker is picked up by the next restart.
- **Recovery checks jobs one by one.** That is fine for thousands of pending emails. For millions it would use batched Redis pipelines.
- **SMTP passwords are stored in plain text** (they are throwaway Ethereal accounts). *Improvement:* encrypt them at rest or use a secrets manager.
- **JWT sessions can't be revoked** before they expire (7 days). Logout clears the cookie. *Improvement:* a server-side session store or a token blocklist in Redis.
- **Elasticsearch is eventually consistent** with Postgres (about 1 s refresh). Search reads fresh rows from Postgres to hide this, and `search:reindex` repairs any drift.
- **Slack in development needs ngrok** because Slack requires HTTPS redirect URLs. In production the API would have its own HTTPS domain.
- **Bull Board** is protected by login but not by role. In production it would be admin-only.