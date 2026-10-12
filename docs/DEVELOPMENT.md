# Stackd v1 — developer guide

This guide describes the application shipped as version **1.0.0**. Start with the [README](../README.md) for the product feature list.

## Architecture and request flow

Stackd is a React/TypeScript application using Vinext, Vite, Next.js-style App Router files, and a Cloudflare Worker backend. Cloudflare D1 stores the ledger and social data. OpenAI Sites provides hosting and ChatGPT sign-in. Tailwind/custom CSS, shadcn/Radix components, Lucide, and Recharts provide the interface.

```text
Browser → Sites authentication dispatcher → Worker route
                                          → identity/origin checks
                                          → input + domain validation
                                          → D1 queries/atomic batch
                                          → viewer-specific JSON → React UI
```

The production dispatcher is essential: `app/chatgpt-auth.ts` reads trusted identity headers supplied by Sites. The application does not independently verify a password or OAuth token. Hosting the raw Worker publicly without an equivalent authenticated gateway would make these headers forgeable. Moving to another host requires implementing and validating a replacement authentication boundary first.

Drizzle defines the schema and generates migrations. Most application persistence uses D1 prepared SQL directly in `db/ledger.ts` and `db/social.ts`; `db/index.ts` also exposes a Drizzle adapter.

## Codebase map

| Path | Purpose |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx` | Sign-in/ledger entry point and page shell |
| `app/ledger-app.tsx` | Overview, session history/detail/editor, preferences, refresh and export flows |
| `app/friends-panel.tsx` | Friends tab, shared friends state, requests and session roster |
| `app/join/[token]/` | Invite landing page, sign-in return path, explicit join action |
| `app/api/` | HTTP endpoints; thin validation/authorization wrappers |
| `app/chatgpt-auth.ts` | Trusted identity decoding and safe relative authentication redirects |
| `lib/poker.ts` | Zod schemas, money parsing, results, date validation, CSV exports |
| `lib/api.ts`, `lib/errors.ts` | Identity/origin checks, JSON parsing, private responses and HTTP errors |
| `db/ledger.ts` | Owner/member reads, host writes, concurrency and idempotency |
| `db/social.ts` | Accounts/codes, friendships, invitations, joins and throttling |
| `db/schema.ts`, `drizzle/` | Schema declarations and ordered SQL migration history |
| `app/globals.css`, `components/ui/` | App styles and reusable components |
| `tests/` | Calculation and localhost API integration checks |
| `vite.config.ts`, `build/`, `scripts/` | Framework, Worker, Sites and local-preview integration |
| `.openai/hosting.json` | Existing Sites project identity and storage bindings |

The main UI is currently concentrated in `app/ledger-app.tsx`. Put reusable domain rules in `lib/poker.ts` and enforce permissions in backend functions, even when controls are hidden in the UI. The `examples/` and connector support files are starter infrastructure; the core ledger has no external connector dependency.

## First local run

Use Node **22.13 or newer** and npm. A clean checkout defaults to the portable execution profile. No production database export or real ChatGPT credentials are needed for local development.

```bash
npm ci
npm run build
```

The build produces `dist/server/wrangler.json`, needed for local database commands. On a fresh local database, apply both migrations in this order:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_massive_the_anarchist.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_nebulous_pandemic.sql
npm run dev
```

Open the localhost URL printed by the server, normally `http://127.0.0.1:5173`. The portable preview provides a mock signed-in account. Local D1 state persists in `.wrangler/state`; it is separate from production.

These direct SQL commands do not maintain a migration-applied ledger. Run each file once against a given local database; rerunning can produce “table/column already exists.” When a new migration is added, apply only that new file to an existing local database.

The `DB` binding and placeholder local database ID are configured in `vite.config.ts`. Sites injects production bindings at deployment. `.sites-runtime/` contains ignored tool state, not application source. For file-watching issues in a sandbox, `CHOKIDAR_USEPOLLING=true npm run dev` enables polling.

## Data model

| Table | Meaning and key constraints |
| --- | --- |
| `accounts` | Stable authentication user ID, display name, unique four-character friend code |
| `profiles` | Ledger name/currency keyed by owner ID; distinct from account creation |
| `sessions` | Host-owned game, date/times, currency, status, revision, last operation and optional unique invite token |
| `players` | Session player; nullable `account_id` distinguishes registered members from named guests |
| `entries` | Individual initial buy-in/rebuy amounts and automatically recorded timestamps |
| `friendships` | Canonically sorted account pair, requester, pending/accepted status; unique pair |
| `social_limits` | Per-account action counters in five-minute windows |

