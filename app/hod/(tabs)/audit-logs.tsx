import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AuditLogScreen } from "@/components/navigation/AuditLogScreen";

export default function HodAuditLogsTab() {
  useRoleGuard("hod");
  return <AuditLogScreen role="hod" />;
}
