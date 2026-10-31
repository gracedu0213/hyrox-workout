# iOS Native Rebuild — Scope & Roadmap

Rebuild the HYROX tracker web app as a **true native SwiftUI iOS app** with a **proper Supabase backend**, at 1:1 feature/visual parity. The existing web app also migrates onto the shared backend so **web + iOS share one account and synced data**.

## Locked decisions
- **Strategy:** hand-built native SwiftUI (not a WebView/Capacitor wrap). iOS 17+, existing XcodeGen scaffold in `ios/` is the seed.
- **Backend:** Supabase (project "The Hyrox App", ref `bhnkoxqhgfoeowwqryra`, already linked). Managed Postgres + Auth + auto REST/Realtime. This is the "easy hosting."
- **Auth:** Sign in with Apple **and** email (magic-link/OTP), via Supabase Auth. RLS keyed on `auth.uid()`.
- **Web app:** migrates from local-only (Dexie/IndexedDB) onto Supabase too — one login, cross-device sync.

## Current state (baseline)
- **Web:** ~7,200 LOC React 19 + Vite + Tailwind PWA on Vercel. 15 routes, 13 pages, ~17 components. All data local (Dexie tables `logs`/`workouts`/`plans`/`workoutTypes` + `localStorage` profile). No backend wired in.
- **Backend:** one migration exists (`profiles` + `workout_logs` with `data jsonb` + RLS). **Missing** tables for custom workouts, user plans, workout types. Not connected to any client.
- **iOS:** stub (~565 LOC) — one demo `ContentView`/`TodayCard`, drifted design tokens, 2 models. No auth/network/persistence/real screens.
- **Tooling present:** Xcode 16.2, XcodeGen, Swift 6, Supabase CLI. ⚠️ No code-signing identity yet — Apple Developer Program ($99/yr) needed before TestFlight/device/App Store.

## Target architecture
```
        Supabase (Postgres 17 + Auth + RLS)          <- single source of truth
        profiles · workout_logs · custom_workouts
        user_plans · workout_types
              ▲                        ▲
   supabase-js │              supabase-swift │
   ┌───────────┴───────────┐   ┌────────────┴───────────┐
   │  Web (React PWA)       │   │  iOS (SwiftUI, iOS 17+) │
   │  Dexie = offline cache │   │  SwiftData/GRDB = cache │
   └────────────────────────┘   └─────────────────────────┘
Curated 12-week plan (60 static days) = bundled JSON, shared by both clients.
Only plan *commitments* live in DB (user_plans row, content type 'curated').
```

## Backend schema work (extend the one migration)
Follow the existing `workout_logs` pattern — a few indexed columns + a `data jsonb` blob holding the whole entity, so it maps 1:1 to the TS/Swift types with minimal column modeling.
- `custom_workouts(id uuid pk, user_id, name, type_id, archived bool, data jsonb, created_at, updated_at)` + owner RLS.
- `user_plans(id uuid pk, user_id, name, color, active bool, archived bool, data jsonb, created_at, updated_at)` + owner RLS.
- `workout_types(id uuid pk, user_id, name, color, created_at)` + owner RLS. Seed the 3 defaults (Running/Functional/Deadhang) per user on first sign-in.
- Extend `workout_logs`: add indexed `workout_id uuid`, `plan_id uuid`, `type_id` (support `getLogsForDay/Plan`); keep rich results (`totalTimeSec`, `roundSplits`, `amrap`, `intervals`, `exercises`, `feltLike`…) inside `data jsonb`.
- Preserve the **`workoutSnapshot`** blob on custom logs so results survive template edits/deletes.
- Sync: last-write-wins on `updated_at` (single-user data); offline-first cache on both clients so the app works at the gym.

## Phased roadmap (~6–8 weeks)

### P0 — Backend foundation — ✅ built locally (pending `db push` to hosted)
- Migration `supabase/migrations/20260701120000_workouts_plans_types.sql`: `custom_workouts`, `user_plans`, `workout_types` (envelope + `data jsonb`), `workout_logs` cross-refs (`workout_id`/`plan_id`/`type_id`, all ON DELETE SET NULL so history survives template deletes), per-user RLS, and an `on_auth_user_created` trigger seeding the 3 default types.
- Auth: **email** enabled (works locally via inbucket); **Apple** provider enabled via env secrets + native redirect scheme `com.gracedu.hyrox://login-callback`.
- Tests: **pgTAP, 31 assertions across `supabase/tests/`, all green** — structure, RLS isolation, cross-user write rejection, trigger seeding, delete-sets-null. Run with `supabase test db`.
- **Remaining:** `supabase db push` to the hosted project (deliberately not done yet — one-way action, needs sign-off); set Apple env secrets; generate TS/Swift types.

**Backend dev quickstart:** `supabase start` (boots stack + applies migrations) · `supabase test db` (pgTAP) · `supabase db push` (apply to hosted — ask first).
**Auth secrets** (hosted dashboard + local shell/`.env`, never committed): `SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID` (bundle id + Services ID, comma-separated), `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` (generated from the Apple signing key).

### P1 — Web onto Supabase — ⏸ deferred (by request)
Add `@supabase/supabase-js`, auth screens, Supabase-backed data layer (Dexie becomes offline cache). **Deferred:** there is **live user data in the web app's local IndexedDB that must not be lost.** The local→cloud migration needs a deliberate design — a per-device, idempotent one-time export→upsert (IndexedDB → Supabase) with dedupe by id, run after sign-in, keeping local as cache and verifying counts before/after. Treat this as its own mini-project, not a side effect of wiring the client.

