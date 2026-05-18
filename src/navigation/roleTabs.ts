import type { InstitutionRole } from "@/types/roles";

export type RoleTabDef = {
  /** Expo Router screen name (file name without extension) */
  name: string;
  title: string;
  /** Ionicons name */
  icon: string;
  iconFocused: string;
};

export const ROLE_TABS: Record<InstitutionRole, RoleTabDef[]> = {
  student: [
    { name: "dashboard", title: "Home", icon: "home-outline", iconFocused: "home" },
    { name: "modules/index", title: "Modules", icon: "book-outline", iconFocused: "book" },
    { name: "join-class", title: "Join", icon: "enter-outline", iconFocused: "enter" },
    { name: "attendance-history", title: "History", icon: "time-outline", iconFocused: "time" },
    { name: "profile", title: "Profile", icon: "person-outline", iconFocused: "person" },
    { name: "more", title: "More", icon: "menu-outline", iconFocused: "menu" },
  ],
  lecturer: [
    { name: "dashboard", title: "Home", icon: "grid-outline", iconFocused: "grid" },
    { name: "module-management", title: "Modules", icon: "layers-outline", iconFocused: "layers" },
    { name: "analytics", title: "Analytics", icon: "stats-chart-outline", iconFocused: "stats-chart" },
    { name: "audit-logs", title: "Audit", icon: "shield-checkmark-outline", iconFocused: "shield-checkmark" },
    { name: "more", title: "More", icon: "menu-outline", iconFocused: "menu" },
  ],
  tutor: [
    { name: "dashboard", title: "Home", icon: "school-outline", iconFocused: "school" },
    { name: "sessions", title: "Sessions", icon: "play-circle-outline", iconFocused: "play-circle" },
    { name: "registers", title: "Registers", icon: "document-text-outline", iconFocused: "document-text" },
    { name: "timesheets", title: "Hours", icon: "timer-outline", iconFocused: "timer" },
    { name: "more", title: "More", icon: "menu-outline", iconFocused: "menu" },
  ],
  admin: [
    { name: "dashboard", title: "Overview", icon: "planet-outline", iconFocused: "planet" },
    { name: "analytics", title: "Charts", icon: "bar-chart-outline", iconFocused: "bar-chart" },
    { name: "audit-logs", title: "Audit", icon: "shield-checkmark-outline", iconFocused: "shield-checkmark" },
    { name: "seed", title: "Data", icon: "server-outline", iconFocused: "server" },
    { name: "more", title: "More", icon: "menu-outline", iconFocused: "menu" },
  ],
  dean: [
    { name: "dashboard", title: "Faculty", icon: "business-outline", iconFocused: "business" },
    { name: "analytics", title: "Charts", icon: "bar-chart-outline", iconFocused: "bar-chart" },
    { name: "audit-logs", title: "Audit", icon: "shield-checkmark-outline", iconFocused: "shield-checkmark" },
    { name: "more", title: "More", icon: "menu-outline", iconFocused: "menu" },
  ],
  hod: [
    { name: "dashboard", title: "Department", icon: "people-outline", iconFocused: "people" },
    { name: "analytics", title: "Charts", icon: "bar-chart-outline", iconFocused: "bar-chart" },
    { name: "audit-logs", title: "Audit", icon: "shield-checkmark-outline", iconFocused: "shield-checkmark" },
    { name: "more", title: "More", icon: "menu-outline", iconFocused: "menu" },
  ],
};
