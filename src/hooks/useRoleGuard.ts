import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/roles";

export function useRoleGuard(allowed: UserRole | UserRole[]) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const allowedKey = Array.isArray(allowed) ? allowed.join(",") : allowed;

  useEffect(() => {
    const list = allowedKey.split(",") as UserRole[];
    if (status === "loading") return;
    if (!user) {
      router.replace("/onboarding");
      return;
    }
    if (!list.includes(user.role)) {
      if (user.role === "lecturer") router.replace("/lecturer/dashboard");
      else if (user.role === "admin") router.replace("/admin/seed");
      else router.replace("/student/dashboard");
    }
  }, [user, status, allowedKey, router]);
}
