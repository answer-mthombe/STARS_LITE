# STARS — Flow & file structure diagrams

Visual guide to how the **ATTANDANCE** (STARS) app boots, routes users by role, runs attendance and invigilation flows, and where code lives. Complements [FILE_STRUCTURE.md](./FILE_STRUCTURE.md), [INSTITUTION_HIERARCHY.md](./INSTITUTION_HIERARCHY.md), and [FIREBASE_INTEGRATION.md](./FIREBASE_INTEGRATION.md).

---

## 1. High-level architecture

```mermaid
flowchart TB
  subgraph UI["app/ — Expo Router screens"]
    Auth["(auth) login · onboarding · register"]
    Student["student/ tabs + stack"]
    Lecturer["lecturer/ tabs + stack"]
    Tutor["tutor/ tabs + stack"]
    Admin["admin/ tabs + stack"]
    Dean["dean/ tabs + stack"]
    Hod["hod/ tabs + stack"]
    Shared["notifications · settings"]
  end

  subgraph Core["src/ — shared logic"]
    Nav["navigation/ roleTabs · roleNavigation"]
    Comp["components/ ui · navigation · charts · invigilation"]
    Svc["services/ attendance · delegation · audit · registers"]
    Store["store/ authStore · toastStore · mockDbVersion"]
    Perm["permissions/ institution · delegation"]
    Mock["mockDB/ JSON seeds + demoSeedPopulation"]
    FB["firebase/ + services/firebase/ (future)"]
  end

  UI --> Store
  UI --> Svc
  UI --> Comp
  UI --> Nav
  Svc --> Mock
  Svc --> Perm
  Svc -.-> FB
```

| Layer | Responsibility |
|--------|----------------|
| **`app/`** | Routes = files. Each role uses **tabs** for main areas and a **stack** for detail screens. |
| **`src/services/`** | Business rules: sessions, marks, delegations, PDF registers, audit filtering. |
| **`src/mockDB/`** | In-memory simulator until Firebase is wired. |
| **`src/navigation/`** | Tab definitions, quick-nav copy, tab bar metrics. |
| **`src/permissions/`** | Capability matrix and delegation checks. |

---

## 2. App bootstrap & authentication flow

```mermaid
flowchart TD
  Start([App launch]) --> Root["app/_layout.tsx\nAppProviders + Stack"]
  Root --> Index["app/index.tsx"]
  Index --> Loading{authStore.status?}
  Loading -->|loading| Splash["/splash"]
  Loading -->|no user| Onboard["/onboarding"]
  Loading -->|logged in| RoleRedirect{user.role}

  RoleRedirect -->|admin| AD["/admin/dashboard"]
  RoleRedirect -->|dean| DN["/dean/dashboard"]
  RoleRedirect -->|hod| HD["/hod/dashboard"]
  RoleRedirect -->|lecturer| LC["/lecturer/dashboard"]
  RoleRedirect -->|tutor| TU["/tutor/dashboard"]
  RoleRedirect -->|student| ST["/student/dashboard"]

  Onboard --> Login["/login"]
  Login --> MockAuth["mockAuthService.login"]
  MockAuth --> Persist["authStorage → authStore.user"]
  Persist --> RoleRedirect

  Register["/register-student"] --> MockReg["mockAuthService.registerStudent"]
  MockReg --> Persist
```

| Step | Files |
|------|--------|
| Providers wrap app | `src/providers/AppProviders.tsx`, `app/_layout.tsx` |
| Auth state | `src/store/authStore.ts`, `src/utils/authStorage.ts` |
| Login / register | `app/(auth)/login.tsx`, `register-student.tsx`, `src/services/mockAuthService.ts` |
| Demo accounts | `src/constants/demoLogins.ts` |
| Role guard on screens | `src/hooks/useRoleGuard.ts` |
| Sign out | `src/hooks/useLogout.ts`, `src/components/navigation/LogoutButton.tsx` |

---

## 3. Navigation pattern (tabs + stack)

Every institutional role uses the same shell: **bottom tabs** for main areas, **stack push** for workflows that need full screen (no tab bar).

