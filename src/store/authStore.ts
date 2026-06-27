import { create } from "zustand";

import { authStorage } from "@/utils/authStorage";
import type { UserRole } from "@/types/roles";
import { INSTITUTION_ROLES } from "@/types/roles";
import { mockAuthService } from "@/services/mockAuthService";


import {
  isSupabaseEnabled,
  requireSupabaseClient,
  tryGetSupabaseClient,
} from "../supabase/client";


import {  signInWithEmailPassword, signOutSupabase } from "../services/supabase/authRepository";
import { registerStudentPipeline } from "@/pipelines/registerStudent";
import { getUserProfileByUid } from "@/services/supabase";

type AuthStatus = "loading" | "ready";

const KNOWN_ROLES = INSTITUTION_ROLES as readonly string[];

function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Validate + normalise the role coming from `user_profiles`. A missing or
 * unexpected role must NOT become an `AuthUser`, otherwise route guards bounce
 * the user between screens forever ("Maximum update depth exceeded").
 */
function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== "string") return null;
  const r = role.trim().toLowerCase();
  return KNOWN_ROLES.includes(r) ? (r as UserRole) : null;
}

const mapAuthError = (error: any): string => {
  if (error.message?.includes("Invalid login credentials")) {
    return "Invalid email or password";
  }
  if (error.message?.includes("Email not confirmed")) {
    return "Please confirm your email before signing in";
  }
  if (error.message?.includes("User not found")) {
    return "User account not found";
  }
  return error.message || "Authentication failed";
};

export type AuthUser =
  | { role: "student"; id: string; email: string; fullName: string }
  | { role: "lecturer"; id: string; email: string; fullName: string }
  | { role: "admin"; id: string; email: string; fullName: string }
  | { role: "dean"; id: string; email: string; fullName: string; facultyId: string }
  | { role: "hod"; id: string; email: string; fullName: string; departmentId: string }
  | {
      role: "tutor";
      id: string;
      email: string;
      fullName: string;
      studentId: string;
      moduleIds: string[];
    };

  export type LoginArgs = {
  role: UserRole;
  email: string;
  password: string;
}; 

export type RegisterStudentArgs = {
  fullName: string;
  studentNumber: string;
  gender: "male" | "female" | "other";
  facultyId: string;
  courseId: string;
  password: string;
};

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  bootstrap: () => Promise<void>;
  login: (args: LoginArgs) => Promise<void>;
  logout: () => Promise<void>;
  registerStudent: (args: RegisterStudentArgs) => Promise<void>;
};

// type AuthState = {
//   status: AuthStatus;
//   user: AuthUser | null;
//   bootstrap: () => Promise<void>;
//   login: (args: { role: UserRole; email: string; password: string }) => Promise<void>;
//   logout: () => Promise<void>;
//   registerStudent: (args: {
//     fullName: string;
//     studentNumber: string;
//     gender: "male" | "female" | "other";
//     facultyId: string;
//     courseId: string;
//     password: string;
//   }) => Promise<void>;
// };


// --- NEW HELPER: Fetch the actual name from the correct database table ---

function buildStudentLookupIds(personId: string, email?: string | null): string[] {
  const ids = new Set<string>();
  const add = (value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed) ids.add(trimmed);
  };

  add(personId);

  const studentNumber = email?.trim().split("@")[0];
  if (studentNumber) {
    add(`stu_${studentNumber}`);
    add(`stud-${studentNumber}`);
  }

  if (personId) {
    add(personId.replace(/^stud-/, "stu_"));
    add(personId.replace(/^stu_/, "stud-"));
  }

  return [...ids];
}

