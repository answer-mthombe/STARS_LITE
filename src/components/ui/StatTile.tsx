import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors, radius } from "@/theme";

export function StatTile({
  label,
  value,
  minWidth,
}: {
  label: string;
  value: string | number;
  minWidth?: `${number}%` | number;
}) {
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: (minWidth ?? "45%") as `${number}%`,
        padding: 14,
        borderRadius: radius.md,
        backgroundColor: "rgba(0,98,129,0.08)",
        borderWidth: 1,
        borderColor: colors.border.subtle,
      }}
    >
      <AppText variant="caption">{label}</AppText>
      <AppText variant="title" color={colors.palette.primary} style={{ marginTop: 4, fontSize: 22 }}>
        {value}
      </AppText>
    </View>
  );
}

export function HighlightStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: radius.md,
        backgroundColor: "rgba(0,98,129,0.10)",
        marginBottom: 14,
      }}
    >
      <AppText variant="metricLabel">{label}</AppText>
      <AppText variant="metricMd" style={{ marginTop: 4 }}>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="body" style={{ marginTop: 6 }}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}