```mermaid
flowchart LR
  subgraph RoleArea["e.g. app/student/"]
    Stack["Stack _layout.tsx"]
    Tabs["(tabs)/ _layout.tsx\nRoleTabsLayout"]
    TabScreens["dashboard · modules · …"]
    Detail["mark-attendance/[moduleId]\nmodules/[moduleId]\nprofile (stack)"]
  end

  Stack --> Tabs
  Tabs --> TabScreens
  Stack --> Detail
  Detail -.->|back| Tabs
```

```mermaid
flowchart TB
  subgraph TabBar["Custom tab bar"]
    ATB["AppTabBar.tsx"]
    Metrics["tabBarMetrics.ts\n+ safe area lift"]
    Inset["TabBarInsetContext\n→ ScreenShell padding"]
  end

  RTL["RoleTabsLayout.tsx"] --> ATB
  RTL --> ROLE_TABS["roleTabs.ts"]
  Screens["ScreenShell screens"] --> Inset
```

### Bottom tabs by role

| Role | Tab routes (`app/<role>/(tabs)/`) |
|------|-----------------------------------|
| **Student** | `dashboard` · `modules/index` · `join-class` · `attendance-history` · `profile` · `more` |
| **Lecturer** | `dashboard` · `module-management` · `analytics` · `audit-logs` · `more` |
| **Tutor** | `dashboard` · `sessions` · `registers` · `timesheets` · `more` |
| **Admin** | `dashboard` · `analytics` · `audit-logs` · `seed` · `more` |
| **Dean** | `dashboard` · `analytics` · `audit-logs` · `more` |
| **HOD** | `dashboard` · `analytics` · `audit-logs` · `more` |

Tab config: `src/navigation/roleTabs.ts` · Descriptions & quick links: `src/navigation/roleNavigation.ts` · More menu: `src/components/navigation/MoreMenuScreen.tsx`

---

## 4. Institutional hierarchy (data model)

```mermaid
flowchart TB
  UNI["University (MUT)"]
  UNI --> FAC["Faculty\nfaculties"]
  FAC --> DEAN["Dean\ndeans"]
  FAC --> DEPT["Department\ndepartments"]
  DEPT --> HOD["HOD\nhods"]
  DEPT --> COURSE["Course\ncourses"]
  COURSE --> MOD["Module\nmodules"]
  MOD --> LEC["Lecturer\nlecturers"]
  MOD --> STU["Students\nstudents"]
  MOD --> TUT["Tutor\ntutors + moduleDelegations"]

  MOD --> SESS["attendanceSessions"]
  SESS --> REC["attendanceRecords"]
  MOD --> CREG["classRegisters"]
  MOD --> TSESS["testSessions"]
  TSESS --> TMARK["testMarks"]
  TSESS --> TREG["testRegisters"]

  GOV["proxyAssignments"] --> FAC
  GOV --> DEPT
  DEL["moduleDelegations"] --> MOD
  AUD["auditLogs"] --> UNI
```

---

## 5. Student — class attendance flow

```mermaid
sequenceDiagram
  participant S as Student app
  participant DB as mockDB
  participant L as Lecturer session

  L->>DB: startSession (GPS, seed, radius)
  DB-->>S: module.activeSessionId set
  S->>S: dashboard / modules → Mark attend
  S->>S: captureLocationOnce + rotatingCode
  S->>DB: attendanceSimulationService.markAttendance
  DB->>DB: attendanceRecords + auditLogs
  S-->>S: success toast / history updated
```

| Screen | Path | Service / util |
|--------|------|----------------|
| Home | `app/student/(tabs)/dashboard.tsx` | — |
| Module detail | `app/student/modules/[moduleId].tsx` | — |
| Mark attendance | `app/student/mark-attendance/[moduleId].tsx` | `attendanceSimulationService.ts` |
| History | `app/student/(tabs)/attendance-history.tsx` | `mockDB.attendanceRecords` |
| Join class | `app/student/(tabs)/join-class.tsx` | `moduleEnrollmentService.ts` |
| Rotating code | — | `src/utils/rotatingCode.ts` |
| GPS once | — | `src/utils/captureLocationOnce.ts`, `haversine.ts` |

