import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AuditLogScreen } from "@/components/navigation/AuditLogScreen";

export default function DeanAuditLogsTab() {
  useRoleGuard("dean");
  return <AuditLogScreen role="dean" />;
}
