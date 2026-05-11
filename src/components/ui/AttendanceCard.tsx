import { Text, View } from "react-native";

import { colors, radius } from "@/theme";
import { Badge } from "./Badge";

export function AttendanceCard({
  title,
  subtitle,
  distanceM,
  verified,
}: {
  title: string;
  subtitle: string;
  distanceM?: number;
  verified: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface.base,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{title}</Text>
        <Text style={{ color: colors.ink.muted, fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
        {distanceM != null ? (
          <Text style={{ color: colors.ink.subtle, fontSize: 12, marginTop: 4 }}>{Math.round(distanceM)}m from pin</Text>
        ) : null}
      </View>
      <Badge label={verified ? "Verified" : "Pending"} tone={verified ? "accent" : "muted"} />
    </View>
  );
}
