import { create } from "zustand";

type SessionState = {
  activeSessionId: string | null;
  selectedModuleId: string | null;
  setActiveSessionId: (id: string | null) => void;
  setSelectedModuleId: (id: string | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  selectedModuleId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setSelectedModuleId: (id) => set({ selectedModuleId: id }),
}));
