
CREATE TABLE attendance_sessions (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL, -- FK to modules
    lecturer_id TEXT NOT NULL, -- Owning lecturer
    started_by_role TEXT NOT NULL, -- 'lecturer' | 'tutor' | 'student_registrar'
    started_by_id TEXT NOT NULL,
    lecturer_location JSONB, -- e.g., { "latitude": -29.816, "longitude": 30.932 }
    radius NUMERIC NOT NULL, -- Metres
    algorithm_seed TEXT NOT NULL, -- Rotating code + challenge seed input
    active BOOLEAN DEFAULT TRUE,
    tutor_end_confirmations JSONB DEFAULT '[]', -- Array of student ids
    class_register_id TEXT, -- Nullable FK to class_registers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ
);


CREATE TABLE attendance_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL, -- FK to attendance_sessions
    student_id TEXT NOT NULL, -- FK to students
    timestamp TIMESTAMPTZ DEFAULT NOW(), -- Replaces created_at
    distance NUMERIC, -- Metres from anchor
    verified BOOLEAN DEFAULT FALSE, -- Legacy flag
    device_id TEXT NOT NULL, -- 16-char install ID
    time_bucket INT, -- floor(unix/10)
    gps_bucket_hash TEXT, -- 8-char hash
    tapped_index SMALLINT, -- 0–5 grid cell
    tier_used SMALLINT, -- 1–5 input tier
    action_hash TEXT, -- Action fingerprint
    passed BOOLEAN NOT NULL DEFAULT FALSE, -- Server-verified pass (replaces status)
    
    -- CRITICAL: Anti-duplicate constraint directly from the specification
    CONSTRAINT attendance_records_session_device_unique UNIQUE (session_id, device_id)
);

CREATE TABLE class_registers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL, -- FK to attendance_sessions
    module_id TEXT NOT NULL, -- FK to modules
    module_code TEXT, -- Snapshot
    module_name TEXT, -- Snapshot
    tutor_student_ids JSONB DEFAULT '[]',
    tutor_names JSONB DEFAULT '[]', -- Snapshot
    lecturer_id TEXT NOT NULL, -- FK to lecturers
    lecturer_name TEXT, -- Snapshot
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INT,
    students JSONB DEFAULT '[]', -- The actual roster rows (snapshots of attendance)
    confirmed_by_tutor_student_ids JSONB DEFAULT '[]',
    confirmed_by_lecturer BOOLEAN DEFAULT FALSE,
    pdf_uri TEXT,
    html_snapshot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tutor_timesheets (
    id TEXT PRIMARY KEY,
    tutor_student_id TEXT NOT NULL, -- FK to students
    work_type TEXT NOT NULL, -- 'class' | 'test'
    reference_id TEXT NOT NULL, -- The specific class_registers.id or test_sessions.id
    module_id TEXT NOT NULL, -- FK to modules
    module_code TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    hours_worked NUMERIC,
    submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ, -- Nullable
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL, -- e.g., 'session.started', 'attendance.marked'
    actor_role TEXT NOT NULL,
    actor_person_id TEXT NOT NULL,
    scope_type TEXT NOT NULL, -- 'university' | 'faculty' | 'department' | 'course' | 'module'
    scope_id TEXT NOT NULL,
    target_person_id TEXT, -- Nullable (who was affected by the action, if anyone)
    metadata JSONB DEFAULT '{}', -- Stores the exact payload of what changed
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE test_sessions (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL, -- FK to modules
    lecturer_id TEXT NOT NULL, -- FK to lecturers
    invigilators JSONB DEFAULT '[]', -- Array of tutor/lecturer IDs watching the test
    register_id TEXT, -- Nullable FK to test_registers (populated when the test ends)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_marks (
    id TEXT PRIMARY KEY,
    test_session_id TEXT NOT NULL, -- FK to test_sessions
    student_id TEXT NOT NULL, -- FK to students
    mark NUMERIC NOT NULL, -- The actual score/grade
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- CRITICAL: Prevent the same student from being graded twice for the same test
    CONSTRAINT uq_test_session_student UNIQUE (test_session_id, student_id)
);


CREATE TABLE test_registers (
    id TEXT PRIMARY KEY,
    test_session_id TEXT NOT NULL, -- FK to test_sessions
    module_id TEXT NOT NULL, -- FK to modules
    module_code TEXT, -- Snapshot
    module_name TEXT, -- Snapshot
    students_present JSONB DEFAULT '[]', -- Roster snapshot of who actually sat for the test
    pdf_uri TEXT, -- Link to the generated PDF register
    created_at TIMESTAMPTZ DEFAULT NOW()
);


