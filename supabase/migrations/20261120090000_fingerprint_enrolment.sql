-- ====================================================================
-- MIGRATION: Fingerprint enrolment (recorded at student sign-up)
--
-- IMPORTANT: a phone never hands an app the fingerprint itself. The OS only
-- answers "did a fingerprint registered on this phone match? yes/no".
-- So we do NOT store fingerprint data. We store a record that the student
-- registered their fingerprint, and on which phone.
--
-- Students cannot write to the table directly (RLS has no write policy).
-- Writes go through the functions below, which work out the student from
-- auth.uid() so the app cannot claim to be someone else.
-- ====================================================================

-- Clean up the earlier draft of this migration if it was already run (safe if not).
drop function if exists public.record_fingerprint_verification(text, text);
drop function if exists public.has_fingerprint_verification(text);
drop function if exists public.get_my_fingerprint_status(text);
drop table if exists public.biometric_verifications;

-- ---------- 1. Enrolment: one row per student ----------
create table if not exists public.student_biometrics (
  student_id         text primary key references public.students(id) on delete cascade,
  method             text not null check (method in ('fingerprint', 'face')),
  device_id          text not null,
  enrolled_at        timestamptz not null default now(),
  last_reenrolled_at timestamptz,
  reenrol_count      int not null default 0
);

-- ---------- 2. RLS: a student can read only their own row, nobody writes directly ----------
alter table public.student_biometrics enable row level security;

drop policy if exists "Students read own biometric enrolment" on public.student_biometrics;
create policy "Students read own biometric enrolment"
  on public.student_biometrics for select to authenticated
  using (
    student_id = (select linked_student_id from public.user_profiles where id = auth.uid())
  );

-- ---------- 3. enroll_fingerprint: called at sign-up (and if a student ever needs to re-register) ----------
create or replace function public.enroll_fingerprint(p_device_id text, p_method text default 'fingerprint')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_student text;
  v_role text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_device_id is null or length(trim(p_device_id)) = 0 then raise exception 'DEVICE_REQUIRED'; end if;
  if p_method not in ('fingerprint', 'face') then raise exception 'INVALID_METHOD'; end if;

  select linked_student_id, role into v_student, v_role from user_profiles where id = v_uid;
  if v_student is null or v_role <> 'student' then raise exception 'NOT_STUDENT'; end if;

  insert into student_biometrics (student_id, method, device_id)
  values (v_student, p_method, p_device_id)
  on conflict (student_id) do update
    set method             = excluded.method,
        device_id          = excluded.device_id,
        reenrol_count      = student_biometrics.reenrol_count + 1,
        last_reenrolled_at = now();

  return jsonb_build_object('enrolled', true, 'method', p_method);
end; $$;

-- ---------- 4. get_my_fingerprint_status: has this student registered a fingerprint? ----------
create or replace function public.get_my_fingerprint_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_student text;
  v_enrol student_biometrics%rowtype;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select linked_student_id into v_student from user_profiles where id = v_uid;
  if v_student is null then raise exception 'NOT_STUDENT'; end if;

  select * into v_enrol from student_biometrics where student_id = v_student;
  if not found then
    return jsonb_build_object('enrolled', false);
  end if;

  return jsonb_build_object('enrolled', true, 'method', v_enrol.method, 'enrolled_at', v_enrol.enrolled_at);
end; $$;

-- Only signed-in users may call these.
revoke all on function public.enroll_fingerprint(text, text) from public, anon;
revoke all on function public.get_my_fingerprint_status() from public, anon;
grant execute on function public.enroll_fingerprint(text, text) to authenticated;
grant execute on function public.get_my_fingerprint_status() to authenticated;
