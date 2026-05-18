import { AppCard } from "@/components/ui/AppCard";
import { AppText } from "@/components/ui/AppText";
import type { InstitutionRole } from "@/types/roles";

const ROLE_LABELS: Record<InstitutionRole, string> = {
  admin: "System admin",
  dean: "Dean",
  hod: "Head of department",
  lecturer: "Lecturer",
  tutor: "Module tutor",
  student: "Student",
};

export function RoleScopeCard({
  role,
  scopeLabel,
  detail,
}: {
  role: InstitutionRole;
  scopeLabel: string;
  detail?: string;
}) {
  return (
    <AppCard>
      <AppText variant="label">{ROLE_LABELS[role]}</AppText>
      <AppText variant="heading" style={{ marginTop: 4, fontSize: 16 }}>
        {scopeLabel}
      </AppText>
      {detail ? (
        <AppText variant="body" style={{ marginTop: 6 }}>
          {detail}
        </AppText>
      ) : null}
    </AppCard>
  );
}