Sessions cascade-delete players and entries. The `(session_id, account_id)` unique index prevents duplicate registered membership while permitting multiple guests with null account IDs. A partial unique index permits one active hosted session per owner; users can still participate in other hosts’ sessions.

Legacy host player rows with no `account_id` are interpreted as belonging to the session owner. Guests are never linked to accounts through name or email matching.

## Business rules

- Money is stored as integer minor units: `10000` means ₹100.00. Parse user text with `parseMoney`; avoid floating-point arithmetic for stored amounts.
- INR is the new-user default; saved currency choices remain supported. New session drafts default to group mode and Texas Hold’em.
- Buy-ins/rebuys are positive. Cash-out can be null (unknown) or zero (known zero); these are different states.
- A joined or directly added registered player can have no entries while waiting for the host to record a buy-in. Completed sessions require an initial buy-in and cash-out for every player.
- Exactly one player in a host-submitted session is marked `isSelf`. Participant responses mark the viewer’s own player as self for personal calculations.
- `start` is either `YYYY-MM-DD` or an ISO timestamp. Exact times are optional. Do not turn a date-only value into an invented duration.
- Completed sessions contribute to profit and counts. Hourly results use only completed sessions with a positive measured duration and the profit from those same sessions.
- A completed group with unequal buy-ins and cash-outs requires explicit `acceptImbalance`. This is recorded ledger arithmetic, not a payment settlement integration.
- Overview totals filter to the profile currency; there is no currency conversion.
- Limits include 30 players per session and 100 entries per player. Treat `lib/poker.ts` as the authoritative validation definition.

## Authentication and access rules

All API routes call `user(request)`. It requires authenticated user identity and creates the account/code lazily. Mutations require an `Origin` matching the request URL’s origin; reads reject a supplied mismatched origin. JSON responses use `Cache-Control: private, no-store`.

| Viewer | Session access |
| --- | --- |
| Host | All players and amounts, private notes, edit/delete, create/replace invite links |
| Registered participant | Own amounts, shared session metadata and registered-player roster; no mutation rights |
| Signed-in nonmember | No ledger access; can inspect minimal invite details and explicitly join an active group with a valid link |
| Anonymous visitor | Sign-in screen; no API ledger access |

The participant response excludes other players’ amounts, host notes and invite token. The roster intentionally exposes registered players’ names and friend codes for friend requests. Named guests have no account access.

A host may directly add an accepted friend. Anyone signed in may join through a valid invite without friendship. Joining creates an empty player record, creates a profile if needed, and increments the session revision. Completed sessions reject new members; existing members can reopen them.

Friend requests require recipient acceptance. Unfriending preserves session membership. Removing a player from a session revokes that player’s access/history for that session. Deleting the session removes it for all members.

Friend codes are strings from `0000` to `9999`, providing capacity for 10,000 accounts. Uniqueness is enforced by the database. Codes identify accounts; authentication still determines permissions. The implementation currently limits friend-code attempts to 15 and join attempts to 30 per account per five-minute window.

## API reference

Requests and responses use JSON. Follow the schemas/types in `lib/poker.ts` for full session shapes. Unknown or unavailable resources may deliberately use 404 to avoid revealing ownership.

| Method and route | Input | Result |
| --- | --- | --- |
| `GET /api/ledger` | None | `{profile, sessions}` filtered for the viewer |
| `PUT /api/settings` | `{name, currency}` | Updated ledger; currency changes blocked while hosting saved sessions |
| `POST /api/sessions` | `{session, operationId, acceptImbalance?}` | Create a hosted session; updated ledger |
| `PUT /api/sessions` | Same, including current `session.revision` | Replace the hosted session aggregate; updated ledger |
| `DELETE /api/sessions?id=…&revision=…` | Query parameters | Remove the owned session at that revision; updated ledger |
| `GET /api/friends` | None | `{me, items}` with codes and relationship states |
| `POST /api/friends` | `{code: "1234"}` | Request friendship; updated social data |
| `PATCH /api/friends` | `{id, action: "accept" \| "remove"}` | Accept, decline, cancel or unfriend; updated social data |
| `POST /api/invites` | `{sessionId, rotate?: boolean}` | Host creates/reads/replaces token: `{token}` |
| `GET /api/invites?token=…` | UUID token | Minimal authenticated invitation metadata |
| `PUT /api/invites` | `{token}` | Join or reopen membership: `{id: sessionId}` |