---

## 6. Lecturer — class session & roster flow

```mermaid
flowchart TD
  LD["lecturer/dashboard"] --> MM["module-management"]
  LD --> CS["create-session/[moduleId]"]
  CS --> AS["active-session/[sessionId]"]
  AS --> QR["LiveSessionQr + rotating code"]
  AS --> End["end session"]
  End --> CR["classRegisterService"]
  CR --> PDF["register/[registerId]\nregisterPdfService"]
  CR --> AUD["auditLogs session.ended"]

  MM --> SM["student-management/[moduleId]"]
  SM --> DEL["delegationService.grant/revoke"]
```

| Screen | Path |
|--------|------|
| Create session | `app/lecturer/create-session/[moduleId].tsx` |
| Live session | `app/lecturer/active-session/[sessionId].tsx` |
| Student roster | `app/lecturer/student-management/[moduleId].tsx` |
| PDF register | `app/lecturer/register/[registerId].tsx` |

---

## 7. Test invigilation flow (lecturer + tutor)

```mermaid
sequenceDiagram
  participant L as Lecturer
  participant T as Tutor
  participant Svc as testInvigilationService
  participant DB as mockDB

  L->>Svc: createTestSession(moduleId)
  L->>Svc: open for scanning (active)
  T->>Svc: scanStudentCard(barcode)
  Svc->>DB: testMarks (no duplicates)
  L->>Svc: confirmRegister
  Svc->>DB: testRegisters + PDF htmlSnapshot
  T->>T: registers tab → view PDF
```

| Screen | Path |
|--------|------|
| Configure test | `app/lecturer/test-session/[moduleId].tsx` |
| Lecturer scan UI | `app/lecturer/test-invigilate/[testSessionId].tsx` |
| Tutor scan UI | `app/tutor/test-invigilate/[testSessionId].tsx` |
| Scanner component | `src/components/invigilation/StudentCardScanner.tsx` |
| Service | `src/services/testInvigilationService.ts` |

---

## 8. Tutor — delegation, sessions, payroll

```mermaid
flowchart LR
  STU["Student record\nlinkedStudentId"] --> TUT["tutor login\nmoduleIds[]"]
  TUT --> DASH["tutor/dashboard"]
  TUT --> SESS["tutor/sessions"]
  SESS --> CS["lecturer/create-session\n(shared routes)"]
  TUT --> REG["tutor/registers\nclass + test PDFs"]
  TUT --> TS["tutor/timesheets"]
  TS --> PAY["tutorPayrollService"]
```

Tutors are **senior students** with `moduleDelegations` grants. They can start sessions on delegated modules; hours flow to `tutorTimesheets` after confirmed class/test work.

---

## 9. Governance — analytics & audit logs

```mermaid
flowchart TD
  subgraph Analytics["Scoped analytics"]
    ADM["admin → universityOverview"]
    DEA["dean → facultyOverview"]
    HOD["hod → departmentOverview"]
    LEC["lecturer → module stats"]
  end

  subgraph Audit["auditLogService.listAuditLogsForUser"]
    A1["admin: all logs"]
    A2["dean: faculty scope"]
    A3["hod: department scope"]
    A4["lecturer: own modules"]
  end

  institutionAnalytics["institutionAnalytics.ts"] --> Analytics
  auditLogService["auditLogService.ts"] --> Audit
  Audit --> UI["*/(tabs)/audit-logs.tsx\nAuditLogScreen.tsx"]
```

| Role | Audit tab | Dashboard service |
|------|-----------|-------------------|
| Admin | `app/admin/(tabs)/audit-logs.tsx` | `institutionAnalytics.universityOverview` |
| Dean | `app/dean/(tabs)/audit-logs.tsx` | `facultyOverview(facultyId)` |
| HOD | `app/hod/(tabs)/audit-logs.tsx` | `departmentOverview(departmentId)` |
| Lecturer | `app/lecturer/(tabs)/audit-logs.tsx` | Module-scoped logs only |