### Environments (local / staging / production)
Migrations are environment-agnostic and flow **local → staging → prod**. Runbook + secrets policy in `supabase/README.md`. Staging = "The Hyrox App" (`bhnkoxqhgfoeowwqryra`, West US); production is a separate project **created at launch** (not yet provisioned). Per-env config lives in `[remotes.*]` blocks.

### P2 — iOS data + auth + logic — ✅ done (against local Supabase)
- ✅ Extensible domain model in Swift: `WorkoutFormat` + `PlanContent` + `BlockRow`/`PlanSlot` as `type`/`kind`-discriminated unions whose Codable JSON matches Supabase `data` exactly (`ios/HyroxWorkout/Models/Workout.swift`, `UserPlan.swift`); `DayOfWeek` widened to all 7. Adding a variant = add a case; the compiler flags every switch to update — no migration.
- ✅ `WorkoutSetup` hand-written Codable (web `{type: …}` shape) + full `WorkoutLog` Codable domain model (snapshot, splits, AMRAP, intervals, exercises) replacing the stale SwiftData stub.
- ✅ Curated 12-week plan extracted to shared JSON: `npm run export:plan` generates `ios/HyroxWorkout/Resources/curated_plan.json` from `src/plan.ts` (single source of truth); Swift decodes all 60 days (pinned by tests).
- ✅ All logic modules ported with tests: `Format`/`DateUtils`/`LogSummary`/`PlanStats`/`Progress`/`Workouts`/`PlanHelpers`/`LogTypeResolver` (Mon-first weeks, streak grace, setup summaries byte-identical to web).
- ✅ Repositories for all tables (`workout_logs`/`user_plans`/`workout_types`/`profiles` + existing `custom_workouts`), envelope + `data jsonb` mapping, `created_at` preserved across round-trips.
- ✅ Offline-first store: `LocalStore` (atomic per-table JSON files — the Dexie analog) + `AppStore` (in-memory source of truth, db.ts-equivalent queries/mutations) + push-then-pull LWW sync with a persisted pending-op queue. **Live two-device sync integration test green** (create → push → fresh store pull → byte-identical; deletes propagate).
- ✅ Design tokens aligned to web tailwind exactly (bg `#1a1a1a`, accent `#F0E040`, category colors, signature 4-stop gradient).
- ⏭ Remaining: fill staging anon key (Supabase dashboard) before running a release build against hosted.

### P3 — iOS core screens — ✅ built (visual pass in simulator done; on-device QA pending)
App shell (3-tab nav + header + auth gate + first-run profile sheet), Home/Today (swipeable rail + dots, heatmap/month toggle, streak hero, upcoming, last-log, Fab, cadence cards + log sheet), Plan library, Program (curated/cadence/sequenced bodies, week strips), Progress (sparklines + trend chips), Log detail (result sections + collapsible prescription).

### P4 — iOS builders + logging — ✅ built
Log flow (setup-driven result sections), Custom log, Workout builder (blocks/rows/formats), Plan builder (cadence/schedule/flexible; the web's draft round-trip is unnecessary natively — pushing the workout builder preserves state), Day page, Workout detail; primitives TimeInput (stopwatch digit model), TypePicker, FeltPicker, Menu pickers, bottom sheets, ⋯ menus, native confirm alerts.

### P5 — Delight + native polish — ✅ built
Canvas confetti + full-screen CelebrationScreen (celebrate flow with greeting hash, stat tiles), real haptics (`UINotificationFeedbackGenerator`), snap rails, heatmap tile-splitting for multi-type days, sparklines, brand gradients/sparkle motifs, sticky save bars, empty states.
DEBUG launch hooks for screenshot QA: `SIMCTL_CHILD_AUTOLOGIN=1`, `SIMCTL_CHILD_SEED_DEMO=1`, `SIMCTL_CHILD_START_TAB=plan|progress`.

### P6 — Ship (~3–5 d) — ⛔ blocked on Apple Developer account
App icon, Apple Developer enrollment ($99/yr), **Sign in with Apple** (needs the entitlement + Services ID + signing key secrets; email OTP already works), privacy manifest, TestFlight, App Store submission. Also pending sign-off (not account-related): `supabase db push` to hosted staging.

## Screen-by-screen build manifest
The exhaustive per-page / per-component behavior spec (all 13 pages, ~17 components, all logic modules, and cross-cutting behaviors) is the authoritative checklist for P3–P5. See the feature inventory captured during scoping.

## Risks / notes
- **Token drift** already exists (iOS `bg #0A0A0A`/`accent #FFD500` vs web `bg #1a1a1a`/`accent #F0E040`). Establish one token source; ideally generate Swift tokens from `tailwind.config.js`.
- **Curated content duplication** — extract the 12-week plan to shared JSON consumed by both clients; avoid hand-porting `plan.ts` (~800 lines) into Swift.
- **Drop web-only shims:** `UpdatePrompt` (PWA), keyboard-dismiss, `navigator.vibrate` → replace with App Store updates + native haptics. `RpeSlider.tsx` is **unused** — skip it.
- **Onboarding:** auth adds a gate beyond the existing profile dialog — merge into one first-run flow (sign in → name + weight preference).
- **Two codebases** to keep in parity going forward (the accepted cost of going native).
