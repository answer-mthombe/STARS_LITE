import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors } from "@/theme";

export function KeyValueRow({
  label,
  value,
  bordered,
}: {
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
        borderBottomWidth: bordered ? 1 : 0,
        borderBottomColor: colors.border.subtle,
      }}
    >
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}
