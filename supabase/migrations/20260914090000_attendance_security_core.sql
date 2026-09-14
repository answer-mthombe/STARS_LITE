-- ====================================================================
-- ATTENDANCE SECURITY CORE — server-side authority
-- (implements ATTENDANCE_SECURITY_ARCHITECTURE.md §4,§5,§6,§7,§10,§13)
-- ====================================================================
-- Additive & non-breaking: adds new functions, a token table, nullable
-- evidence columns, and one uniqueness constraint. Nothing here removes or
-- alters the existing client write path, so deploying it cannot break the
-- running app; the client is migrated to submit_attendance() separately.
--
-- Scaling notes (per the database-scaling-playbook): a lecture hall is a
-- concurrent-write BURST, not a read-scale problem. The hot path here is all
-- primary-key point lookups (token, session, module, venue) + one guarded
-- INSERT; the only lock is FOR UPDATE on a single token row, held for
-- microseconds. No sequential scans, no fan-out. This scales vertically +
-- with indexes long before any partitioning/sharding is warranted.
-- ====================================================================

-- ---------- 1. Pure helper functions (unit-testable, no I/O) ----------

-- Server time bucketed to the rotation interval (default 20s ∈ [15,30]).
create or replace function public.attendance_window(interval_seconds int default 20)
returns bigint language sql stable as $$
  select floor(extract(epoch from now()) / interval_seconds)::bigint;
$$;

-- Deterministic 6-digit code from the (server-only) seed + window.
-- NOTE: pgcrypto's hmac() lives in the `extensions` schema on Supabase; it is
-- fully-qualified so the function works under any caller search_path.
create or replace function public.session_code(p_seed text, p_window bigint)
returns text language sql immutable as $$
  select lpad(
    ( ('x' || substr(encode(extensions.hmac(p_window::text, coalesce(p_seed,''), 'sha256'), 'hex'), 1, 6))::bit(24)::int
      % 1000000
    )::text, 6, '0');
$$;

-- Great-circle distance in metres.
create or replace function public.haversine_m(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric language sql immutable as $$
  select (6371000 * 2 * asin(sqrt(
      power(sin(radians((lat2 - lat1) / 2)), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians((lon2 - lon1) / 2)), 2)
  )))::numeric;
$$;

-- ---------- 2. One-time attendance tokens ----------

create table if not exists public.attendance_tokens (
  token              text primary key default gen_random_uuid()::text,
  session_id         text not null references public.attendance_sessions(id) on delete cascade,
  student_id         text not null,
  issued_at          timestamptz not null default now(),
  expires_at         timestamptz not null default now() + interval '90 seconds',
  consumed_at        timestamptz,
  consumed_record_id text,
  attempts           int not null default 0
);
-- Fast "does this student have a live token for this session?" lookup.
create index if not exists idx_attendance_tokens_live
  on public.attendance_tokens (session_id, student_id) where consumed_at is null;

alter table public.attendance_tokens enable row level security;
-- No direct client access: only the SECURITY DEFINER RPCs touch this table.
revoke all on table public.attendance_tokens from anon, authenticated;

-- ---------- 3. Evidence columns + duplicate constraint on records ----------
alter table public.attendance_records
  add column if not exists submitted_latitude    numeric,
  add column if not exists submitted_longitude   numeric,
  add column if not exists gps_accuracy          numeric,
  add column if not exists server_distance_meters numeric,
  add column if not exists code_window           bigint,
  add column if not exists token                 text,
  add column if not exists client_captured_at    timestamptz,
  add column if not exists server_recorded_at    timestamptz,
  add column if not exists venue_id              text;

-- A student can be marked at most once per session (0 existing duplicates verified).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'attendance_records_session_student_unique') then
    alter table public.attendance_records
      add constraint attendance_records_session_student_unique unique (session_id, student_id);
  end if;
end $$;

