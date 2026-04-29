-- Robust Fix: Reservation Cancellation and Vehicle Sync
-- Targets the correct 'vehicles' table and 'assigned_vehicle_id' column

-- 1. Refined Trigger Function
create or replace function handle_reservation_cancellation()
returns trigger as $$
begin
  if NEW.status = 'cancelled'
     and OLD.status is distinct from NEW.status
     and NEW.assigned_vehicle_id is not null then

    update vehicles
    set status = 'available',
        updated_at = now()
    where id = NEW.assigned_vehicle_id;

  end if;

  return NEW;
end;
$$ language plpgsql security definer; -- Run with elevated permissions to bypass RLS if needed

-- 2. Trigger
drop trigger if exists on_reservation_cancelled on reservations;
create trigger on_reservation_cancelled
after update on reservations
for each row
execute function handle_reservation_cancellation();

-- 3. RPC Function for Atomic Cancellation
create or replace function cancel_reservation(res_id uuid)
returns void as $$
declare
  v_id uuid;
begin
  update reservations
  set status = 'cancelled',
      updated_at = now()
  where id = res_id
  returning assigned_vehicle_id into v_id;

  if v_id is not null then
    update vehicles
    set status = 'available',
        updated_at = now()
    where id = v_id;
  end if;
end;
$$ language plpgsql security definer;

-- 4. RLS Policy (Optional but recommended for consistency)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'vehicles' 
    and policyname = 'Allow vehicle status update on cancellation'
  ) then
    create policy "Allow vehicle status update on cancellation"
    on vehicles
    for update
    using (true);
  end if;
end $$;
