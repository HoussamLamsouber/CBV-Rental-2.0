-- Migration: Reservation Cancellation Trigger
-- Restore vehicle availability when a reservation is cancelled

create or replace function handle_reservation_cancellation()
returns trigger as $$
begin
  if NEW.status = 'cancelled' then
    update cars
    set status = 'available'
    where id = NEW.car_id;
  end if;

  return NEW;
end;
$$ language plpgsql;

-- Trigger to run after reservation status update
drop trigger if exists on_reservation_cancelled on reservations;
create trigger on_reservation_cancelled
after update on reservations
for each row
when (OLD.status is distinct from NEW.status)
execute function handle_reservation_cancellation();