-- ---------- 4. Lecturer code display (owning lecturer/tutor/admin only) ----------
create or replace function public.get_active_session_code(p_session_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_person text; v_role text; v_sess attendance_sessions%rowtype; v_win bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select linked_person_id, role into v_person, v_role from user_profiles where id = v_uid;
  select * into v_sess from attendance_sessions where id = p_session_id;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if not (v_sess.lecturer_id = v_person or v_sess.started_by_id = v_person or v_role = 'admin')
    then raise exception 'NOT_AUTHORIZED'; end if;
  v_win := attendance_window();
  return jsonb_build_object(
    'code', session_code(v_sess.algorithm_seed, v_win),
    'window', v_win,
    'seconds_remaining', 20 - (floor(extract(epoch from now()))::bigint % 20));
end; $$;

-- ---------- 5. begin_attendance: issue a one-time token ----------
create or replace function public.begin_attendance(p_session_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_student text; v_role text; v_sess attendance_sessions%rowtype; v_token text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select linked_student_id, role into v_student, v_role from user_profiles where id = v_uid;
  if v_student is null or v_role <> 'student' then raise exception 'NOT_STUDENT'; end if;
  select * into v_sess from attendance_sessions where id = p_session_id;
  if not found or coalesce(v_sess.active, true) = false or now() >= v_sess.expires_at
    then raise exception 'SESSION_INACTIVE'; end if;
  if not exists (select 1 from modules m where m.id = v_sess.module_id and m.enrolled_students ? v_student)
    then raise exception 'NOT_ENROLLED'; end if;
  if exists (select 1 from attendance_records where session_id = p_session_id and student_id = v_student)
    then raise exception 'DUPLICATE_ATTENDANCE'; end if;

  v_token := gen_random_uuid()::text;
  insert into attendance_tokens(token, session_id, student_id) values (v_token, p_session_id, v_student);
  return jsonb_build_object('token', v_token, 'rotation_seconds', 20, 'expires_in_seconds', 90);
end; $$;

-- ---------- 6. submit_attendance: the single atomic authority ----------
create or replace function public.submit_attendance(
  p_token text, p_code text, p_latitude numeric, p_longitude numeric,
  p_accuracy numeric, p_captured_at timestamptz, p_device_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_student text; v_role text;
  v_tok attendance_tokens%rowtype; v_sess attendance_sessions%rowtype; v_ven venues%rowtype;
  v_dist numeric; v_rec text; v_win bigint := attendance_window();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select linked_student_id, role into v_student, v_role from user_profiles where id = v_uid;
  if v_student is null or v_role <> 'student' then raise exception 'NOT_STUDENT'; end if;

  -- one-time token (row lock serialises concurrent submits for this student)
  select * into v_tok from attendance_tokens where token = p_token for update;
  if not found or v_tok.consumed_at is not null or now() > v_tok.expires_at
    then raise exception 'TOKEN_INVALID'; end if;
  if v_tok.student_id <> v_student then raise exception 'TOKEN_INVALID'; end if;

  select * into v_sess from attendance_sessions where id = v_tok.session_id;
  if not found or coalesce(v_sess.active, true) = false or now() >= v_sess.expires_at
    then raise exception 'SESSION_INACTIVE'; end if;

  if not exists (select 1 from modules m where m.id = v_sess.module_id and m.enrolled_students ? v_student)
    then raise exception 'NOT_ENROLLED'; end if;

  -- rotating code: current or previous window only
  if p_code is distinct from session_code(v_sess.algorithm_seed, v_win)
     and p_code is distinct from session_code(v_sess.algorithm_seed, v_win - 1) then
    update attendance_tokens set attempts = attempts + 1 where token = p_token;
    raise exception 'INVALID_CODE';
  end if;

  -- GPS validity/accuracy + staleness gates
  if p_latitude is null or p_longitude is null or p_accuracy is null or p_accuracy > 100
    then raise exception 'GPS_INVALID'; end if;
  if p_captured_at is null or p_captured_at < now() - interval '60 seconds'
    then raise exception 'GPS_STALE'; end if;

  -- MANDATORY geofence — server computes distance from the raw fix + venue
  select * into v_ven from venues where id = v_sess.venue_id;
  if not found or v_ven.latitude is null or v_ven.longitude is null then raise exception 'VENUE_MISSING'; end if;
  v_dist := haversine_m(p_latitude, p_longitude, v_ven.latitude, v_ven.longitude);
  if v_dist > coalesce(v_ven.radius_meters, 50) then raise exception 'GEOFENCE_FAILED'; end if;

  -- write (server timestamp) — unique constraints are the last line of defence
  v_rec := gen_random_uuid()::text;
  insert into attendance_records(
      id, session_id, student_id, device_id, timestamp, distance, verified, passed,
      submitted_latitude, submitted_longitude, gps_accuracy, server_distance_meters,
      code_window, token, client_captured_at, server_recorded_at, venue_id)
    values (v_rec, v_sess.id, v_student, p_device_id, now(), v_dist, true, true,
      p_latitude, p_longitude, p_accuracy, v_dist, v_win, p_token, p_captured_at, now(), v_ven.id);

  update attendance_tokens set consumed_at = now(), consumed_record_id = v_rec where token = p_token;
  return jsonb_build_object('status', 'PRESENT', 'record_id', v_rec, 'distance_m', round(v_dist, 1));
exception
  when unique_violation then raise exception 'DUPLICATE_ATTENDANCE';
end; $$;

-- ---------- 7. Grants: authenticated may call the RPCs; anon may not ----------
revoke all on function public.begin_attendance(text)            from anon;
revoke all on function public.submit_attendance(text,text,numeric,numeric,numeric,timestamptz,text) from anon;
revoke all on function public.get_active_session_code(text)      from anon;
grant execute on function public.begin_attendance(text)          to authenticated;
grant execute on function public.submit_attendance(text,text,numeric,numeric,numeric,timestamptz,text) to authenticated;
grant execute on function public.get_active_session_code(text)   to authenticated;

notify pgrst, 'reload schema';