Delegation and proxy changes write to `auditLogs` via `delegationService.ts` and `attendanceSimulationService.ts`. Demo data: `src/mockDB/demoSeedPopulation.ts`.

---

## 10. Mock database lifecycle

```mermaid
flowchart TD
  Boot["AppProviders mount"] --> Seed["mockDB.seedInitialData()"]
  Seed --> JSON["Load JSON seeds\nstudents · modules · …"]
  JSON --> Synth["generateSyntheticStudents"]
  Synth --> Demo["populateDemoRegistersAndTests\nsessions · registers · audit"]
  Demo --> Ready[(In-memory MockCollections)]

  AdminSeed["admin/seed Re-seed button"] --> Seed
  Bump["mockDbVersionStore.bump()"] --> Rerender["Screens useMemo refresh"]
```

Entry point: `src/mockDB/mockDBService.ts` · Demo population: `src/mockDB/demoSeedPopulation.ts`

---

## 11. File structure diagram

Route groups `(tabs)` and `(auth)` do **not** appear in the URL.

```
ATTANDANCE/
├── app/                              # Expo Router — screens & URLs
│   ├── _layout.tsx                   # Root: AppProviders, global Stack
│   ├── index.tsx                     # Auth redirect → role dashboard
│   ├── splash.tsx
│   ├── +html.tsx · +not-found.tsx
│   ├── notifications.tsx · settings.tsx
│   │
│   ├── (auth)/                       # /login, /onboarding, /register-student
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── onboarding.tsx
│   │   └── register-student.tsx
│   │
│   ├── student/
│   │   ├── _layout.tsx               # Stack: tabs + detail screens
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx           # RoleTabsLayout("student")
│   │   │   ├── dashboard.tsx
│   │   │   ├── modules/index.tsx
│   │   │   ├── join-class.tsx
│   │   │   ├── attendance-history.tsx
│   │   │   ├── profile.tsx
│   │   │   └── more.tsx
│   │   ├── modules/[moduleId].tsx
│   │   ├── mark-attendance/[moduleId].tsx
│   │   └── profile.tsx               # Stack variant (showBack)
│   │
│   ├── lecturer/
│   │   ├── _layout.tsx
│   │   ├── (tabs)/
│   │   │   ├── dashboard · module-management · analytics
│   │   │   ├── audit-logs · more
│   │   ├── create-session/[moduleId].tsx
│   │   ├── active-session/[sessionId].tsx
│   │   ├── test-session/[moduleId].tsx
│   │   ├── test-invigilate/[testSessionId].tsx
│   │   ├── student-management/[moduleId].tsx
│   │   └── register/[registerId].tsx
│   │
│   ├── tutor/
│   │   ├── _layout.tsx
│   │   ├── (tabs)/
│   │   │   ├── dashboard · sessions · registers
│   │   │   ├── timesheets · more
│   │   └── test-invigilate/[testSessionId].tsx
│   │
│   ├── admin/
│   │   ├── _layout.tsx
│   │   └── (tabs)/
│   │       ├── dashboard · analytics · audit-logs
│   │       ├── seed · more
│   │
│   ├── dean/
│   │   ├── _layout.tsx
│   │   └── (tabs)/
│   │       ├── dashboard · analytics · audit-logs · more
│   │
│   └── hod/
│       ├── _layout.tsx
│       └── (tabs)/
│           ├── dashboard · analytics · audit-logs · more
│
├── src/
│   ├── navigation/
│   │   ├── roleTabs.ts               # Tab names & icons per role
│   │   ├── roleNavigation.ts         # Hub links, descriptions, More copy
│   │   └── tabBarMetrics.ts          # Tab bar height & safe-area lift
│   │
│   ├── contexts/
│   │   └── TabBarInsetContext.tsx    # Bottom padding for tab screens
│   │
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── AppTabBar.tsx
│   │   │   ├── RoleTabsLayout.tsx
│   │   │   ├── MoreMenuScreen.tsx
│   │   │   ├── RoleQuickNav.tsx
│   │   │   ├── AuditLogScreen.tsx
│   │   │   └── LogoutButton.tsx
│   │   ├── ui/                       # AppButton, ScreenShell, ModuleCard, …
│   │   ├── charts/                   # StatsBarChart, StatsLineChart
│   │   ├── attendance/               # LiveSessionQr
│   │   └── invigilation/             # StudentCardScanner, TestInvigilatePanel
│   │
│   ├── screens/
│   │   └── StudentProfileContent.tsx
│   │
│   ├── services/
│   │   ├── mockAuthService.ts
│   │   ├── attendanceSimulationService.ts
│   │   ├── moduleEnrollmentService.ts
│   │   ├── delegationService.ts
│   │   ├── classRegisterService.ts
│   │   ├── testInvigilationService.ts
│   │   ├── registerPdfService.ts
│   │   ├── tutorPayrollService.ts
│   │   ├── auditLogService.ts
│   │   ├── institutionAnalytics.ts
│   │   ├── firebase/                 # Future Firestore repositories
│   │   └── offline/                  # PouchDB scaffold
│   │
│   ├── models/                       # TypeScript domain types
│   ├── types/                        # roles, capabilities, firebaseUserProfile
│   ├── permissions/
│   │   ├── institutionPermissions.ts
│   │   └── delegationPermissions.ts
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── toastStore.ts
│   │   └── mockDbVersionStore.ts
│   │
│   ├── mockDB/
│   │   ├── mockDBService.ts
│   │   ├── demoSeedPopulation.ts
│   │   ├── syntheticPopulation.ts
│   │   └── *.json                    # Seed data
│   │
│   ├── firebase/                     # App init, collection names, converters
│   ├── hooks/                        # useRoleGuard, useLogout
│   ├── utils/                        # rotatingCode, haversine, barcodes, PDF HTML
│   ├── theme/                        # colors, typography, radius
│   └── providers/AppProviders.tsx
│
├── assets/                           # App icon, splash
├── public/                           # Web static (index.html)
├── app.json
├── package.json
├── README.md
├── FILE_STRUCTURE.md                 # Beginner file lookup table
├── INSTITUTION_HIERARCHY.md          # Roles & org model
├── FIREBASE_INTEGRATION.md           # Migration jobs & Firestore plan
└── FLOW_AND_STRUCTURE.md             # This document
```

