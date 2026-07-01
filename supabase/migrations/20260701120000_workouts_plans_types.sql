-- P0 backend foundation — custom workouts, user plans, workout types, and the
-- log cross-references + auth onboarding that tie them together.
--
-- ── EXTENSIBILITY CONTRACT ────────────────────────────────────────────────
-- Every user-owned entity is an { indexed envelope + `data jsonb` payload }.
-- Only fields the database must FILTER, SORT, or JOIN on are promoted to real
-- columns; everything variant-specific lives in `data`.
--
-- Consequences (this is the whole point):
--   • Adding a new workout FORMAT (e.g. tabata) or a new plan SHAPE (e.g. a
--     periodized block) is a new discriminated-union variant serialized into
--     `data`. It needs NO migration and NO change to this schema.
--   • The clients (TS + Swift) own the `data` shape via mirrored discriminated
--     unions keyed on a `type` discriminator. The DB stays shape-agnostic.
--   • Add a column here ONLY when you need to query on the field itself.
--
-- The pre-existing `workout_logs` table already follows this pattern (flexible
-- result fields live in its `data jsonb`); we extend it, not reshape it.
--
-- Curated 12-week program: it is NOT a magic primary key. A committed curated
-- plan is an ordinary `user_plans` row identified by `data->'content'->>'type'
-- = 'curated'`. This keeps ids uniformly uuid and avoids a sentinel string in a
-- primary key.

-- ── workout_types ─────────────────────────────────────────────────────────
-- User-defined labels/colors (Running, Functional, …). First-class because the
-- UI lets users create/edit them and logs/workouts reference them by id.
create table public.workout_types (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index workout_types_user_created_idx on public.workout_types (user_id, created_at);

create trigger workout_types_set_updated_at
before update on public.workout_types
for each row execute function public.set_updated_at();

alter table public.workout_types enable row level security;

create policy "workout_types: owner can select"
  on public.workout_types for select using (user_id = auth.uid());
create policy "workout_types: owner can insert"
  on public.workout_types for insert with check (user_id = auth.uid());
create policy "workout_types: owner can update"
  on public.workout_types for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workout_types: owner can delete"
  on public.workout_types for delete using (user_id = auth.uid());

-- ── custom_workouts ───────────────────────────────────────────────────────
-- User-authored workouts. `format`, `blocks`, `intensity`, `notes` all live in
-- `data` — adding a new WorkoutFormat variant never touches this table.
create table public.custom_workouts (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type_id     uuid references public.workout_types(id) on delete set null,
  archived    boolean not null default false,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index custom_workouts_user_created_idx on public.custom_workouts (user_id, created_at desc);
create index custom_workouts_user_updated_idx on public.custom_workouts (user_id, updated_at desc);
-- Partial index for the common "list my non-archived workouts" query.
create index custom_workouts_user_active_idx on public.custom_workouts (user_id) where archived = false;

create trigger custom_workouts_set_updated_at
before update on public.custom_workouts
for each row execute function public.set_updated_at();

alter table public.custom_workouts enable row level security;

create policy "custom_workouts: owner can select"
  on public.custom_workouts for select using (user_id = auth.uid());
create policy "custom_workouts: owner can insert"
  on public.custom_workouts for insert with check (user_id = auth.uid());
create policy "custom_workouts: owner can update"
  on public.custom_workouts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "custom_workouts: owner can delete"
  on public.custom_workouts for delete using (user_id = auth.uid());

-- ── user_plans ────────────────────────────────────────────────────────────
-- Committable programs. `name`, `color`, `icon`, `content` (curated | sequenced
-- | pool), `goalPerWeek`, `durationWeeks`, `startDate` all live in `data`. Only
-- the fields we filter on (`active`, `archived`) are promoted to columns.
create table public.user_plans (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  active      boolean not null default false,
  archived    boolean not null default false,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index user_plans_user_created_idx on public.user_plans (user_id, created_at desc);
create index user_plans_user_updated_idx on public.user_plans (user_id, updated_at desc);
-- Partial index for the common "my active plans" query.
create index user_plans_user_active_idx on public.user_plans (user_id) where active = true and archived = false;

create trigger user_plans_set_updated_at
before update on public.user_plans
for each row execute function public.set_updated_at();

alter table public.user_plans enable row level security;

create policy "user_plans: owner can select"
  on public.user_plans for select using (user_id = auth.uid());
create policy "user_plans: owner can insert"
  on public.user_plans for insert with check (user_id = auth.uid());
create policy "user_plans: owner can update"
  on public.user_plans for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_plans: owner can delete"
  on public.user_plans for delete using (user_id = auth.uid());

-- ── workout_logs cross-references ─────────────────────────────────────────
-- A log may reference a custom workout, a committed plan, and/or a type. All
-- are ON DELETE SET NULL: deleting a template must NOT delete its history — the
-- log keeps its self-contained `workoutSnapshot` (in `data`) and renders fine.
alter table public.workout_logs
  add column workout_id uuid references public.custom_workouts(id) on delete set null,
  add column plan_id    uuid references public.user_plans(id)      on delete set null,
  add column type_id    uuid references public.workout_types(id)   on delete set null;

create index workout_logs_user_workout_idx on public.workout_logs (user_id, workout_id) where workout_id is not null;
create index workout_logs_user_plan_idx    on public.workout_logs (user_id, plan_id)    where plan_id is not null;

-- ── Onboarding: seed each new user's default workout types ────────────────
-- Mirrors the web app's DEFAULT_WORKOUT_TYPES. `created_at` uses the epoch so
-- the three defaults always sort before any user-created type, in a stable
-- order — matching the web's createdAt 0/1/2 convention. `id` is omitted so the
-- table default (gen_random_uuid) fires, sidestepping search_path resolution.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workout_types (user_id, name, color, created_at)
  values
    (new.id, 'Running',    '#5BC0EB', to_timestamp(0)),
    (new.id, 'Functional', '#FF6B6B', to_timestamp(1)),
    (new.id, 'Deadhang',   '#9B59B6', to_timestamp(2));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
