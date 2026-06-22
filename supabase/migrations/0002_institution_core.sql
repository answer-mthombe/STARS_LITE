CREATE TABLE faculties (
    id TEXT PRIMARY KEY,
    faculty_name TEXT NOT NULL,
    department_ids JSONB DEFAULT '[]', -- Array of string IDs
    dean_id TEXT,
    acting_dean_id TEXT,
    secretary_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
    id TEXT PRIMARY KEY,
    department_name TEXT NOT NULL,
    faculty_id TEXT,
    course_ids JSONB DEFAULT '[]',     -- Array of string IDs
    lecturer_ids JSONB DEFAULT '[]',
    hod_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE courses (
    id TEXT PRIMARY KEY,
    course_name TEXT NOT NULL,
    faculty_id TEXT,
    department_id TEXT,
    modules JSONB DEFAULT '[]',     -- Array of string IDs
    lecturer_ids JSONB DEFAULT '[]',
    student_ids JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE modules (
    id TEXT PRIMARY KEY,
    module_code TEXT NOT NULL,
    module_name TEXT NOT NULL,
    course_id TEXT,
    lecturer_id TEXT,
    enrolled_students JSONB DEFAULT '[]', -- Denormalized student IDs array
    pending_requests JSONB DEFAULT '[]',
    tutor_ids JSONB DEFAULT '[]',         -- Denormalized tutor IDs array
    co_lecturer_ids JSONB DEFAULT '[]', 
    class_code TEXT,
    active_session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

