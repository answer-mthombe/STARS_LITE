import type { AuthUser } from "@/store/authStore";

/** Default home route after login or guard redirect */
export function homeRouteForUser(user: AuthUser): string {
  switch (user.role) {
    case "admin":
      return "/admin/dashboard";
    case "dean":
      return "/dean/dashboard";
    case "hod":
      return "/hod/dashboard";
    case "lecturer":
      return "/lecturer/dashboard";
    case "tutor":
      return "/tutor/dashboard";
    case "student":
    default:
      return "/student/dashboard";
  }
}
