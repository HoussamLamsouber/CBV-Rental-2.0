-- Migration: Unified Vehicle Status Sync Trigger
-- Ensures that the 'vehicles' table reflects the status of its current reservation

-- 1. Create a function to synchronize vehicle status
create or replace function public.sync_vehicle_status()
returns trigger as $$
declare
  v_id uuid;
  v_old_id uuid;
begin
  -- Handle assigned vehicle changes (OLD vs NEW)
  v_id := NEW.assigned_vehicle_id;
  v_old_id := OLD.assigned_vehicle_id;

  -- 1. If assigned vehicle changed, free the old one
  if (TG_OP = 'UPDATE' and v_old_id is not null and (v_id is null or v_id <> v_old_id)) then
    update vehicles
    set status = 'available',
        updated_at = now()
    where id = v_old_id
    and status = 'reserved'; -- Only free if it was reserved
  end if;

  -- 2. Update status for current assigned vehicle
  if v_id is not null then
    if NEW.status in ('accepted', 'active') then
      -- Mark as reserved
      update vehicles
      set status = 'reserved',
          updated_at = now()
      where id = v_id
      and status <> 'maintenance'; -- Don't override maintenance status
    elsif NEW.status in ('cancelled', 'refused', 'completed', 'expired') then
      -- Mark as available
      update vehicles
      set status = 'available',
          updated_at = now()
      where id = v_id
      and status = 'reserved'; -- Only free if it was reserved
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger
drop trigger if exists on_reservation_status_change on reservations;
create trigger on_reservation_status_change
after insert or update on reservations
for each row
execute function public.sync_vehicle_status();

-- 3. Update cancel_reservation RPC to be even simpler (trigger will handle the sync)
create or replace function public.cancel_reservation(res_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update reservations
  set status = 'cancelled',
      updated_at = now()
  where id = res_id;
  
  -- The trigger 'on_reservation_status_change' will automatically
  -- set the associated vehicle to 'available' if it was 'reserved'.
end;
$$;

-- 4. Grant execution permissions (redundant but safe)
grant execute on function public.cancel_reservation(uuid) to authenticated;