Errors use `{error: string}` with an HTTP status. Common statuses are 400 (input/domain rule), 401 (sign-in required), 403 (permission/origin), 404 (unavailable resource), 409 (conflict), 413 (body too large), 429 (throttle), and 503 (unexpected storage/runtime error). The body reader limits JSON text to 250,000 characters.

## Writes, refresh and concurrency

A save is a complete session aggregate, not a patch. The server checks host ownership, currency and linked-player eligibility before applying an atomic D1 batch. The initial session update compares `revision`; dependent row changes are guarded by the same owner and write operation.

Reuse the same `operationId` when retrying an identical pending save. `last_write` recognizes a retry of the most recent successful operation; this is not an unlimited history of all operation IDs. A stale revision produces 409 and requires a fresh read before editing again. Preserve these guards when changing persistence.

The UI refreshes the ledger about every 15 seconds and on focus, except while editing or saving. Friends refresh when entering the Friends tab or completing an action. There are no WebSockets or offline writes. Unsaved drafts are in React state and disappear on reload.

## Checks and development workflow

```bash
node node_modules/typescript/bin/tsc --noEmit --incremental false
node --experimental-strip-types --test tests/poker.test.mjs
npm run build
```

For integration tests, first build and apply local migrations. Start the built Worker in one terminal:

```bash
npm start -- --port 5180
```

Then run in a second terminal:

```bash
node tests/api.test.mjs
node --experimental-strip-types tests/social-api.test.mjs
```

The tests target only `127.0.0.1:5180`, use disposable user identities, and exercise the local Worker with synthetic trusted headers. They cover ownership, concurrency, invitations, friend acceptance, participant privacy, date-only results and throttling. This does not replace checking a real hosted ChatGPT sign-in/return-to-invite flow. Test cleanup removes created sessions; some basic API-test profile/account fixtures may remain in local storage.

For UI changes, check phone and desktop widths, form defaults and labels, keyboard navigation, loading/error states and existing-session editing. For permission changes, exercise host, member, outsider and anonymous identities. Never rely solely on hidden buttons to enforce access.

## Schema changes and publication

1. Update `db/schema.ts`.
2. Run `npm run db:generate` and review the SQL and Drizzle metadata.
3. Apply the new SQL once to the local database and exercise both existing and new records.
4. Keep old applied migration files unchanged. Commit the schema, new migration and metadata together.

GitHub stores source; pushing a commit does not automatically deploy this application. No GitHub deployment workflow is configured. The existing live application is published through the Sites workflow: build/package the exact source commit, synchronize it to the Site source repository, save a version and deploy it. Sites applies production migrations on publication.

`.openai/hosting.json` identifies the existing Stackd Site. Preserve it when maintaining that Site. If making a separate deployment, register/configure a new project with its own bindings and authentication. The GitHub release checkout and Sites checkout are separate; changes must be synchronized deliberately before publication.

Version metadata is in `package.json` and the root package entry in `package-lock.json`. Keep these and the README consistent. Tag the final release commit `v1.0.0` after documentation and code are ready; use a new version for subsequent published releases.

## Troubleshooting and repository hygiene

- **Missing table/column:** check that both initial migrations and any later migrations were applied to the same `.wrangler/state` directory used by the server.
- **Missing `DB` binding:** inspect `vite.config.ts`, `.openai/hosting.json`, and the generated Worker configuration.
- **403 on a local mutation:** include a matching `Origin`; do not disable this check to make a test pass.
- **401 after deployment:** inspect the Sites sign-in/dispatcher path and return URL. Do not accept client-supplied identity as a workaround.
- **409 while saving:** reload the latest session, then reapply the intended edit. Another save or invite join may have changed its revision.
- **Currency appears fixed:** hosted saved sessions prevent currency changes; no automatic conversion exists.
- **Local sign-in differs from production:** the development mock is intentional; hosted authentication must be tested separately.

The repository excludes dependencies, build output, environment files, local databases, credentials and compiler caches. Commit lockfiles, source and migrations. Do not commit real player records, API tokens, private keys or production database exports. CSV output neutralizes spreadsheet formula prefixes; preserve that protection when modifying exports.
