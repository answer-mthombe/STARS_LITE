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

import { registerStudentSupabase, signInWithEmailPassword, signOutSupabase } from "../services/supabase/authRepository";
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

// Internal helper to map ugly or technical error messages to human-readable ones
const mapAuthError = (error: any): string => {
  const message = error?.message || "";
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password";
  }
  if (message.includes("Email not confirmed")) {
    return "Please confirm your email before signing in";
  }
  if (message.includes("User not found")) {
    return "User account not found";
  }
  return message || "Authentication failed";
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

async function fetchPersonFullName(role: string, personId: string): Promise<string> {
  if (!personId) return "System Admin"; // Fallback for root users

  const supabase = tryGetSupabaseClient();
  if (!supabase) return "Authenticated User";

  // Map the role to the exact table name in your Postgres database
  const tableMap: Record<string, string> = {
    student: "students",
    lecturer: "lecturers",
    dean: "deans",
    hod: "hods",
    tutor: "tutors",
    admin: "admins" // Adjust if your admin table is named differently
  };

  const tableName = tableMap[role];
  if (!tableName) return "Authenticated User";

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("full_name")
      .eq("id", personId)
      .maybeSingle();
      console.log(`[AUTH DEBUG] Role: ${role} | ID: ${personId} | Data:`, data, `| Error:`, error);

    if (!error && data && data.full_name) {
      return data.full_name;
    }
  } catch (error) {
    console.warn(`Could not fetch full name for ${role} ${personId}`, error);
  }

  return "Authenticated User"; // Safe fallback if the query fails
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  bootstrap: async () => {
    try {
      // ==============================
      // SUPABASE MODE
      // ==============================
      if (isSupabaseEnabled()) {
        const supabase = requireSupabaseClient();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          set({ user: null, status: "ready" });
          return;
        }

        const profile = await getUserProfileByUid(session.user.id);

      if (!profile) {
        set({
          user: null,
          status: "ready",
        });
        return;
      }

      const mappedUser: AuthUser = {
        role: profile.role,
        id: profile.linkedPersonId || profile.id,
        email: session.user.email || "",
        fullName: "Authenticated User",

        ...(profile.role === "tutor"
          ? {
              studentId:
                profile.linkedStudentId ||
                profile.linkedPersonId ||
                profile.id,
              moduleIds:
                profile.delegatedModuleIds || [],
            }
          : {}),
      } as AuthUser;

        await authStorage.setItem(JSON.stringify(mappedUser));
        set({ user: mappedUser, status: "ready" });
        return;
      }

      // ==============================
      // MOCK MODE
      // ==============================
      const raw = await authStorage.getItem();

      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        set({ user: parsed, status: "ready" });
        return;
      }

      set({ status: "ready" });
    } catch (error) {
      console.error("Auth bootstrap failed:", error);
      set({ user: null, status: "ready" });
    }
  },

  login: async ({ role, email, password }) => {
    if (isSupabaseEnabled()) {
      try {
        const authUser = await signInWithEmailPassword(email, password);
        const profile = await getUserProfileByUid(authUser.id);

        if (!profile) {
          await signOutSupabase();
          throw new Error("Account authenticated, but no user profile exists in the system.");
        }

      const personId = profile.linkedPersonId || profile.id;
      const actualFullName = await fetchPersonFullName(profile.role, personId);

      const mappedUser: AuthUser = {
        role: profile.role ,
        id: profile.linkedPersonId || profile.id, 
        email:  authUser.email || email,
        fullName: actualFullName,


        ...(profile.role === "tutor" ? { 
        studentId: profile.linkedStudentId || profile.linkedPersonId || profile.id, 
            moduleIds: profile.delegatedModuleIds || []
        
        } : {}),
        ...(profile.role === "dean" ? { facultyId: profile.facultyId || "" } : {}),

        ...(profile.role === "hod" ? { departmentId: profile.departmentId || "" } : {}),



      } as AuthUser;

      await authStorage.setItem(JSON.stringify(mappedUser));
      set({ user: mappedUser });
      return;
    } catch (err: any) {
      // 👇 NEW: use mapAuthError here
      const friendly = (err);
      throw new Error(friendly); // bubble up friendly message
    }

    // Legacy mock login
    const user = await mockAuthService.login({ role, email, password });
    await authStorage.setItem(JSON.stringify(user));
    set({ user });
  },

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
        const result = await registerStudentSupabase({
          ...args,
          email,
        });

        const mappedUser: AuthUser = {
          role: "student",
          id: result.studentId , 
          email: email,
          fullName: args.fullName,
        };

        await authStorage.setItem(JSON.stringify(mappedUser));
        set({ user: mappedUser });
        return;
      } catch (error: any) {
        // Fix: Wrap this error in mapAuthError to catch registration specific codes cleanly
        throw new Error(mapAuthError(error));
      }
    }

    // Legacy mock registration
    const user = await mockAuthService.registerStudent(args);
    await authStorage.setItem(JSON.stringify(user));
    set({ user });
  },
}));