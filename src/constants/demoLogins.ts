import type { UserRole } from "@/types/roles";

export type DemoLoginPreset = {
  role: UserRole;
  label: string;
  email: string;
};

/** One-tap demo accounts for sign-in (password for all: `password`). */
export const DEMO_LOGIN_PRESETS: DemoLoginPreset[] = [
  { role: "student", label: "Student · Amahle", email: "22001234@live.mut.ac.za" },
  { role: "student", label: "Student · Thabo", email: "22005678@live.mut.ac.za" },
  { role: "student", label: "Student · synthetic", email: "22600001@live.mut.ac.za" },
  { role: "lecturer", label: "Lecturer · Dr Mkhize", email: "mkhize@mut.ac.za" },
  { role: "lecturer", label: "Lecturer · Ms Naidoo", email: "naidoo@mut.ac.za" },
  { role: "lecturer", label: "Lecturer · Mr Dube", email: "dube@mut.ac.za" },
  { role: "lecturer", label: "Lecturer · Ms Mahlangu", email: "mahlangu@mut.ac.za" },
  { role: "hod", label: "HOD · IT", email: "hod.it@mut.ac.za" },
  { role: "hod", label: "HOD · Electrical", email: "hod.electrical@mut.ac.za" },
  { role: "hod", label: "HOD · Civil", email: "hod.civil@mut.ac.za" },
  { role: "hod", label: "HOD · Business", email: "hod.business@mut.ac.za" },
  { role: "dean", label: "Dean · Engineering", email: "dean.engineering@mut.ac.za" },
  { role: "dean", label: "Dean · Management", email: "dean.management@mut.ac.za" },
  { role: "admin", label: "System admin", email: "admin@mut.ac.za" },
];
