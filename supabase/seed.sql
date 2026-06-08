

-- ============================================================
-- Demo logins (M1)
-- Reference: src/constants/demoLogins.ts
-- Actual Auth users are created in JOB-006 (not M0).
-- Ensure seeded records align with demo login accounts.
-- ============================================================


-- Seed data for faculties
INSERT INTO public.faculties (
    id,
    faculty_name,
    dean_id,
    department_ids,
    created_at
) VALUES
(
    'fac_eng',
    'Engineering',
    'dean_eng',
    '["dep_it","dep_elec","dep_civil"]'::jsonb,
    '2026-01-10T08:00:00.000Z'
),
(
    'fac_mgmt',
    'Management Sciences',
    'dean_mgmt',
    '["dep_bus"]'::jsonb,
    '2026-01-10T08:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

-- Seed data for departments
INSERT INTO public.departments (
    id,
    department_name,
    faculty_id,
    hod_id,
    lecturer_ids,
    course_ids,
    created_at
) VALUES
(
    'dep_it',
    'Information Technology',
    'fac_eng',
    'hod_it',
    '["lec_mkhize","lec_naidoo"]'::jsonb,
    '["course_it"]'::jsonb,
    '2026-01-10T08:05:00.000Z'
),
(
    'dep_elec',
    'Electrical Engineering',
    'fac_eng',
    'hod_elec',
    '["lec_elec"]'::jsonb,
    '["course_elec"]'::jsonb,
    '2026-01-10T08:05:30.000Z'
),
(
    'dep_civil',
    'Civil Engineering',
    'fac_eng',
    'hod_civil',
    '[]'::jsonb,
    '[]'::jsonb,
    '2026-01-10T08:06:00.000Z'
),
(
    'dep_bus',
    'Business Administration',
    'fac_mgmt',
    'hod_bus',
    '["lec_bus"]'::jsonb,
    '["course_bus"]'::jsonb,
    '2026-01-10T08:06:30.000Z'
)
ON CONFLICT (id) DO NOTHING;

-- Seed data for courses
INSERT INTO public.courses (
    id,
    faculty_id,
    department_id,
    course_name,
    modules,
    created_at
) VALUES
(
    'course_it',
    'fac_eng',
    'dep_it',
    'Diploma in Information Technology',
    '["mod_mobile","mod_db","mod_net"]'::jsonb,
    '2026-01-10T08:10:00.000Z'
),
(
    'course_elec',
    'fac_eng',
    'dep_elec',
    'Electrical Engineering',
    '["mod_circuits"]'::jsonb,
    '2026-01-10T08:12:00.000Z'
),
(
    'course_bus',
    'fac_mgmt',
    'dep_bus',
    'Higher Certificate in Business Administration',
    '["mod_bus101"]'::jsonb,
    '2026-01-10T08:13:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

-- Seed data for lecturers
INSERT INTO public.lecturers (
    id,
    full_name,
    email,
    faculty_id,
    department_id,
    modules,
    created_at
) VALUES
(
    'lec_mkhize',
    'Dr. L. Mkhize',
    'mkhize@mut.ac.za',
    'fac_eng',
    'dep_it',
    '["mod_mobile","mod_db"]'::jsonb,
    '2026-01-10T08:20:00.000Z'
),
(
    'lec_naidoo',
    'Ms. S. Naidoo',
    'naidoo@mut.ac.za',
    'fac_eng',
    'dep_it',
    '["mod_net"]'::jsonb,
    '2026-01-10T08:22:00.000Z'
),
(
    'lec_elec',
    'Mr. J. Dube',
    'dube@mut.ac.za',
    'fac_eng',
    'dep_elec',
    '["mod_circuits"]'::jsonb,
    '2026-01-10T08:23:00.000Z'
),
(
    'lec_bus',
    'Ms. K. Mahlangu',
    'mahlangu@mut.ac.za',
    'fac_mgmt',
    'dep_bus',
    '["mod_bus101"]'::jsonb,
    '2026-01-10T08:24:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

-- Seed data for modules
INSERT INTO public.modules (
    id,
    module_code,
    module_name,
    lecturer_id,
    tutor_ids,
    class_code,
    enrolled_students,
    pending_requests,
    active_session_id,
    course_id
) VALUES
(
    'mod_mobile',
    'ITM301',
    'Mobile Development',
    'lec_mkhize',
    '["stu_22005678"]'::jsonb,
    'MUT-ITM301',
    '["stu_22001234","stu_22005678"]'::jsonb,
    '[]'::jsonb,
    null,
    'course_it'
),
(
    'mod_db',
    'ITD210',
    'Database Systems',
    'lec_mkhize',
    null,
    'MUT-ITD210',
    '["stu_22005678"]'::jsonb,
    '["stu_22001234"]'::jsonb,
    null,
    'course_it'
),
(
    'mod_net',
    'ITN220',
    'Networking',
    'lec_naidoo',
    null,
    'MUT-ITN220',
    '["stu_22001234"]'::jsonb,
    '[]'::jsonb,
    null,
    'course_it'
),
(
    'mod_circuits',
    'EEE110',
    'Circuits 1',
    'lec_elec',
    null,
    'MUT-EEE110',
    '[]'::jsonb,
    '[]'::jsonb,
    null,
    'course_elec'
),
(
    'mod_bus101',
    'BUS101',
    'Introduction to Business',
    'lec_bus',
    null,
    'MUT-BUS101',
    '[]'::jsonb,
    '[]'::jsonb,
    null,
    'course_bus'
)
ON CONFLICT (id) DO NOTHING;


-- Seed data for students
INSERT INTO public.students (
    id,
    full_name,
    student_number,
    gender,
    email,
    faculty_id,
    department_id,
    course_id,
    registered_modules,
    attendance_stats,
    profile_image,
    device_id,
    year_level,
    card_barcode,
    created_at
) VALUES
(
    'stu_22001234',
    'Amahle Dlamini',
    '22001234',
    'female',
    '22001234@live.mut.ac.za',
    'fac_eng',
    'dep_it',
    'course_it',
    '["mod_mobile","mod_net"]'::jsonb,
    '{"totalSessions":6,"attended":5,"absent":1,"attendanceRate":0.8333333333}'::jsonb,
    null,
    'device_demo_1',
    2,
    'MUT:22001234',
    '2026-01-12T09:00:00.000Z'
),
(
    'stu_22005678',
    'Thabo Khumalo',
    '22005678',
    'male',
    '22005678@live.mut.ac.za',
    'fac_eng',
    'dep_it',
    'course_it',
    '["mod_mobile","mod_db"]'::jsonb,
    '{"totalSessions":6,"attended":4,"absent":2,"attendanceRate":0.6666666667}'::jsonb,
    null,
    'device_demo_2',
    3,
    'MUT:22005678',
    '2026-01-12T09:03:00.000Z'
)
ON CONFLICT (id) DO NOTHING;


