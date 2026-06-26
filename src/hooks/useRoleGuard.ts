import { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/roles";
import { INSTITUTION_ROLES } from "@/types/roles";
import { homeRouteForUser } from "@/utils/roleRouting";

const KNOWN_ROLES = INSTITUTION_ROLES as readonly string[];

export function useRoleGuard(allowed: UserRole | UserRole[]) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const allowedKey = Array.isArray(allowed) ? allowed.join(",") : allowed;

  useEffect(() => {
    if (status === "loading") return;

    // Not signed in → onboarding (guard against redundant navigation).
    if (!user) {
      if (pathname !== "/onboarding") router.replace("/onboarding");
      return;
    }

    // An unknown/invalid role can never satisfy any screen guard. Without this
    // check, homeRouteForUser() points back to a guarded screen and we replace()
    // forever → "Maximum update depth exceeded". Send them to onboarding once.
    if (!KNOWN_ROLES.includes(user.role)) {
      if (pathname !== "/onboarding") router.replace("/onboarding");
      return;
    }

    const list = allowedKey.split(",") as UserRole[];
    if (!list.includes(user.role)) {
      const target = homeRouteForUser(user);
      // Only redirect when we are not already at the destination — this is what
      // prevents an infinite redirect loop between guarded screens.
      if (pathname !== target) router.replace(target as never);
    }
  }, [user, status, allowedKey, router, pathname]);
}