async function fetchPersonFullName(
  role: string,
  personId: string,
  email?: string | null,
  authFallbackName?: string | null,
): Promise<string> {
  console.log(`[AUTH DEBUG] resolve full name -> role=${role}, personId=${personId}, email=${email}`);

  if (!personId && !email) {
    console.log("[AUTH DEBUG] No personId or email available for name lookup");
    return authFallbackName ?? "Student";
  }

  const supabase = tryGetSupabaseClient();
  if (!supabase) {
    console.log("[AUTH DEBUG] No Supabase client available for name lookup");
    return "Student";
  }

  if (role === "student") {
    const candidateIds = buildStudentLookupIds(personId, email);

    for (const id of candidateIds) {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("full_name, email")
          .eq("id", id)
          .maybeSingle();

        console.log(`[AUTH DEBUG] student lookup by id ${id}:`, { data, error, code: error?.code });

        if (!error && data?.full_name) {
          console.log(`[AUTH DEBUG] resolved student name by id: ${data.full_name}`);
          return data.full_name;
        }

        if (error?.code === "42501") {
          console.log("[AUTH DEBUG] student lookup blocked by RLS; this needs the student self-read policy to allow the profile to read students");
        }
      } catch (error) {
        console.warn(`Could not fetch student full name by id for ${id}`, error);
      }
    }

    if (email) {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("full_name, email")
          .eq("email", email)
          .maybeSingle();

        console.log(`[AUTH DEBUG] student lookup by email ${email}:`, { data, error, code: error?.code });

        if (!error && data?.full_name) {
          console.log(`[AUTH DEBUG] resolved student name by email: ${data.full_name}`);
          return data.full_name;
        }

        if (error?.code === "42501") {
          console.log("[AUTH DEBUG] email-based student lookup blocked by RLS; the student self-read policy must include linked_student_id");
        }
      } catch (error) {
        console.warn(`Could not fetch student full name by email for ${email}`, error);
      }
    }

    const studentNumber = email?.split("@")[0];
    if (studentNumber) {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("full_name, student_number")
          .eq("student_number", studentNumber)
          .maybeSingle();

        console.log(`[AUTH DEBUG] student lookup by student_number ${studentNumber}:`, { data, error, code: error?.code });

        if (!error && data?.full_name) {
          console.log(`[AUTH DEBUG] resolved student name by student_number: ${data.full_name}`);
          return data.full_name;
        }

        if (error?.code === "42501") {
          console.log("[AUTH DEBUG] student-number lookup blocked by RLS; the student policy must allow the authenticated user to read their own record");
        }
      } catch (error) {
        console.warn(`Could not fetch student full name by student number for ${studentNumber}`, error);
      }
    }

    console.log("[AUTH DEBUG] student name lookup failed, falling back to auth metadata or Student");
    return authFallbackName ?? "Student";
  }

  console.log(`[AUTH DEBUG] role ${role} is not handled by student name lookup`);
  return authFallbackName ?? "Student";
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,


