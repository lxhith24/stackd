# Stackd

A private, mobile-friendly cash-game ledger for personal play and host-managed home games.

## Features

- ChatGPT sign-in and durable cloud records, available across devices with the same account.
- Personal or group sessions, one active hosted session at a time, and historical entry.
- Unique four-digit friend codes, friend requests, and adding accepted friends to a group.
- Shareable group invite links with ChatGPT sign-in and explicit joining. Friendship is optional for invite joins.
- Participants see only their own amounts and registered player names; only the host can edit.
- Start date is required; exact start/end times are optional. Rebuy times are recorded automatically.
- Guest names, one player marked as you, individual buy-ins/rebuys, and cash-outs including zero.
- Host-only editing, session deletion with confirmation, and group balance checks.
- Personal dashboard, cumulative results, hourly result, date/venue filtering.
- CSV session and transaction exports, plus a copyable session summary.
- Name/currency setup, one fixed ledger currency, integer minor-unit amounts.

Offline entry, tournaments, payments, expenses and bankroll transfers are outside this version.

Four-digit friend codes are stored as strings (including leading zeros), are immutable, and allow 10,000 accounts. The database enforces uniqueness and new sign-ins receive a code lazily. Code lookup and invite joins are throttled. Requests need recipient acceptance. Unfriending does not remove past session history. Hosts may replace invite links; completed sessions accept no new joins. Removing a registered player revokes their access to that session. No guest is linked to an account by matching a name or email.

## Stack and authentication

React 19, TypeScript, Vite/Vinext, Tailwind, Shadcn/Radix components, Recharts, Cloudflare D1, and Sites-hosted ChatGPT authentication. The initial Supabase recommendation was replaced with platform storage/authentication to deliver a working private app without external credentials.

Sites authenticates requests and forwards trusted user identity to the Worker. All data reads/writes check that identity and session ownership. Do not expose the raw Worker directly to the public: the authenticated Sites dispatcher is the production trust boundary. The portable development server mocks sign-in only on loopback; mock authentication is excluded from production.

## Local development

Node 22.13+ is required. Run `npm ci` and `npm run dev`. Open the exact localhost URL the server prints. The local sign-in link uses the starter's mock account.

For a fresh local database, first run `npm run build`, then:

```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_massive_the_anarchist.sql
```

Apply a migration once per database. Production migrations are applied by Sites on publication. Never edit an applied migration; generate a new migration after schema changes with `npm run db:generate`.

## Validation

```
npx tsc --noEmit
node --experimental-strip-types --test tests/poker.test.mjs
npm run build
```

For API integration checks, run `npm start -- --port 5180`, then `node tests/api.test.mjs`. These checks only target 127.0.0.1:5180, use randomly generated test owners and remove their test sessions. The raw local Worker accepts trusted identity headers to exercise multiple users; production relies on Sites to authenticate and inject those headers.

## Data integrity

Sessions, players and individual buy-ins are separate relational tables. Every multi-record save is an atomic D1 batch. Session revision checks protect against stale edits and deletion. Operation IDs make retries idempotent. A database constraint allows only one active session per owner. Cash-out is nullable until known; zero is a real recorded amount. Completed sessions require every cash-out and a positive duration. Group imbalance needs explicit acknowledgment and remains visible.

The personal overview includes completed hosted and joined sessions for the viewer, using their ledger currency. Other currencies remain in history without conversion. Hourly result uses only sessions with both exact times; date-only sessions contribute to profit and counts without inventing a duration. Cash-game costs already reflected in cash-out are not deducted again. Groups use the session's overall start/end time for the host's duration.

Exports include all players. CSV formula prefixes are neutralized. User data is not stored in browser storage. Internet is required; failed saves retain entered values in the open form. Closing a form or reloading discards its unsaved draft.

## Source layout

`app/ledger-app.tsx` implements the interface. `app/api/` contains authenticated endpoints. `lib/poker.ts` owns calculations, validation and CSV logic. `db/ledger.ts` owns persistence and concurrency checks. `db/schema.ts` plus `drizzle/` own schema migrations.

## V2 validation

Run `node --experimental-strip-types --test tests/poker.test.mjs` for ledger calculations. Build, apply the SQL migrations to the local database, start the built Worker on 127.0.0.1:5180, then run `node tests/api.test.mjs` and `node --experimental-strip-types tests/social-api.test.mjs`. These use disposable identities only on localhost. They cover cross-account access, participant privacy, invite sign-in return paths, concurrent joins, stale host saves, friend acceptance, membership revocation, link replacement, completed sessions, rate limiting and date-only results. Production migrations are applied by Sites on publication.
