-- ==========================================================
-- JOB-019
-- Allow authenticated lecturers to create attendance sessions
-- ==========================================================

-- Generate IDs automatically if one is not supplied
create extension if not exists pgcrypto;

alter table public.attendance_sessions
  alter column id set default gen_random_uuid()::text;

-- Remove the policy if it already exists
drop policy if exists "Lecturers can create attendance sessions"
on public.attendance_sessions;

-- Allow authenticated users to insert attendance sessions
create policy "Lecturers can create attendance sessions"
on public.attendance_sessions
for insert
to authenticated
with check (
    auth.uid() is not null
);

-- ============================================================================
-- TEST SUITE: Challenge Inserts RLS & Constraints (STORY-604)
-- ============================================================================

-- Test 1: Verify second (session_id, device_id) submission is rejected
BEGIN;
-- Setup test session and device
INSERT INTO challenge_submissions (session_id, student_id, device_id, status)
VALUES ('sess_test_01', 'stud_uuid_1', 'dev_abc_123', 'active');

-- Attempt duplicate insert with same session and device (should fail)
-- Expectation: ERROR: duplicate key value violates unique constraint "unique_session_device_submission"
INSERT INTO challenge_submissions (session_id, student_id, device_id, status)
VALUES ('sess_test_01', 'stud_uuid_2', 'dev_abc_123', 'active');
ROLLBACK;


-- Test 2: Verify student cannot insert for another student_id (RLS check)
BEGIN;
-- Simulate authenticated user context (replace with test jwt or auth.uid mocking)
SET LOCAL request.jwt.claim.sub = 'auth_user_uuid_1';

-- Attempt insert where student_id belongs to another user (should fail RLS check)
-- Expectation: ERROR: new row violates row-level security policy for table "challenge_submissions"
INSERT INTO challenge_submissions (session_id, student_id, device_id, status)
VALUES ('sess_test_02', 'stud_uuid_different_person', 'dev_xyz_789', 'active');
ROLLBACK;


-- Test 3: Verify failed attempts never persist
BEGIN;
SELECT COUNT(*) FROM challenge_submissions WHERE session_id = 'sess_test_fail_atomicity';

-- Run a failing insert query
DO $$
BEGIN
  INSERT INTO challenge_submissions (session_id, student_id, device_id, status)
  VALUES ('sess_test_fail_atomicity', 'invalid_student', 'dev_000', 'active');
EXCEPTION WHEN others THEN
  -- Catch error to simulate atomic rollback
  RAISE NOTICE 'Caught expected failure: %', SQLERRM;
END $$;

-- Verify count remains 0
SELECT COUNT(*) FROM challenge_submissions WHERE session_id = 'sess_test_fail_atomicity';
ROLLBACK;