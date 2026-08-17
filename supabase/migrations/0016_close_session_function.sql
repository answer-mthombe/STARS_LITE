create or replace function end_session_and_create_register(
  p_session_id text,
  p_module_id text,
  p_register_id text,
  p_lecturer_id text,
  p_students jsonb
) returns void as $$
begin
  -- 1. Insert the snapshot into the class_registers table
  insert into public.class_registers (
    id, 
    session_id, 
    module_id, 
    lecturer_id, 
    students,
    ended_at,
    created_at
  ) values (
    p_register_id, 
    p_session_id, 
    p_module_id, 
    p_lecturer_id, 
    p_students,
    now(),
    now()
  );

  -- 2. Mark the attendance session as inactive and link the register ID
  update public.attendance_sessions 
  set 
    active = false, 
    ended_at = now(), 
    class_register_id = p_register_id
  where id = p_session_id;

  -- 3. Release the lock on the module so a new session can be started later
  update public.modules 
  set active_session_id = null 
  where id = p_module_id;
end;
$$ language plpgsql;