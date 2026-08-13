-- seed.sql
-- Sample data for a demo trip so the wired-up UI (members, voting,
-- itinerary, bookings, budget, expenses, tasks, notifications) has
-- something real to show. Safe to re-run — guarded by NOT EXISTS checks,
-- keyed off a fixed trip name so it won't duplicate on a second run.
--
-- Run this in the Supabase SQL editor after 001-007 have been applied.

do $$
declare
  v_org_id uuid;
  v_actor_id uuid;
  v_trip_id uuid;
  v_budget_id uuid;
  v_dest_goa uuid;
  v_dest_gokarna uuid;
  v_dest_pondy uuid;
  v_booking_hotel uuid;
begin
  -- Actor: the first profile in the system (whoever signed up first).
  select id into v_actor_id from public.profiles order by created_at asc limit 1;
  if v_actor_id is null then
    raise notice 'No profiles found — sign up in the app first, then re-run this seed.';
    return;
  end if;

  select organization_id into v_org_id
  from public.org_members
  where user_id = v_actor_id and status = 'active'
  order by created_at asc limit 1;

  if v_org_id is null then
    raise notice 'Actor has no active org membership — nothing to seed against.';
    return;
  end if;

  -- Trip: reuse if it already exists (idempotent re-run), else create.
  select id into v_trip_id
  from public.trips
  where organization_id = v_org_id and name = 'Goa Team Retreat (Sample)';

  if v_trip_id is null then
    insert into public.trips (organization_id, name, description, destination_summary, status, start_date, end_date, currency, created_by)
    values (
      v_org_id,
      'Goa Team Retreat (Sample)',
      'Seeded demo trip — sample members, itinerary, bookings, budget, expenses, and tasks.',
      'Goa, India',
      'planning',
      current_date + 45,
      current_date + 48,
      'INR',
      v_actor_id
    )
    returning id into v_trip_id;
  end if;

  -- Trip member: actor as organizer.
  insert into public.trip_members (trip_id, user_id, role, rsvp_status)
  values (v_trip_id, v_actor_id, 'organizer', 'accepted')
  on conflict on constraint trip_members_unique do nothing;

  -- Budget + categories.
  select id into v_budget_id from public.budgets where trip_id = v_trip_id;
  if v_budget_id is null then
    insert into public.budgets (trip_id, name, total_cents, currency, created_by)
    values (v_trip_id, 'Primary budget', 14000000, 'INR', v_actor_id)
    returning id into v_budget_id;

    insert into public.budget_categories (budget_id, name, allocated_cents, spent_cents, currency)
    values
      (v_budget_id, 'Stay', 6000000, 2200000, 'INR'),
      (v_budget_id, 'Travel', 4000000, 3100000, 'INR'),
      (v_budget_id, 'Food', 2500000, 900000, 'INR'),
      (v_budget_id, 'Activities', 1500000, 0, 'INR');
  end if;

  -- Destination options (for voting).
  select id into v_dest_goa from public.destinations where trip_id = v_trip_id and name = 'North Goa';
  if v_dest_goa is null then
    insert into public.destinations (trip_id, name, country, region, description, estimated_cost_cents, currency, metadata)
    values (v_trip_id, 'North Goa', 'India', 'Goa', 'Beaches, shacks, and an easy flight in.', 14000000, 'INR',
      '{"imageUrl":"https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=80"}'::jsonb)
    returning id into v_dest_goa;
  end if;

  select id into v_dest_gokarna from public.destinations where trip_id = v_trip_id and name = 'Gokarna';
  if v_dest_gokarna is null then
    insert into public.destinations (trip_id, name, country, region, description, estimated_cost_cents, currency, metadata)
    values (v_trip_id, 'Gokarna', 'India', 'Karnataka', 'Quieter beaches, more of a trek.', 11000000, 'INR',
      '{"imageUrl":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"}'::jsonb)
    returning id into v_dest_gokarna;
  end if;

  select id into v_dest_pondy from public.destinations where trip_id = v_trip_id and name = 'Pondicherry';
  if v_dest_pondy is null then
    insert into public.destinations (trip_id, name, country, region, description, estimated_cost_cents, currency, metadata)
    values (v_trip_id, 'Pondicherry', 'India', 'Puducherry', 'French quarter, cafes, and the promenade.', 9500000, 'INR',
      '{"imageUrl":"https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=900&q=80"}'::jsonb)
    returning id into v_dest_pondy;
  end if;

  -- Actor votes for North Goa.
  insert into public.destination_votes (trip_id, destination_id, user_id)
  values (v_trip_id, v_dest_goa, v_actor_id)
  on conflict on constraint destination_votes_unique_per_trip do update set destination_id = excluded.destination_id;

  -- Availability poll: actor marks themselves available for one date range.
  insert into public.availability (trip_id, user_id, start_date, end_date, status)
  values (v_trip_id, v_actor_id, current_date + 45, current_date + 48, 'available')
  on conflict on constraint availability_unique_per_user_range do update set status = excluded.status;

  -- Itinerary.
  if not exists (select 1 from public.itinerary_items where trip_id = v_trip_id and title = 'Flight to Goa') then
    insert into public.itinerary_items (trip_id, title, description, category, start_at, end_at, location_name, sort_order, created_by)
    values
      (v_trip_id, 'Flight to Goa', 'Morning departure', 'travel',
        (current_date + 45) + time '08:00', (current_date + 45) + time '10:00',
        'Goa Airport', 0, v_actor_id),
      (v_trip_id, 'Check in — Beach Resort', 'Resort check-in and welcome drinks', 'lodging',
        (current_date + 45) + time '12:00', (current_date + 45) + time '13:00',
        'North Goa Beach Resort', 1, v_actor_id),
      (v_trip_id, 'Team dinner', 'Beachside restaurant', 'meal',
        (current_date + 45) + time '19:30', (current_date + 45) + time '21:30',
        'Curlies, Anjuna', 2, v_actor_id),
      (v_trip_id, 'Water sports', 'Parasailing and jet-ski', 'activity',
        (current_date + 46) + time '10:00', (current_date + 46) + time '13:00',
        'Baga Beach', 0, v_actor_id);
  end if;

  -- Bookings.
  select id into v_booking_hotel from public.bookings where trip_id = v_trip_id and vendor_name = 'North Goa Beach Resort';
  if v_booking_hotel is null then
    insert into public.bookings (trip_id, vendor_name, booking_type, confirmation_code, status, amount_cents, currency, starts_at, ends_at, created_by)
    values
      (v_trip_id, 'North Goa Beach Resort', 'hotel', 'BR-58213', 'confirmed', 4200000, 'INR',
        (current_date + 45) + time '12:00', (current_date + 48) + time '11:00', v_actor_id),
      (v_trip_id, 'IndiGo', 'flight', 'IND-99213', 'confirmed', 1800000, 'INR',
        (current_date + 45) + time '08:00', (current_date + 45) + time '10:00', v_actor_id);
  end if;

  -- Expenses.
  if not exists (select 1 from public.expenses where trip_id = v_trip_id and title = 'Airport cabs') then
    insert into public.expenses (trip_id, budget_id, title, description, category, amount_cents, currency, paid_by, incurred_on, status, created_by)
    values
      (v_trip_id, v_budget_id, 'Airport cabs', 'Round trip cabs for the group', 'travel', 250000, 'INR', v_actor_id, current_date, 'approved', v_actor_id),
      (v_trip_id, v_budget_id, 'Welcome dinner', 'Team dinner on arrival night', 'food', 620000, 'INR', v_actor_id, current_date, 'submitted', v_actor_id);
  end if;

  -- Tasks.
  if not exists (select 1 from public.tasks where trip_id = v_trip_id and title = 'Upload ID proof') then
    insert into public.tasks (trip_id, title, description, status, priority, assignee_id, due_at, created_by)
    values
      (v_trip_id, 'Upload ID proof', 'Needed for hotel check-in', 'todo', 'high', v_actor_id, now() + interval '5 days', v_actor_id),
      (v_trip_id, 'Confirm flight seats', 'Pick seats for the group booking', 'in_progress', 'medium', v_actor_id, now() + interval '10 days', v_actor_id),
      (v_trip_id, 'Book airport cabs', 'Arrange pickup for arrival day', 'done', 'low', v_actor_id, now() - interval '2 days', v_actor_id);
  end if;

  -- Notifications.
  if not exists (select 1 from public.notifications where user_id = v_actor_id and title = 'Trip created') then
    insert into public.notifications (user_id, organization_id, trip_id, channel, kind, title, body)
    values
      (v_actor_id, v_org_id, v_trip_id, 'in_app', 'trip_created', 'Trip created', 'Goa Team Retreat (Sample) is ready for planning.'),
      (v_actor_id, v_org_id, v_trip_id, 'in_app', 'booking_confirmed', 'Hotel confirmed', 'North Goa Beach Resort booking is confirmed.'),
      (v_actor_id, v_org_id, v_trip_id, 'in_app', 'task_assigned', 'New task assigned', 'You were assigned "Upload ID proof".');
  end if;

  raise notice 'Seeded trip %', v_trip_id;
end $$;
