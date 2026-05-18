import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AuditLogScreen } from "@/components/navigation/AuditLogScreen";

export default function AdminAuditLogsTab() {
  useRoleGuard("admin");
  return <AuditLogScreen role="admin" />;
}