bootstrap: async () => {
  console.log("[AUTH DEBUG] Bootstrap function triggered!");
  try {
    // ==============================
    // SUPABASE MODE
    // ==============================
    if (isSupabaseEnabled()) {
      console.log("[AUTH DEBUG] Supabase is enabled, fetching session..."); // <--- ADD THIS
      const supabase = requireSupabaseClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        set({
          user: null,
          status: "ready",
        });
        return;
      }

      const profile = await getUserProfileByUid(
        session.user.id
      );

      if (!profile) {
        set({
          user: null,
          status: "ready",
        });
        return;
      }

      const role = normalizeRole(profile.role);
      if (!role) {
        try {
          await signOutSupabase();
        } catch {
          // ignore — we only care about clearing local state
        }
        set({ user: null, status: "ready" });
        return;
      }

      const personId =
        role === "student"
          ? profile.linkedStudentId || profile.linkedPersonId || profile.id
          : profile.linkedPersonId || profile.id;
      const authFullName = normalizeDisplayName(session.user.user_metadata?.full_name ?? session.user.user_metadata?.name);
      const actualFullName = await fetchPersonFullName(role, personId, profile.email, authFullName);

      const mappedUser: AuthUser = {
        role,
        id: personId,
        email: session.user.email || "",
        fullName: actualFullName,

        ...(role === "tutor"
          ? {
              studentId:
                profile.linkedStudentId ||
                profile.linkedPersonId ||
                profile.id,
              moduleIds:
                profile.delegatedModuleIds || [],
            }
          : {}),
        ...(role === "dean" ? { facultyId: profile.facultyId || "" } : {}),
        ...(role === "hod" ? { departmentId: profile.departmentId || "" } : {}),
      } as AuthUser;

      await authStorage.setItem(
        JSON.stringify(mappedUser)
      );

      set({
        user: mappedUser,
        status: "ready",
      });

      return;
    }

    // ==============================
    // MOCK MODE
    // ==============================
    const raw = await authStorage.getItem();

    if (raw) {
      const parsed = JSON.parse(raw) as AuthUser;

      set({
        user: parsed,
        status: "ready",
      });

      return;
    }

    set({
      status: "ready",
    });
  } catch (error) {
    console.error(
      "Auth bootstrap failed:",
      error
    );

    set({
      user: null,
      status: "ready",
    });
  }
},


  // login: async ({ role, email, password }) => {
  //   const user = await mockAuthService.login({ role, email, password });
  //   await authStorage.setItem(JSON.stringify(user));
  //   set({ user });
  // },

 login: async ({ role, email, password }) => {
  if (isSupabaseEnabled()) {
    try {
      const authUser = await signInWithEmailPassword(email, password);
      const profile = await getUserProfileByUid(authUser.id);

      if (!profile) {
        await signOutSupabase();
        throw new Error("Account authenticated, but no user profile exists in the system.");
      }

      const role = normalizeRole(profile.role);
      if (!role) {
        await signOutSupabase();
        throw new Error("Your account has no valid role assigned. Please contact an administrator.");
      }

      const personId =
        role === "student"
          ? profile.linkedStudentId || profile.linkedPersonId || profile.id
          : profile.linkedPersonId || profile.id;
      const authFullName = normalizeDisplayName(authUser.user_metadata?.full_name ?? authUser.user_metadata?.name);
      const actualFullName = await fetchPersonFullName(role, personId, profile.email, authFullName);

      const mappedUser: AuthUser = {
        role,
        id: personId,
        email: authUser.email || email,
        fullName: actualFullName,

        ...(role === "tutor"
          ? {
              studentId: profile.linkedStudentId || profile.linkedPersonId || profile.id,
              moduleIds: profile.delegatedModuleIds || [],
            }
          : {}),
        ...(role === "dean" ? { facultyId: profile.facultyId || "" } : {}),
        ...(role === "hod" ? { departmentId: profile.departmentId || "" } : {}),
      } as AuthUser;

      await authStorage.setItem(JSON.stringify(mappedUser));
      set({ user: mappedUser });
      return;
    } catch (err: any) {
      throw new Error(mapAuthError(err));
    }
  }

  // legacy mock login unchanged
  const user = await mockAuthService.login({ role, email, password });
  await authStorage.setItem(JSON.stringify(user));
  set({ user });
},



  // logout: async () => {
  //   await authStorage.removeItem();
  //   set({ user: null });
  // },

  logout: async () => {
    if (isSupabaseEnabled()) {
      try {
        await signOutSupabase();
      } catch (err) {
        console.warn("Supabase sign out error:", err);
      }
    }
    
    await authStorage.removeItem();
    set({ user: null });
  },

  registerStudent: async (args) => {
    const email = `${args.studentNumber}@live.mut.ac.za`;

    if (isSupabaseEnabled()) {
      try {
        // 1. Call the new isolated pipeline!
        const result = await registerStudentPipeline({
          ...args,
          email,
        });

        // 2. Create the AuthUser object
        const mappedUser: AuthUser = {
          role: "student",
          id: result.studentId, 
          email: email,
          fullName: args.fullName,
        };

        // 3. Save state
        await authStorage.setItem(JSON.stringify(mappedUser));
        set({ user: mappedUser });
        return;
      } catch (error: any) {
        // 4. Mapped friendly error!
        throw new Error(mapAuthError(error)); 
      }
    }

    // --- LEGACY MOCK REGISTRATION ---
    const user = await mockAuthService.registerStudent(args);
    await authStorage.setItem(JSON.stringify(user));
    set({ user });
  },
}));
