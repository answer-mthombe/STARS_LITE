-- Checks if a device ID has already been used for a specific session
-- Returns true if the device is free, false if it has already checked in.
create or replace function public.attendance_records_device_free(p_session_id text, p_device_id text)
returns boolean
language sql stable security definer
as $$
  select not exists (
    select 1 from public.attendance_records
    where session_id = p_session_id and device_id = p_device_id
  );
$$;