import { create } from "zustand";

/**
 * Tracks whether the student app has been unlocked with a fingerprint in this app run.
 * The store is in memory only, so closing the app resets it and the next open is locked.
 */
type AppLockState = {
  /** The start-up decision has been made (needs the auth store to be ready first). */
  decided: boolean;
  unlocked: boolean;
  /** Called once after sign-in state is known. `startedSignedInAsStudent` => lock until fingerprint. */
  decide: (startedSignedInAsStudent: boolean) => void;
  unlock: () => void;
};

export const useAppLockStore = create<AppLockState>((set) => ({
  decided: false,
  unlocked: false,
  decide: (startedSignedInAsStudent) => set({ decided: true, unlocked: !startedSignedInAsStudent }),
  unlock: () => set({ unlocked: true }),
}));
