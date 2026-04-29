-- Migration: Recreate cancel_reservation RPC function
-- Purpose: Atomic reservation cancellation and vehicle availability restoration

create or replace function public.cancel_reservation(res_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  vehicle_uuid uuid;
begin
  -- Get assigned vehicle
  select assigned_vehicle_id into vehicle_uuid
  from reservations
  where id = res_id;

  -- Update reservation status
  update reservations
  set status = 'cancelled',
      updated_at = now()
  where id = res_id;

  -- If a vehicle was assigned → make it available again
  if vehicle_uuid is not null then
    update vehicles
    set status = 'available',
        updated_at = now() -- Including updated_at for consistency
    where id = vehicle_uuid;
  end if;

end;
$$;

-- Grant execution permissions to authenticated users
grant execute on function public.cancel_reservation(uuid) to authenticated;
