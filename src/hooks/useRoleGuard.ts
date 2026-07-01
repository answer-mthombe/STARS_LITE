import { useEffect } from "react";
import {  useRouter } from "expo-router";
import {usePathname} from "expo-router/build/hooks";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/roles";
import { INSTITUTION_ROLES } from "@/types/roles";
import { homeRouteForUser } from "@/utils/roleRouting";

const KNOWN_ROLES = INSTITUTION_ROLES as readonly string[];

export interface GuardConfig {
  allowedRoles: UserRole[];
  facultyId?: string;
  departmentId?: string;
  moduleId?: string;
}



export function useRoleGuard(config: UserRole | UserRole[] | GuardConfig) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  // 2. Stringify the config to create a stable dependency and prevent refresh loops
  const configString = JSON.stringify(config);

  useEffect(() => {
    if (status === "loading") return;

    if (!user) {
      if (pathname !== "/onboarding") router.replace("/onboarding");
      return;
    }

    if (!KNOWN_ROLES.includes(user.role)) {
      if (pathname !== "/onboarding") router.replace("/onboarding");
      return;
    }

    // 3. Normalize the config input
    let allowedRoles: UserRole[] = [];
    let requiredFaculty: string | undefined;
    let requiredDept: string | undefined;
    let requiredModule: string | undefined;

    if (typeof config === "string") {
      allowedRoles = [config as UserRole];
    } else if (Array.isArray(config)) {
      allowedRoles = config;
    } else {
      allowedRoles = config.allowedRoles;
      requiredFaculty = config.facultyId;
      requiredDept = config.departmentId;
      requiredModule = config.moduleId;
    }

    // Base check: Does the user have the right role?
    let hasAccess = allowedRoles.includes(user.role);

    // 4. Structural Scope Tracking (STORY-203)
    // Because your AuthUser type uses a discriminated union, TypeScript knows 
    // that if user.role === 'dean', user.facultyId exists.
    if (hasAccess) {
      if (user.role === "dean" && requiredFaculty) {
        hasAccess = user.facultyId === requiredFaculty;
      }
      if (user.role === "hod" && requiredDept) {
        hasAccess = user.departmentId === requiredDept;
      }
      if (user.role === "tutor" && requiredModule) {
        hasAccess = user.moduleIds?.includes(requiredModule);
      }
    }

    // 5. Safely redirect if access is denied
    if (!hasAccess) {
      const target = homeRouteForUser(user);
      if (pathname !== target) router.replace(target as never);
    }
    
  }, [user, status, configString, pathname, router]);
}