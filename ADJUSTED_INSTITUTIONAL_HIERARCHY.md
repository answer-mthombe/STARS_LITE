# STARS — Institutional hierarchy, roles & permissions

This document describes how **Mangosuthu University of Technology** is modelled inside STARS: structure (University → Faculty → Department → Course → Module), **five institutional roles**, **scoped analytics**, and **navigation separation**.

---

## Structural model

```
University (MUT — metadata in `src/models/University.ts`)
└── Faculties (`fac_eng`, `fac_mgmt`, …)
    └── Departments (`dep_it`, `dep_elec`, …)
        └── Courses (qualifications, e.g. Diploma IT)
            └── Modules (class offerings with attendance sessions)
                ├── Lecturers (assigned to modules)
                └── Students (enrolled via courses / modules)
```

** Collection 

**Collections (mock / future Firestore):**

| Collection | Purpose |
|------------|---------|
| `faculties` | Top academic divisions; optional `deanId`, `departmentIds` |
| `departments` | Sub-unit under a faculty; `hodId`, `lecturerIds`, `courseIds` |
| `deans` | One dean per faculty (`facultyId`) |
| `hods` | One HOD per department (`departmentId`) |
| `coordinators` | One coordinator per course (`courseId`,`departmentId`) |
| `courses` | Qualification streams; **`departmentId`** + `facultyId` |
| `modules` | Teachable units; `courseId`, `lecturerId`, enrolment arrays |
| `lecturers` | Staff; **`facultyId`**, **`departmentId`**, `modules[]` |
| `students` | Learners; **`departmentId`** (from course), `courseId`, `facultyId` |



---

## Roles (high → scoped)

| Role | Scope | Primary routes |
|------|--------|----------------|
| **Admin** | Entire university | `/admin/dashboard`, `/admin/seed` |
| **Dean** | Single **faculty** | `/dean/dashboard` |
| **HOD** | Single **department** | `/hod/dashboard` |
| **Coordinator** | Single **course** | `/coordinator/dashboard` |
| **Lecturer** | Assigned **modules** | `/lecturer/*` |
| **Student** | Own enrolment & attendance | `/student/*` |

Role constants: `src/types/roles.ts` (`INSTITUTION_ROLES`, `InstitutionRole`).

Declarative permission matrix (for product + engineering alignment): `src/permissions/institutionPermissions.ts`.

---


## Responsibilities (summary)

### Admin

- University-wide analytics: totals, overall attendance rate, faculty performance snapshot, low-attendance alerts (mock counts).
- User & catalogue management **in production** would live behind Firebase rules + admin tools; current app exposes **simulation** controls on `/admin/seed`.

### Dean

- Faculty KPIs: faculty attendance index, per-department breakdown, lecturer activity, low-performing departments, active sessions intersecting faculty modules.
- **Charts / heatmaps:** current UI uses summary cards and lists; swap in a chart library later for literal heatmaps without changing analytics services.

### HOD

- Department KPIs: attendance rate, module list, lecturer roster, course summaries, “at-risk” students (mock heuristic).

### Coordinator

- **Course Quality:** Monitoring the performance of a specific qualification (e.g., Diploma in ICT).

- **Module Syncing:** Ensuring all modules within their specific course are active and that lecturers are maintaining consistent attendance records for that specific student cohort.


### Lecturer

- Unchanged flows: sessions, module roster, join approvals, module-scoped analytics (`/lecturer/*`).

### Student

- Unchanged flows: join, mark attendance, history, profile (`/student/*`).

---

# Analytics scoping

Implementation: **`src/services/institutionAnalytics.ts`**

| Role | Method | Data boundary |
|------|--------|----------------|
| Admin | `universityOverview()` | All students, faculties, departments, sessions |
| Dean | `facultyOverview(facultyId)` | Rows where `facultyId` matches dean |
| HOD | `departmentOverview(departmentId)` | Courses/modules/students in department |
| Coordinator | `courseOverview(courseId)` | All modules and student data belonging to a specific qualification. |
| Lecturer | `lecturerScoped(lecturerId)` | Modules assigned to lecturer |
| Student | `studentScoped(studentId)` | Own record |

`forUser(authUser)` selects the correct overview for dashboard shells.

---


---

## Authentication (mock)

Password for all demo accounts: **`password`**

| Role | Example emails |
|------|----------------|
| Admin | `admin@mut.ac.za` |
| Dean | `dean.engineering@mut.ac.za`, `dean.management@mut.ac.za` |
| HOD | `hod.it@mut.ac.za`, `hod.electrical@mut.ac.za`, `hod.business@mut.ac.za`, `hod.civil@mut.ac.za` |
| Coordinator | `coord.ict@mut.ac.za`, `coord.accounting@mut.ac.za` |

| Lecturer | `mkhize@mut.ac.za`, `naidoo@mut.ac.za`, `dube@mut.ac.za`, `mahlangu@mut.ac.za` |
| Student | Any `*@live.mut.ac.za` present in mock DB (includes synthetic `226xxxxx` range) |

Login UI: `app/(auth)/login.tsx` — role pills drive default email hints.

---

## Firebase alignment

`src/firebase/collections.ts` includes `departments`, `deans`, `hods` and coordinators.Extend Firestore rules so **read/write** follows the same boundaries as `institutionAnalytics` (see `FIREBASE_INTEGRATION.md`).


---

## Related files

- Models: `src/models/Department.ts`, `Dean.ts`, `Hod.ts`,`Coordinator.ts` updates to `Faculty`, `Course`, `Lecturer`, `Student`
- Dashboards: `app/admin/dashboard.tsx`, `app/dean/dashboard.tsx`, `app/hod/dashboard.tsx`, `app/coordinator/dashboard.tsx`
- Routing entry: `app/index.tsx`
- Guards: `src/hooks/useRoleGuard.ts`