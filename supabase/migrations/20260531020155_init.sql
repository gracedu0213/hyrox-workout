-- Hyrox tracker initial schema:
--   profiles      1:1 with auth.users  (first_name, gender)
--   workout_logs  per-user training log; flexible fields live in `data jsonb`
-- RLS: each user can only read/write their own rows.

-- Shared trigger to keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles ---------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  gender      text check (gender in ('M', 'F')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: owner can select"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: owner can insert"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles: owner can update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: owner can delete"
  on public.profiles for delete
  using (id = auth.uid());

-- workout_logs -----------------------------------------------------------
create table public.workout_logs (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  day_id      text,
  date        date not null,
  kind        text check (kind in ('plan', 'custom', 'rest')),
  status      text check (status in ('planned', 'logged')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index workout_logs_user_date_idx on public.workout_logs (user_id, date desc);
create index workout_logs_user_day_idx  on public.workout_logs (user_id, day_id) where day_id is not null;
create index workout_logs_user_updated_idx on public.workout_logs (user_id, updated_at desc);

create trigger workout_logs_set_updated_at
before update on public.workout_logs
for each row execute function public.set_updated_at();

alter table public.workout_logs enable row level security;

create policy "workout_logs: owner can select"
  on public.workout_logs for select
  using (user_id = auth.uid());

create policy "workout_logs: owner can insert"
  on public.workout_logs for insert
  with check (user_id = auth.uid());

create policy "workout_logs: owner can update"
  on public.workout_logs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "workout_logs: owner can delete"
  on public.workout_logs for delete
  using (user_id = auth.uid());
