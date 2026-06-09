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