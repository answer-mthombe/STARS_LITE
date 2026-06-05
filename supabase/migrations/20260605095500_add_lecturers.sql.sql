CREATE TABLE lecturers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    faculty_id TEXT, -- FK to faculties
    department_id TEXT, -- FK to departments
    modules JSONB DEFAULT '[]', -- Denormalized list of module IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
