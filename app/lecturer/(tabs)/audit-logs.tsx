import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AuditLogScreen } from "@/components/navigation/AuditLogScreen";

export default function LecturerAuditLogsTab() {
  useRoleGuard("lecturer");
  return <AuditLogScreen role="lecturer" />;
}
