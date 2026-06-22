CREATE TABLE students (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    student_number TEXT NOT NULL UNIQUE,
    gender TEXT, -- 'male' | 'female' | 'other'
    email TEXT NOT NULL,
    faculty_id TEXT,
    department_id TEXT, -- Optional
    course_id TEXT,
    registered_modules JSONB DEFAULT '[]',
    attendance_stats JSONB DEFAULT '{}',
    profile_image TEXT, -- Nullable
    device_id TEXT,
    card_barcode TEXT,
    year_level INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);



CREATE TABLE hods (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department_id TEXT NOT NULL UNIQUE, -- 1:1 (One HOD per Department)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE deans (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    faculty_id TEXT NOT NULL UNIQUE, -- 1:1 (One Dean per Faculty)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE faculty_secretaries (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    faculty_id TEXT NOT NULL, -- N:1 (A faculty might have multiple operational staff)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE tutors (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    student_id TEXT NOT NULL, -- FK to students
    year_level INT,
    module_ids JSONB DEFAULT '[]',
    total_logged_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    linked_person_id TEXT,       -- Generic text link to lecturers/deans/hods
    faculty_id TEXT,             
    department_id TEXT,          
    course_id TEXT,              
    linked_student_id TEXT,      -- Specific link for student profiles
    granted_capabilities JSONB DEFAULT '[]',
    active_proxy_ids JSONB DEFAULT '[]',
    delegated_module_ids JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE module_delegations (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL, -- FK to modules
    course_id TEXT, -- Optional FK to courses
    granted_by_lecturer_id TEXT NOT NULL, -- FK to lecturers
    delegate_type TEXT NOT NULL, -- 'tutor' | 'student_registrar'
    delegate_student_id TEXT NOT NULL, -- FK to students
    capabilities JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    session_id TEXT, -- Optional FK to attendance_sessions
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proxy_assignments (
    id TEXT PRIMARY KEY,
    grantor_role TEXT NOT NULL,
    grantor_person_id TEXT NOT NULL,
    grantee_person_id TEXT NOT NULL,
    grantee_email TEXT NOT NULL,
    scope TEXT NOT NULL, -- 'university' | 'faculty' | 'department'
    scope_id TEXT NOT NULL, -- The specific faculty/department ID, or '*'
    capabilities JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

