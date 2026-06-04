import { create } from "zustand";

import { authStorage } from "@/utils/authStorage";
import type { UserRole } from "@/types/roles";
import { mockAuthService } from "@/services/mockAuthService";

import { isSupabaseEnabled} from "../supabase/client";
import { registerStudentSupabase, signInWithEmailPassword, signOutSupabase } from "../services/supabase/authRepository";
import { getUserProfileByUid } from "@/services/supabase";

type AuthStatus = "loading" | "ready";

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

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  bootstrap: async () => {
    try {
      const raw = await authStorage.getItem();
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        set({ user: parsed, status: "ready" });
        return;
      }
      set({ status: "ready" });
    } catch {
      set({ status: "ready" });
    }
  },

  // login: async ({ role, email, password }) => {
  //   const user = await mockAuthService.login({ role, email, password });
  //   await authStorage.setItem(JSON.stringify(user));
  //   set({ user });
  // },

  login: async ({ role, email, password }) => {
    // ==========================================
    // 1. LIVE SUPABASE LOGIN
    // ==========================================
    if (isSupabaseEnabled()) {
      const authUser = await signInWithEmailPassword(email, password);
      const profile = await getUserProfileByUid(authUser.id);
      
      if (!profile) {
        await signOutSupabase();
        throw new Error("Account authenticated, but no user profile exists in the system.");
      }

      const mappedUser: AuthUser = {
        role: profile.role ,
        id: profile.linkedPersonId || profile.id, 
        email: authUser.email || authUser.email || email,
        fullName: "Authenticated User",
        ...(profile.role === "tutor" ? { 
        studentId: profile.linkedStudentId || profile.linkedPersonId || profile.id, 
            moduleIds: profile.delegatedModuleIds || []
        
        } : {}),
      } as AuthUser;

      await authStorage.setItem(JSON.stringify(mappedUser));
      set({ user: mappedUser });
      return;
    }

    // ==========================================
    // 2. LEGACY MOCK LOGIN
    // ==========================================
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
    // Generate the standard student email format (adjust if your app does this differently)
    const email = `${args.studentNumber}@live.mut.ac.za`;

    if (isSupabaseEnabled()) {
      try {
        // 1. Save to Supabase
        const result = await registerStudentSupabase({
          ...args,
          email,
        });

        // 2. Create the AuthUser object for the app state
        const mappedUser: AuthUser = {
          role: "student",
          id: result.studentId, // Use the new database student ID
          email: email,
          fullName: args.fullName,
        };

        // 3. Save to local storage and state
        await authStorage.setItem(JSON.stringify(mappedUser));
        set({ user: mappedUser });
        return;
      } catch (error: any) {
        throw new Error(error.message || "Failed to register student.");
      }
    }

    // --- LEGACY MOCK REGISTRATION ---
    const user = await mockAuthService.registerStudent(args);
    await authStorage.setItem(JSON.stringify(user));
    set({ user });
  },
}));
