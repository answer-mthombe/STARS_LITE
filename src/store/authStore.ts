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

import { signInWithEmailPassword, signOutSupabase } from "../services/supabase/authRepository";
import { registerStudentPipeline } from "@/pipelines/registerStudent";
import { getUserProfileByUid } from "@/services/supabase";

type AuthStatus = "loading" | "ready";

const KNOWN_ROLES = INSTITUTION_ROLES as readonly string[];

function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

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
  fetchLiveProfile: (supabaseUid: string, requestedRole?: UserRole) => Promise<AuthUser | null>;
};

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
    add(studentNumber);
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
  if (!personId && !email) return authFallbackName ?? "User";

  const supabase = tryGetSupabaseClient();
  if (!supabase) return authFallbackName ?? "User";

  if (role === "student" || role === "tutor") {
    const candidateIds = buildStudentLookupIds(personId, email);

    for (const id of candidateIds) {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("full_name")
          .eq("id", id)
          .maybeSingle();

        if (!error && data?.full_name) return data.full_name;
      } catch {}
    }

    if (email) {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("full_name")
          .eq("email", email)
          .maybeSingle();

        if (!error && data?.full_name) return data.full_name;
      } catch {}
    }

    return authFallbackName ?? "User";
  }

  return authFallbackName ?? "User";
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,

  bootstrap: async () => {
    try {
      if (isSupabaseEnabled()) {
        const supabase = requireSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          set({ user: null, status: "ready" });
          return;
        }

        const liveUser = await get().fetchLiveProfile(session.user.id);
        set({ user: liveUser, status: "ready" });
        return;
      }

      const raw = await authStorage.getItem();
      if (raw) {
        set({ user: JSON.parse(raw) as AuthUser, status: "ready" });
        return;
      }

      set({ status: "ready" });
    } catch {
      set({ user: null, status: "ready" });
    }
  },

  fetchLiveProfile: async (supabaseUid: string, requestedRole?: UserRole) => {
    if (!isSupabaseEnabled()) return null;

    try {
      const profile = await getUserProfileByUid(supabaseUid);
      
      // ✨ Honor the role selected on the UI form if provided, otherwise fall back to database profile role
      const dbRole = profile ? normalizeRole(profile.role) : null;
      const role = requestedRole || dbRole || "student";

      const personId =
        role === "student" || role === "tutor"
          ? profile?.linkedStudentId || profile?.id || supabaseUid
          : profile?.linkedPersonId || profile?.id || supabaseUid;

      const supabase = requireSupabaseClient();
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      const authFullName = normalizeDisplayName(sbUser?.user_metadata?.full_name ?? sbUser?.user_metadata?.name);
      const actualFullName = await fetchPersonFullName(role, personId, profile?.email || sbUser?.email, authFullName);

      const mappedUser: AuthUser = {
        role,
        id: personId,
        email: profile?.email || sbUser?.email || "",
        fullName: actualFullName,
        ...(role === "tutor"
          ? {
              studentId: profile?.linkedStudentId || profile?.id || personId,
              moduleIds: profile?.delegatedModuleIds || [],
            }
          : {}),
        ...(role === "dean" ? { facultyId: profile?.facultyId || "" } : {}),
        ...(role === "hod" ? { departmentId: profile?.departmentId || "" } : {}),
      } as AuthUser;

      await authStorage.setItem(JSON.stringify(mappedUser));
      set({ user: mappedUser });
      return mappedUser;
    } catch (error) {
      console.error("Live profile validation error:", error);
      return null;
    }
  },

  login: async ({ role, email, password }) => {
    if (isSupabaseEnabled()) {
      try {
        const authUser = await signInWithEmailPassword(email, password);
        // Pass the user's selected UI role down so it overrides any database mismatches
        const liveUser = await get().fetchLiveProfile(authUser.id, role);

        if (!liveUser) {
          await signOutSupabase();
          throw new Error("System configuration processing exception.");
        }
        return;
      } catch (err: any) {
        throw new Error(mapAuthError(err));
      }
    }

    const user = await mockAuthService.login({ role, email, password });
    await authStorage.setItem(JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    if (isSupabaseEnabled()) {
      try {
        await signOutSupabase();
      } catch {}
    }
    await authStorage.removeItem();
    set({ user: null });
  },

  registerStudent: async (args) => {
    const email = `${args.studentNumber}@live.mut.ac.za`;

    if (isSupabaseEnabled()) {
      try {
        const result = await registerStudentPipeline({ ...args, email });
        const mappedUser: AuthUser = {
          role: "student",
          id: result.studentId, 
          email: email,
          fullName: args.fullName,
        };

        await authStorage.setItem(JSON.stringify(mappedUser));
        set({ user: mappedUser });
        return;
      } catch (error: any) {
        throw new Error(mapAuthError(error)); 
      }
    }

    const user = await mockAuthService.registerStudent(args);
    await authStorage.setItem(JSON.stringify(user));
    set({ user });
  },
}));