import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors, radius } from "@/theme";
import type { ModuleDelegateType } from "@/models/ModuleDelegation";

const LABELS: Record<ModuleDelegateType, string> = {
  tutor: "Module tutor",
  student_registrar: "Class registrar",
};

export function DelegationBadge({ delegateType, compact }: { delegateType: ModuleDelegateType; compact?: boolean }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: compact ? 2 : 4,
        paddingHorizontal: compact ? 8 : 10,
        borderRadius: radius.pill,
        backgroundColor: "rgba(0,98,129,0.12)",
      }}
    >
      <AppText variant="caption" color={colors.palette.accent} style={{ fontWeight: "700" }}>
        {LABELS[delegateType]}
      </AppText>
    </View>
  );
}
