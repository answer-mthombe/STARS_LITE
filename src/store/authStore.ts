import { create } from "zustand";

import { authStorage } from "@/utils/authStorage";
import type { UserRole } from "@/types/roles";
import { mockAuthService } from "@/services/mockAuthService";

type AuthStatus = "loading" | "ready";

export type AuthUser =
  | { role: "student"; id: string; email: string; fullName: string }
  | { role: "lecturer"; id: string; email: string; fullName: string }
  | { role: "admin"; id: string; email: string; fullName: string };

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  bootstrap: () => Promise<void>;
  login: (args: { role: UserRole; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  registerStudent: (args: {
    fullName: string;
    studentNumber: string;
    gender: "male" | "female" | "other";
    facultyId: string;
    courseId: string;
    password: string;
  }) => Promise<void>;
};

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

  login: async ({ role, email, password }) => {
    const user = await mockAuthService.login({ role, email, password });
    await authStorage.setItem(JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    await authStorage.removeItem();
    set({ user: null });
  },

  registerStudent: async (args) => {
    const user = await mockAuthService.registerStudent(args);
    await authStorage.setItem(JSON.stringify(user));
    set({ user });
  },
}));

