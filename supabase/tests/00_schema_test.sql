-- Structural contract for the P0 schema: tables, the jsonb envelope, log
-- cross-references, RLS, and the ON DELETE SET NULL behavior that lets history
-- survive template deletion. Run with: supabase test db
begin;
select plan(20);

-- New tables exist ----------------------------------------------------------
select has_table('public', 'workout_types',   'workout_types table exists');
select has_table('public', 'custom_workouts', 'custom_workouts table exists');
select has_table('public', 'user_plans',      'user_plans table exists');

-- The extensibility envelope: a jsonb payload on the variant-shaped entities --
select has_column('public', 'custom_workouts', 'data', 'custom_workouts has a data payload');
select col_type_is('public', 'custom_workouts', 'data', 'jsonb', 'custom_workouts.data is jsonb');
select has_column('public', 'user_plans', 'data', 'user_plans has a data payload');
select col_type_is('public', 'user_plans', 'data', 'jsonb', 'user_plans.data is jsonb');

-- workout_logs gained the cross-reference columns ---------------------------
select has_column('public', 'workout_logs', 'workout_id', 'workout_logs.workout_id added');
select has_column('public', 'workout_logs', 'plan_id',    'workout_logs.plan_id added');
select has_column('public', 'workout_logs', 'type_id',    'workout_logs.type_id added');

-- RLS is enabled on every new table -----------------------------------------
select is((select relrowsecurity from pg_class where oid = 'public.workout_types'::regclass),   true, 'RLS enabled on workout_types');
select is((select relrowsecurity from pg_class where oid = 'public.custom_workouts'::regclass), true, 'RLS enabled on custom_workouts');
select is((select relrowsecurity from pg_class where oid = 'public.user_plans'::regclass),      true, 'RLS enabled on user_plans');

-- Four owner policies (select/insert/update/delete) per table ---------------
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'workout_types'),   4, 'workout_types has 4 RLS policies');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'custom_workouts'), 4, 'custom_workouts has 4 RLS policies');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'user_plans'),      4, 'user_plans has 4 RLS policies');

-- Log FKs are ON DELETE SET NULL (confdeltype 'n') so deleting a template
-- keeps its logged history intact.
select is(
  (select confdeltype::text from pg_constraint
   where conrelid = 'public.workout_logs'::regclass and confrelid = 'public.custom_workouts'::regclass),
  'n', 'workout_logs.workout_id FK is ON DELETE SET NULL');
select is(
  (select confdeltype::text from pg_constraint
   where conrelid = 'public.workout_logs'::regclass and confrelid = 'public.user_plans'::regclass),
  'n', 'workout_logs.plan_id FK is ON DELETE SET NULL');

-- Onboarding trigger seeds default workout types ----------------------------
select has_function('public', 'handle_new_user', 'handle_new_user() exists');
select trigger_is('auth', 'users', 'on_auth_user_created', 'public', 'handle_new_user', 'signup fires handle_new_user');

select * from finish();
rollback;
