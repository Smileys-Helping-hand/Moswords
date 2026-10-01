# Moswords / AwehChat

Messaging for friends, family and teams — DMs, groups, calls, statuses and Slack-style
servers/channels — and the **contact book for the whole ecosystem**: other apps read and
write each user's contacts here through a scoped API.

Live at **https://awehchat.co.za** (AWS Amplify, `eu-west-2`). Android/iOS apps are
Capacitor shells that load the same site.

## Stack

- Next.js 16 (App Router) on Amplify SSR · next-auth v4 (JWT)
- Postgres on Neon via Drizzle (`src/lib/schema.ts`)
- Media in S3 (`awehchat-media-*`), mail via SES — both through the Amplify IAM compute role
- 1:1 calls over WebRTC (DB signalling), group calls via LiveKit (optional)
- libsodium sealed-box keys per device (`src/lib/crypto`)

## How realtime works

One loop, not many. `SyncProvider` runs a single adaptive request to `/api/sync`
(1.5 s during call setup, 3 s when active, backing off to 20 s when hidden, paused offline)
that returns everything new for the user: DMs, messages in their groups and servers, call
signals, typing, read receipts, presence and the friend-request count. Screens subscribe with
`useSyncBatches` / `useTyping` / `usePresence` instead of polling on their own timers.

## Ecosystem Contacts API

`/api/v1/contacts`, `/api/v1/connections`, `/api/v1/users/lookup` — see
[docs/ECOSYSTEM_API.md](docs/ECOSYSTEM_API.md). Keys are issued per app on `/ecosystem`,
stored hashed, and scoped (`contacts.read`, `contacts.write`, …).

## Develop

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Point `DATABASE_URL` in `.env.local` at a **local** Postgres, never production. A
`localhost`/`127.0.0.1` URL makes the app use node-postgres (production uses Neon over
HTTP), so any Postgres 14+ works, e.g. inside WSL:
`postgresql://awehchat:<password>@127.0.0.1:5433/awehchat_dev`. Create the schema with
`npx drizzle-kit push`, then `npx tsx scripts/migrate.ts`.

Schema changes go in `scripts/migrations.ts` — additive and idempotent only. The Amplify
build runs `scripts/migrate.ts`, which applies them and prints a drift report (tables/columns
the code expects that the database lacks).

End-to-end check (60 assertions over the whole user journey, local only):
`npm run build && npm start -- -p 3100`, then
`DATABASE_URL=<local test db> node scripts/e2e.mjs http://localhost:3100`.

## Deploy

Push to `main` → Amplify builds with `amplify.yml`:
Node 22 → `npm ci` → migrations → `scripts/write-runtime-env.mjs` (Amplify only gives env vars
to the build, so they're copied into `.env.production` for the server) → `next build`.

Required Amplify environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
`MEDIA_BUCKET`. See `.env.example` for the optional ones.

## Mobile

`capacitor-shell/` holds the tiny offline shell bundled into the apps (it must not live in
`public/`, or it replaces the website's home page). `npm run apk:release` builds Android.

Older status docs are kept in `docs/archive/` for history; they are not current.
