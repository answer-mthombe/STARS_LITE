import type { InstitutionRole } from "@/types/roles";

export type RoleNavItem = {
  label: string;
  description: string;
  href: string;
};

export const ROLE_TAB_HINTS: Partial<Record<InstitutionRole, Record<string, string>>> = {
  student: {
    dashboard: "Today’s modules, attendance rate, and quick check-in.",
    "modules/index": "Registered modules, lecturers, and session status.",
    "join-class": "Request access with a class code from your lecturer.",
    "attendance-history": "Past check-ins and session records.",
    profile: "Student number, faculty, course, and account details.",
    more: "Notifications, settings, and sign out.",
  },
  tutor: {
    dashboard: "Delegated modules, live tests, and invigilation queue.",
    sessions: "Open or start class sessions on modules you assist.",
    registers: "Print-ready PDF registers after class or tests.",
    timesheets: "Log hours for payroll after confirmed sessions.",
    more: "Demo links, notifications, settings, and sign out.",
  },
  lecturer: {
    dashboard: "Your modules, live sessions, and test invigilation.",
    "module-management": "Roster, join requests, tutor delegation, and registers.",
    analytics: "At-risk students and attendance trends per module.",
    "audit-logs": "Session, delegation, and attendance events for your modules.",
    more: "Test demos, PDF samples, notifications, and sign out.",
  },
  admin: {
    dashboard: "University KPIs, faculties, and alert summary.",
    analytics: "Cross-faculty charts and attendance trends.",
    seed: "Re-seed demo data, open sample registers and live tests.",
    "audit-logs": "Full institutional audit trail (append-only).",
    more: "Demo shortcuts, notifications, settings, and sign out.",
  },
  dean: {
    dashboard: "Faculty performance, departments, and proxy status.",
    analytics: "Faculty-wide attendance and course comparisons.",
    "audit-logs": "Proxies, delegations, and faculty-scoped sessions.",
    more: "Reports, notifications, settings, and sign out.",
  },
  hod: {
    dashboard: "Department modules, lecturers, and at-risk students.",
    analytics: "Module enrolment, attendance rates, and quality metrics.",
    "audit-logs": "Department delegations, sessions, and governance events.",
    more: "Notifications, settings, and sign out.",
  },
};

export const ROLE_HUB_NAV: Partial<Record<InstitutionRole, RoleNavItem[]>> = {
  lecturer: [
    {
      label: "Module management",
      description: "Rosters, join requests, delegate tutors or class registrars.",
      href: "/lecturer/module-management",
    },
    {
      label: "Analytics",
      description: "Per-module attendance charts and at-risk student lists.",
      href: "/lecturer/analytics",
    },
    {
      label: "Audit log",
      description: "Who started sessions, marked attendance, or changed delegations.",
      href: "/lecturer/audit-logs",
    },
    {
      label: "Start class session",
      description: "Open GPS + rotating code attendance for a module.",
      href: "/lecturer/module-management",
    },
    {
      label: "Test invigilation",
      description: "Barcode scan register — lecturer confirms, PDF for tutors.",
      href: "/lecturer/test-invigilate/test_demo_active",
    },
  ],
  admin: [
    {
      label: "University analytics",
      description: "Faculty bars, attendance trend, and enrolment breakdown.",
      href: "/admin/analytics",
    },
    {
      label: "Audit log",
      description: "Privilege grants, proxies, sessions — full university scope.",
      href: "/admin/audit-logs",
    },
    {
      label: "Demo data & registers",
      description: "Re-seed mock DB, open print-ready class and test PDFs.",
      href: "/admin/seed",
    },
    {
      label: "Grant privileges",
      description: "Assign dean, HOD, lecturer roles (simulation).",
      href: "/admin/seed",
    },
  ],
  dean: [
    {
      label: "Faculty analytics",
      description: "Compare departments, courses, and attendance in your faculty.",
      href: "/dean/analytics",
    },
    {
      label: "Audit log",
      description: "Acting-dean proxies, faculty sessions, and delegations.",
      href: "/dean/audit-logs",
    },
    {
      label: "Department overview",
      description: "Drill into HOD dashboards via department list (demo).",
      href: "/dean/dashboard",
    },
  ],
  hod: [
    {
      label: "Department analytics",
      description: "Module bars, at-risk trend, and lecturer performance.",
      href: "/hod/analytics",
    },
    {
      label: "Audit log",
      description: "Quality control events, delegations, and session history.",
      href: "/hod/audit-logs",
    },
    {
      label: "Course catalogue",
      description: "Courses and modules registered under your department.",
      href: "/hod/dashboard",
    },
  ],
  student: [
    {
      label: "My modules",
      description: "See lecturers, active sessions, and open module detail.",
      href: "/student/modules",
    },
    {
      label: "Join a class",
      description: "Enter a class code when your lecturer shares one.",
      href: "/student/join-class",
    },
    {
      label: "Attendance history",
      description: "Every check-in with date, module, and session type.",
      href: "/student/attendance-history",
    },
    {
      label: "Profile",
      description: "Student number, faculty, course, and device binding.",
      href: "/student/profile",
    },
  ],
  tutor: [
    {
      label: "Delegated sessions",
      description: "Modules you assist — start class or open live session.",
      href: "/tutor/sessions",
    },
    {
      label: "PDF registers",
      description: "Class and test registers after lecturer confirmation.",
      href: "/tutor/registers",
    },
    {
      label: "Timesheets",
      description: "Submit hours for payroll after class or invigilation.",
      href: "/tutor/timesheets",
    },
    {
      label: "Test invigilation",
      description: "Scan student cards during live tests (no duplicate marks).",
      href: "/tutor/test-invigilate/test_demo_active",
    },
  ],
};

