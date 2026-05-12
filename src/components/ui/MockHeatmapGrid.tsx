import { View, Text } from "react-native";

import { colors } from "@/theme";

type Props = {
  title: string;
  /** Rows of intensities 0–1 */
  matrix: number[][];
  rowLabels?: string[];
  colLabels?: string[];
};

function heatColor(t: number) {
  const a = Math.min(1, Math.max(0, t));
  const r = Math.round(232 - a * 120);
  const g = Math.round(232 - a * 40);
  const b = Math.round(232 - a * 100);
  return `rgb(${r},${g},${b})`;
}

export function MockHeatmapGrid({ title, matrix, rowLabels, colLabels }: Props) {
  const cols = matrix[0]?.length ?? 0;
  const dayLabels = colLabels ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>{title}</Text>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 28, paddingTop: 18 }}>
          {(rowLabels ?? ["W1", "W2", "W3", "W4", "W5"]).map((lb, i) => (
            <Text key={lb} style={{ color: colors.ink.muted, fontSize: 10, height: 22, lineHeight: 22 }}>
              {rowLabels?.[i] ?? lb}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            {Array.from({ length: cols }).map((_, j) => (
              <Text key={j} style={{ flex: 1, textAlign: "center", color: colors.ink.muted, fontSize: 9 }}>
                {dayLabels[j] ?? j}
              </Text>
            ))}
          </View>
          {matrix.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
              {row.map((cell, ci) => (
                <View
                  key={ci}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    maxHeight: 22,
                    borderRadius: 4,
                    backgroundColor: heatColor(cell),
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <Text style={{ color: colors.ink.muted, fontSize: 12, marginTop: 6 }}>
        Darker = higher simulated participation (dummy matrix).
      </Text>
    </View>
  );
}
