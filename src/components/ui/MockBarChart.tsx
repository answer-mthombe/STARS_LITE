import { View, Text } from "react-native";

import { colors } from "@/theme";
import type { BarDatum } from "@/services/dashboardChartDummy";

type Props = {
  title: string;
  data: BarDatum[];
  /** Max bar length denominator (default 100 for percentages) */
  max?: number;
  unit?: string;
};

export function MockBarChart({ title, data, max = 100, unit = "%" }: Props) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>{title}</Text>
      {data.map((row, i) => {
        const pct = Math.min(100, (row.value / max) * 100);
        return (
          <View key={`${row.label}-${i}`} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: colors.ink.default, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                {row.label}
              </Text>
              <Text style={{ color: colors.palette.primary, fontWeight: "800" }}>
                {row.value.toFixed(max === 100 ? 1 : 0)}
                {unit}
              </Text>
            </View>
            <View style={{ height: 10, borderRadius: 6, backgroundColor: "rgba(0,98,129,0.12)", overflow: "hidden" }}>
              <View
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: 6,
                  backgroundColor: colors.palette.accent,
                }}
              />
            </View>
            {row.subtitle ? (
              <Text style={{ color: colors.ink.muted, fontSize: 11, marginTop: 2 }}>{row.subtitle}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
