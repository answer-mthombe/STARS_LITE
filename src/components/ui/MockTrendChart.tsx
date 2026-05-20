import { View, Text } from "react-native";

import { colors } from "@/theme";

type Props = {
  title: string;
  /** Series of points in 0–100 (attendance index) */
  points: number[];
  labels?: string[];
};

export function MockTrendChart({ title, points, labels }: Props) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const h = 88;

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>{title}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: h, gap: 4 }}>
        {points.map((p, i) => {
          const normalized = (p - min) / range;
          const barH = 12 + normalized * (h - 24);
          return (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: "100%",
                  maxWidth: 14,
                  height: barH,
                  borderRadius: 4,
                  backgroundColor: colors.palette.primary,
                  opacity: 0.75 + (i % 3) * 0.08,
                }}
              />
              <Text style={{ color: colors.ink.muted, fontSize: 9, marginTop: 4 }} numberOfLines={1}>
                {labels?.[i] ?? `${i + 1}`}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={{ color: colors.ink.muted, fontSize: 12, marginTop: 6 }}>
        Simulation — Supabase phase will use dated rollups (JOB-019).
      </Text>
    </View>
  );
}
