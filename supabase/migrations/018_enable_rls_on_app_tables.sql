-- 018_enable_rls_on_app_tables.sql
-- Enable RLS on remaining application tables so PostgREST (anon / authenticated)
-- cannot read or write them directly. The Express API uses the service-role key,
-- which bypasses RLS. No policies are added on purpose.

do $$
declare
  t text;
begin
  foreach t in array array[
    'teams',
    'team_members',
    'trips',
    'trip_members',
    'availability',
    'destinations',
    'itinerary_items',
    'bookings',
    'budgets',
    'budget_categories',
    'expenses',
    'expense_splits',
    'tasks',
    'documents',
    'approvals',
    'comments',
    'notifications',
    'activity_logs',
    'availability_options',
    'settlement_payments',
    'trip_email_invites'
  ]
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;
