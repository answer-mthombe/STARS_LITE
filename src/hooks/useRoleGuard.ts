import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/roles";

function homeForRole(role: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>["role"]): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "dean":
      return "/dean/dashboard";
    case "hod":
      return "/hod/dashboard";
    case "lecturer":
      return "/lecturer/dashboard";
    case "student":
    default:
      return "/student/dashboard";
  }
}

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
      router.replace(homeForRole(user.role) as never);
    }
  }, [user, status, allowedKey, router]);
}
