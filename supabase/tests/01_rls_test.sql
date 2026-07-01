-- Behavioral tests: the onboarding trigger, per-user RLS isolation, and the
-- ON DELETE SET NULL rule that keeps logged history when a template is deleted.
-- We impersonate real users by switching to the `authenticated` role (which,
-- unlike the superuser test-runner, is subject to RLS) and setting the JWT
-- `sub` claim that auth.uid() reads. Run with: supabase test db
begin;
select plan(11);

-- Arrange: two users. The on-signup trigger seeds each one's default types. ---
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.com');

select is(
  (select count(*)::int from public.workout_types where user_id = '00000000-0000-0000-0000-00000000000a'),
  3, 'signup trigger seeds user A three default types');
select is(
  (select count(*)::int from public.workout_types where user_id = '00000000-0000-0000-0000-00000000000b'),
  3, 'signup trigger seeds user B three default types');
select is(
  (select array_agg(name order by created_at) from public.workout_types
   where user_id = '00000000-0000-0000-0000-00000000000a'),
  array['Running', 'Functional', 'Deadhang']::text[],
  'defaults are seeded in the canonical Running/Functional/Deadhang order');

-- Act as user A (RLS now applies). Create a workout + a log referencing it. ---
set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-00000000000a';

insert into public.custom_workouts (id, user_id, name, data)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a',
          'A Workout', '{"format":{"type":"amrap","durationSec":600}}');
insert into public.workout_logs (id, user_id, date, workout_id, data)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a',
          current_date, '00000000-0000-0000-0000-0000000000c1', '{}');

select is((select count(*)::int from public.custom_workouts), 1, 'A sees its own workout under RLS');
select is((select count(*)::int from public.workout_types),   3, 'A sees only its own 3 types, not both users''');

-- Switch to user B: A's rows must be invisible. -----------------------------
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-00000000000b';
select is((select count(*)::int from public.custom_workouts), 0, 'B cannot see A''s workout (RLS isolation)');
select is((select count(*)::int from public.workout_logs),    0, 'B cannot see A''s log (RLS isolation)');
select is((select count(*)::int from public.workout_types),   3, 'B sees only its own 3 types');

-- B cannot forge a row owned by A: the INSERT WITH CHECK rejects it. ---------
select throws_ok(
  $$ insert into public.custom_workouts (id, user_id, name)
     values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'spoof') $$,
  '42501', null,
  'B cannot insert a workout owned by A (WITH CHECK blocks cross-user writes)');

-- History survives template deletion: deleting A's workout nulls the log FK
-- but keeps the log row (which still has its self-contained snapshot in data). -
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-00000000000a';
delete from public.custom_workouts where id = '00000000-0000-0000-0000-0000000000c1';
select is(
  (select workout_id from public.workout_logs where id = '00000000-0000-0000-0000-0000000000d1'),
  null::uuid, 'deleting a workout sets its logs'' workout_id to null');
select is(
  (select count(*)::int from public.workout_logs where id = '00000000-0000-0000-0000-0000000000d1'),
  1, 'the log row survives deletion of its workout template');

reset role;
select * from finish();
rollback;
