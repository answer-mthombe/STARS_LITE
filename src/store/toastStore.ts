import { create } from "zustand";

export type ToastType = "success" | "error" | "info";
export type Toast = { type: ToastType; title: string; message?: string } | null;

type ToastState = {
  toast: Toast;
  show: (toast: NonNullable<Toast>) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (toast) => set({ toast }),
  hide: () => set({ toast: null }),
}));

