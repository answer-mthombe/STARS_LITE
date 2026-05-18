import { useCallback } from "react";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/store/authStore";

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return useCallback(async () => {
    await logout();
    router.replace("/onboarding");
  }, [logout, router]);
}