---

## 12. Service → screen map (quick reference)

| Service | Primary consumers |
|---------|-------------------|
| `mockAuthService` | `(auth)/login`, `register-student` |
| `attendanceSimulationService` | `create-session`, `active-session`, `mark-attendance` |
| `moduleEnrollmentService` | `join-class`, `student-management` |
| `delegationService` | `student-management`, tutor `sessions` |
| `classRegisterService` | `register/[registerId]`, tutor `registers` |
| `testInvigilationService` | `test-session`, `test-invigilate/*` |
| `registerPdfService` | PDF / print views |
| `tutorPayrollService` | tutor `timesheets` |
| `auditLogService` | `*/audit-logs` tabs |
| `institutionAnalytics` | admin / dean / hod dashboards & analytics |

---

## 13. Related documentation

| Document | Contents |
|----------|----------|
| [README.md](./README.md) | Quick start, scripts, demo logins |
| [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) | “I need to change…” lookup table |
| [INSTITUTION_HIERARCHY.md](./INSTITUTION_HIERARCHY.md) | Roles, delegation, proxy, collections |
| [FIREBASE_INTEGRATION.md](./FIREBASE_INTEGRATION.md) | Firestore collections, security, job breakdown |
| [ADJUSTED_INSTITUTIONAL_HIERARCHY.md](./ADJUSTED_INSTITUTIONAL_HIERARCHY.md) | Hierarchy adjustments (if present) |

---

*Last updated to reflect tab navigation (`(tabs)/`), audit log tabs, tutor sessions tab, and lifted bottom tab bar.*
