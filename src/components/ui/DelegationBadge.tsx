import { View, Text } from "react-native";
import { colors } from "@/theme";
import type { ModuleDelegateType } from "@/models/ModuleDelegation";

const LABELS: Record<ModuleDelegateType, string> = {
  tutor: "Module tutor",
  student_registrar: "Class registrar",
};

type Props = {
  delegateType: ModuleDelegateType;
  compact?: boolean;
};

export function DelegationBadge({ delegateType, compact }: Props) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: compact ? 2 : 4,
        paddingHorizontal: compact ? 8 : 10,
        borderRadius: 9999,
        backgroundColor: "rgba(0,98,129,0.12)",
      }}
    >
      <Text style={{ color: colors.palette.accent, fontSize: compact ? 11 : 12, fontWeight: "700" }}>
        {LABELS[delegateType]}
      </Text>
    </View>
  );
}
