# Deferred work for public accounts

This is a handoff for later agents, not a claim that the features below have shipped. Check the current branch, database schema, deployment settings and this document before starting a task. Do not run a Neon migration or change a live Vercel deployment without the owner's approval and a confirmed target.

## Decisions and launch boundary

The agreed first release uses Google sign-in, a fixed free tier and browser-local study data. Accounts and quotas use Neon. Study sets and progress do **not** sync between devices in this first phase. Additional sign-in methods, paid plans and cloud sync are later work.

The following work is **required before a public launch**, not deferred:

- Complete Google sign-in, server-side session verification, profile creation and account isolation. Neon Managed Auth is the proposed provider, not yet integrated. For production, configure the owner's Google OAuth credentials and trusted redirect domains.
- Check identity and enforce per-user quotas before *every* `/api/ai` and `/api/chat` call, including video extraction, audio, grounded search and streamed chat. Decide the actual free-tier numbers with the owner. Include an overall spend ceiling and abuse controls so creating many accounts cannot bypass limits.
- Separate each signed-in user's browser data. Never show one user's IndexedDB records to another user on the same browser. Offer an explicit, reversible way to claim existing anonymous data; do not silently attach it to the first Google account that signs in. Keep export/backup working.
- Leave `AI_API_ENABLED` off on Vercel until access control, quotas and local tests pass. No production rollout is authorized by this document.

The current `revival/openrouter-luna` work is a Vite/React app with Vercel Functions. `utils/db.ts` defines IndexedDB v3 stores named `studySets`, `quizHistory`, `predictions` and `srsItems`; `hooks/useSettings.ts` uses localStorage. `types.ts` contains the stored shapes. `components/setup/DataManagementModal.tsx` exports and imports the four IndexedDB stores. `api/ai.ts` and `api/chat.ts` have a deployment gate but no authentication or durable quota enforcement yet. The separate `Feature_study_creation` worktree is a different Next.js rewrite, not the baseline for these tasks.

### First-release design, not yet built

The React client will sign in with Google, keep study records in an account-isolated browser store, and send a session token with AI requests. Each Vercel Function will verify that token before reading the user's profile or reserving free-tier usage in Neon. Only then will it send study material to OpenRouter or Gemini. The function will record the outcome and apply per-user and site-wide limits. It must not accept a client-supplied user ID or plan as authority.

Neon Managed Auth would own its user and session records. Proposed app-owned tables are `profiles` keyed by auth user ID, plus usage and quota-reservation records keyed by user ID, time window and AI action. The owner has not chosen numeric limits or approved a schema migration. No app-owned study-set table is needed for the first local-data release. This plan must be reviewed against the actual Neon project and Vercel session-verification path before coding it.

## Follow-up 1: Cloud sync for study data

**Goal.** A signed-in student can use study sets and progress across devices without losing their current browser data.

**Start after.** Public-launch identity, account isolation and quotas work. Agree on the ownership model and decide whether file attachments are part of the first sync release.

**Scope.** Design account-owned records in Neon for study-set text and metadata, quiz history, predictions and spaced-repetition items. Include reading layouts and chat history currently embedded in `StudySet`, or document why they remain local. Decide how settings move from localStorage. Keep IndexedDB as an offline cache only if the sync and conflict rules are specified. Do not put base64 files from `StudySet.persistedFiles` into Postgres.

Provide an opt-in import from the old IndexedDB database and existing JSON backups. Preview the record counts and destination account, create a backup, and make the import idempotent. Specify what happens on offline edits, concurrent devices, sign-out, account deletion and interrupted imports before coding sync. All server reads and writes must derive ownership from the verified session, never from a client-supplied `userId`.

**Database design to review, not an applied migration.** Account-owned `study_sets`, `quiz_results`, `predictions` and `srs_items` records need stable IDs, an owner ID, timestamps and a conflict/version field if clients can write offline. Attachment references would point to object storage metadata. Keep auth-owned tables separate from app data. Update this section with the actual schema and migration plan before applying it.

**Done when.** Two accounts on one browser and one account on two browsers cannot read or overwrite each other's records; a new device can load its owner's records; an anonymous user's data stays untouched until they approve import; interrupted or repeated imports do not duplicate records; export and restore still work. Test ownership on every API route and migration with representative legacy records.

