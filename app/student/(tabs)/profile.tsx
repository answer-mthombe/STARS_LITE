import { useRoleGuard } from "@/hooks/useRoleGuard";
import { StudentProfileContent } from "@/screens/StudentProfileContent";

export default function StudentProfileTab() {
  useRoleGuard("student");
  return <StudentProfileContent />;
}
