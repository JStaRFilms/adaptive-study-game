# Public accounts and free-tier AI access

Status: local implementation in progress on `revival/openrouter-luna`. On the owner's authorized, initially empty Neon project `still-dream-28471092`, branch `br-misty-king-b4a7jfuq`, Better Auth's four tables and the two app tables were applied. Local email/password registration, session checks, sign-out, sign-in and concurrent quota admission passed; the synthetic test account and usage rows were removed. Google OAuth, two-account browser testing, public spending controls and Vercel deployment remain undone. The Luna and pnpm gateway was committed at `24cf069`; the Vercel AI gate remains closed by default. [DeferredWork.md](DeferredWork.md) lists later work.

## Goal and agreed scope

Let a student sign in with Google, use study data stored locally under that account, and make AI requests within a fixed free tier. Until Google credentials are available, Better Auth can offer email/password test accounts only when local development sets `AUTH_DEV_PASSWORD_ENABLED=true`. There is no email verification or password recovery yet. Vercel deployments disable password login and registration. Self-host Better Auth in same-origin Vercel Functions, with Neon Postgres for identities, profiles and usage records. Do not enable Neon Auth or Neon AI Gateway for this release. Study sets do not sync between devices. No paid plans or public email sign-in.

A public launch needs verified identity on every AI endpoint, limits that survive serverless restarts and a site-wide spending ceiling. A client-side counter is never a quota. Keep the production AI gate closed until the owner approves the target and validation results.

## Client and server

- The Vite client uses a same-origin Better Auth handler. Local development offers email/password test accounts without Google credentials. The Google button appears only when both Google OAuth credentials are configured; password login is disabled on Vercel. Better Auth maintains a secure session cookie. The browser must never receive a Neon database password, OAuth client secret or AI provider key.
- Mount `App` and its data hooks only after resolving the signed-in user. Use a distinct IndexedDB database and settings key per auth user ID, with a fresh application state on account switch. This prevents accidental UI crossover, but browser-local data is not encrypted. Another person with access to the same browser profile may still inspect local data.
- `api/ai.ts` and `api/chat.ts` read and validate the Better Auth session on the server, derive the user ID from it, and return 401 before provider access when it is missing. Protect cookie-authenticated POST endpoints against cross-site requests. Never trust a client-supplied user ID, role or usage tier.
- A server-only Neon connection creates a profile if missing, checks fixed per-user and global daily unit budgets in a transaction, then calls OpenRouter or Gemini. Admission charges units even if the provider fails. Quiz generation costs one unit for the entire quiz, streamed feedback costs three, and a reading layout costs ten. The canvas UI limits selection to eight topics; a custom prompt adds one topic-analysis request and uses up to eight generated topics. Over-limit canvas selections are rejected before admission. Video sources add one unit each per request. Units do not measure tokens or actual cost.
- Add an abuse control outside per-account quotas. Otherwise anyone can create new Google accounts and repeat the free allowance. Choose and test a durable per-IP or edge limit, plus a provider-side spend ceiling, before public release.

A same-origin auth handler avoids relying on third-party session cookies. Test login on the planned production domain and Safari anyway. Configure the owner's Google OAuth client credentials, authorized callback URL and Better Auth trusted origins for development and production. Neon Managed Auth's shared Google credentials do not apply to our self-hosted setup.

## Data flow

1. Local test users sign in with email/password, or Google redirects through the Better Auth handler when configured. Better Auth persists a user and session in Neon and sets a session cookie. The app opens only that user's local IndexedDB store.
2. The client posts an AI request to the same-origin Vercel Function with the study material needed for that task. The browser sends its session cookie automatically.
3. The function checks the request origin, resolves the Better Auth session, checks request size and basic shape, and atomically charges allowance in Neon. It rejects unauthenticated or over-limit requests without contacting a model.
4. The function calls Luna or the Gemini-only path and sends the response. Study content stays in IndexedDB unless included in that AI request. Neon does not store study content in this phase.
5. Signing out unmounts the app, drops in-memory study data and returns to sign-in. The local database remains on the device unless the user deliberately clears it.

Review-chat history in account-scoped IndexedDB omits the client-generated greeting and retains the focused-quiz offer for display on reopening. Neither is sent to the model as a past reply. Clearing a reading canvas stores a null layout and empty chat history, then rebuilds the tutor context from the empty canvas. No Neon study-content table is involved.

The old anonymous IndexedDB and localStorage keys stay untouched on sign-in. In Data Management, a signed-in user can review record counts, download an anonymous backup, then explicitly import that JSON into the current account. Export the current account first: the existing import merges by ID and may overwrite collisions. On browsers without `indexedDB.databases()`, old localStorage records can be reviewed; use an existing JSON backup for the old IndexedDB database. Account switching must never display the previous account's records.

## Database schema

Better Auth owns its user, session, account and verification tables in Neon Postgres. The applied app schema contains:

- `profiles`: auth user ID as primary key and creation time. All accounts use the same free tier in this release.
- `ai_daily_usage`: UTC date, scope, user ID and charged units. A global row and one row per user share the same transaction. There is no event log, refund logic or token-based accounting yet.

`server/sql/001_public_accounts.sql` records the applied app schema. `server/quota.ts` locks and charges both rows in a transaction before a provider call; failed calls are charged to avoid a failure loop bypassing the budget. The local test configuration uses 25 daily units per user and 100 globally; these are not approved public limits. `AI_MAX_OUTPUT_TOKENS` must also be set between 1 and 16384. It bounds OpenRouter and Gemini text output but not YouTube extraction cost. Units are not dollars: configure an independent provider spending cap and abuse control before launch. The first release does not add cloud study-set tables. No production or development migration may run without an authorized, confirmed Neon branch.

## Work order and checks

1. Done: confirmed the owner's Neon project and branch ID against the database's own settings and verified no existing public tables. Applied Better Auth and app tables with no Vercel deployment. The connection string lives only in ignored `.env.local`; the owner plans to rotate the password later.
2. Done: tested local email/password sign-up, session lookup, sign-out and sign-in against Neon. Removed the synthetic user and verified no account, profile or quota rows remain. Google OAuth still needs credentials and a deliberate account-linking test.
3. Done for the admission path: two concurrent reservations for one user admitted exactly one when both daily limits were one. Before public use, agree on limits, test provider denial and the remaining video, grounded search, streaming chat and reading-canvas paths. Denied requests must not reach a provider.
4. Test Chrome and Safari login, local and preview Vercel functions, export/import, provider mock calls and a small live test only after the owner authorizes spend. Record request-cost observations before setting production limits.
5. Review abuse controls and account deletion/export behavior. Enable `AI_API_ENABLED` on a confirmed production target only after a separate approval.

No Vercel AI SDK, billing integration, cloud sync or object-storage migration is required for this release.