Likely files to inspect include `utils/db.ts`, `types.ts`, `hooks/useStudySets.ts`, `hooks/useQuizHistory.ts`, `hooks/usePredictions.ts`, `hooks/useSRS.ts`, `hooks/useSettings.ts` and `components/setup/DataManagementModal.tsx`. Choose API and migration files after reviewing the actual app.

## Follow-up 2: Attachment storage and large requests

**Goal.** PDFs, images and audio can follow a student across devices without being stored as base64 in Neon or pushed through oversized function requests.

**Start after.** Define cloud study-set ownership. The storage provider and size/retention limits need the owner's approval.

**Scope.** Choose object storage, issue short-lived upload/download permissions tied to the signed-in owner, and persist only attachment metadata and object references in Neon. Migrate existing `persistedFiles` only when the user opts in and can see what will upload. Revisit `utils/fileProcessor.ts`, which currently keeps base64 copies, and the request limits in `api/ai.ts` and `api/chat.ts`. Set upload size, accepted formats, processing and deletion rules before implementation. A signed URL is not permission to fetch another account's file.

**Done when.** A large document no longer fails because it is sent as one Vercel JSON body; cross-account attachment access fails; deleting an account or study set follows the agreed retention rules; old local-only files still open until their owner migrates them. Test cancelled uploads, missing objects and upload limits.

## Follow-up 3: More sign-in methods

**Goal.** Allow people without Google accounts to sign in, if the owner decides this is needed.

**Start after.** Google sign-in and account ownership are stable. Choose email magic links, one-time codes or passwords before implementation; no method has been approved yet.

**Scope.** Add the chosen method to the same auth identity, not a parallel user table. Decide email delivery, verification, recovery and account-linking rules. Profile data, free-tier usage and study data must survive a legitimate account link. Do not let an unverified matching email claim a Google user's account.

**Done when.** Registration, sign-in, recovery, sign-out and account linking pass browser and server tests; duplicate accounts do not grant a fresh quota; Google-only users keep access.

## Follow-up 4: Paid plans

**Goal.** Offer paid limits only after real free-tier usage and costs justify them.

**Start after.** Per-user usage and overall spend controls have been running reliably. The owner must choose a billing provider, prices and entitlements; none are selected.

**Scope.** Add plan entitlements and billing records without treating a client-side plan label as permission. Verify signed billing events, handle retries and refunds idempotently, and keep AI costs bounded for both free and paid users. Account deletion and cancellation need explicit rules.

**Done when.** Entitlement changes follow verified server events, a forged browser request cannot upgrade a plan, duplicate events do not double-apply, and spending caps still stop runaway usage. Never connect production billing or create products without approval.

## Follow-up 5: Model and source cost experiments

**Goal.** Change model routing only when measured quality or cost supports it.

**Start after.** Record per-task usage and costs for the Luna-first app, with anonymized or consented evaluation material. Decide a spending budget for tests.

**Scope.** `services/aiConstants.ts` currently routes routine work to `openai/gpt-6-luna`; chat uses the same model. Compare a stronger OpenRouter model and low or medium reasoning on exam grading and predictions using repeatable examples before assigning it by task. Check exact model IDs, capabilities and current prices. Do not silently escalate a request to a higher-cost model or add an unbounded fallback.

Gemini currently handles YouTube video extraction, uploaded audio or other non-image media, and Google-grounded search. `server/provider.ts` extracts video content; a warm function may reuse that result for 30 minutes. OpenRouter web search has its own charges and is not a YouTube transcript API. Consider replacing any of these paths only after testing source accuracy, citations, quota behavior and cost against the current flow. Preserve `Quiz.webSources` when changing grounded search.

**Done when.** A documented comparison includes quality, latency and cost per task; the owner approves new routing; a fixed budget and regression tests cover the chosen paths. Vercel AI SDK is not part of this task by default; revisit it only if a concrete implementation problem warrants the dependency.

## Handoff rules

Take one follow-up at a time. Recheck the current implementation and production settings, state the exact schema or service changes, and get approval before migrations, bulk uploads, credential changes, billing work or deployment. Preserve the existing user's data and keep `AI_API_ENABLED` disabled until launch requirements are met. Update this document when a task ships, rather than treating unchecked plans as working features.
