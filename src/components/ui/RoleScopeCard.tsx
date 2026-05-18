import { View, Text } from "react-native";
import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/theme";
import type { InstitutionRole } from "@/types/roles";

const ROLE_LABELS: Record<InstitutionRole, string> = {
  admin: "System admin",
  dean: "Dean",
  hod: "Head of department",
  lecturer: "Lecturer",
  tutor: "Module tutor",
  student: "Student",
};

type Props = {
  role: InstitutionRole;
  scopeLabel: string;
  detail?: string;
};

export function RoleScopeCard({ role, scopeLabel, detail }: Props) {
  return (
    <AppCard>
      <Text style={{ color: colors.palette.primary, fontWeight: "800", fontSize: 13 }}>{ROLE_LABELS[role]}</Text>
      <Text style={{ color: colors.ink.default, fontWeight: "700", marginTop: 4, fontSize: 16 }}>{scopeLabel}</Text>
      {detail ? (
        <Text style={{ color: colors.ink.muted, marginTop: 6, fontSize: 13 }}>{detail}</Text>
      ) : null}
    </AppCard>
  );
}