export const ROLE_MORE_LINKS: Partial<Record<InstitutionRole, RoleNavItem[]>> = {
  lecturer: [
    {
      label: "Live test invigilation (demo)",
      description: "Pre-seeded Quiz 2 — scan cards, lecturer confirms PDF.",
      href: "/lecturer/test-invigilate/test_demo_active",
    },
    {
      label: "Sample test register PDF",
      description: "Print-ready midterm register after confirmation.",
      href: "/lecturer/register/reg_test_mobile_midterm?type=test",
    },
    {
      label: "Audit log",
      description: "Module-scoped governance and attendance events.",
      href: "/lecturer/audit-logs",
    },
  ],
  admin: [
    {
      label: "Audit log (university)",
      description: "All privilege, proxy, session, and mark events.",
      href: "/admin/audit-logs",
    },
    {
      label: "Sample class register PDF",
      description: "Demo print-ready register after Mobile Dev class.",
      href: "/lecturer/register/reg_class_mobile",
    },
    {
      label: "Live test invigilation",
      description: "Open active test session for scanning demo.",
      href: "/lecturer/test-invigilate/test_demo_active",
    },
  ],
  dean: [
    {
      label: "Faculty audit log",
      description: "Proxies and sessions within your faculty scope.",
      href: "/dean/audit-logs",
    },
    {
      label: "Faculty analytics",
      description: "Charts comparing departments and attendance.",
      href: "/dean/analytics",
    },
  ],
  hod: [
    {
      label: "Department audit log",
      description: "Delegations and sessions in your department.",
      href: "/hod/audit-logs",
    },
    {
      label: "Department analytics",
      description: "Module performance and at-risk students.",
      href: "/hod/analytics",
    },
  ],
  tutor: [
    {
      label: "Delegated sessions",
      description: "Modules where you can run class attendance.",
      href: "/tutor/sessions",
    },
    {
      label: "Print class register (demo)",
      description: "PDF after lecturer ends and confirms class.",
      href: "/lecturer/register/reg_class_mobile",
    },
    {
      label: "Live test invigilation",
      description: "Scan student barcodes during an active test.",
      href: "/tutor/test-invigilate/test_demo_active",
    },
  ],
  student: [
    {
      label: "Attendance history",
      description: "Full list of your check-ins and sessions.",
      href: "/student/attendance-history",
    },
    {
      label: "Join a class",
      description: "Use a code from your lecturer to request module access.",
      href: "/student/join-class",
    },
  ],
};
