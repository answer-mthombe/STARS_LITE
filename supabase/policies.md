# RLS Policy Matrix — STARS

Row Level Security is enforced in **Postgres**, not just in the app.
This document is the single source of truth for which roles can read/write each table.

> `auth.uid()` = the logged-in user's UUID (matches `user_profiles.id`)  
> `linked_person_id` = the FK joining `user_profiles` to the role-specific person table

| Table                  | student                              | lecturer                             | admin       |
|------------------------|--------------------------------------|--------------------------------------|-------------|
| `students`             | read own row only                    | read rows enrolled in their modules  | all         |
| `modules`              | read modules they are enrolled in    | read modules they teach              | all         |
| `lecturers`            | —                                    | read own row                         | all         |
| `attendance_sessions`  | read sessions for their modules      | read/insert/update own sessions      | all         |
| `attendance_records`   | insert + select own rows             | read records for their module sessions | all       |
| `user_profiles`        | read own row                         | read own row                         | all         |
| `module_enrollments`   | read own rows                        | read enrollments for their modules   | all         |
| `class_registers`      | read own entries                     | read/insert for their sessions       | all         |


## TODOs for M2

- Some policies currently use `auth.role() = 'authenticated'` as a placeholder.
  Replace with full `user_profiles.role` joins once all Auth users are seeded (post STORY-005).
- `dean` and `HOD` scopes (faculty/department filtering) to be added after JOB-009.

## Implementation Notes: STORY-405 (RLS Write Paths)
As of the migration `0007_rls_write_paths.sql`, the following security posture is in effect:

* **Role-Based Access (RBAC):** Policies are enforced using the `user_profiles` table, mapping `auth.uid()` to `linked_person_id`.
* **Students:** Restricted to `INSERT` and `SELECT` only on their own records in `attendance_records` and `students`. Access to `attendance_sessions` and `modules` is limited to those associated with their `module_enrollments`.
* **Lecturers:** Granted `ALL` privileges on their own `attendance_sessions` and read-only access to `attendance_records` for sessions they own.
* **Integrity Constraints:** A `UNIQUE` constraint on `(session_id, device_id)` in `attendance_records` prevents duplicate check-ins at the database level.
* **Admin Bypass:** Administrative operations must use the `service_role` API key, which bypasses RLS policies entirely.

## Technical Policy Enforcement (STORY-405)
* **Write Path Logic:** All `INSERT` operations on `attendance_records` are validated against `linked_person_id`.
* **Data Integrity:** A `UNIQUE` constraint exists on `(session_id, device_id)` to prevent duplicate check-ins.
* **Administrative Access:** Admin roles leverage the `service_role` key to bypass RLS. This is the only authorized method for broad data management.
* **Access Lookups:** All role visibility (lecturer modules, student records) is enforced via `JOIN` queries against the `user_profiles.linked_person_id` column.



-- Ensure Row-Level Security is active on the table
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;

-- 1. Restrict inserts so students can only insert for themselves
CREATE POLICY "Enable insert for authenticated users matching their own student_id"
ON challenge_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = (
    SELECT id FROM students WHERE auth_user_id = auth.uid()
  )
);

-- 2. Prevent duplicate device usage per session at the constraint level
-- (Combined with RLS, this ensures strict uniqueness)
ALTER TABLE challenge_submissions
ADD CONSTRAINT unique_session_device_submission 
UNIQUE (session_id, device_id);