-- Migration: Data Cleanup for Vehicle Status
-- Ensures that vehicles are only marked as 'reserved' if they have an active or accepted reservation

UPDATE vehicles
SET status = 'available'
WHERE status = 'reserved' -- Only target incorrectly reserved vehicles
AND id NOT IN (
  SELECT assigned_vehicle_id
  FROM reservations
  WHERE status IN ('accepted', 'active')
  AND assigned_vehicle_id IS NOT NULL
);
