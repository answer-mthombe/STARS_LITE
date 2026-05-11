import { create } from "zustand";

/** Bump after mockDB mutations so screens can re-subscribe cheaply. */
export const useMockDbVersionStore = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
