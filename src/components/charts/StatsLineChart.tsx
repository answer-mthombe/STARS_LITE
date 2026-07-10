import { useMemo } from "react";
import { Dimensions, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

import { colors } from "@/theme";

type Props = {
  title: string;
  points: number[];
  labels?: string[];
  isLive?: boolean;
};

export function StatsLineChart({ title, points, labels, isLive=false }: Props) {
  const width = Dimensions.get("window").width - 48;
  // const chartConfig = useMemo(
  //   () => ({
  //     backgroundGradientFrom: colors.surface.base,
  //     backgroundGradientTo: colors.surface.base,
  //     color: () => colors.palette.primary,
  //     labelColor: () => colors.ink.muted,
  //     propsForDots: { r: "4" },
  //   }),
  //   []
  // );

  // const data = useMemo(
  //   () => ({
  //     labels: labels ?? points.map((_, i) => `${i + 1}`),
  //     datasets: [{ data: points }],
  //   }),
  //   [points, labels]
  // );

if (!points || points.length === 0) {
    return (
      <View style={{ marginBottom: 8 }}>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>{title}</Text>
        <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface.base, borderRadius: 12 }}>
          <Text style={{ color: colors.ink.muted }}>No attendance data recorded yet.</Text>
        </View>
      </View>
    );
  }

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.surface.base,
      backgroundGradientTo: colors.surface.base,
      color: () => colors.palette.primary,
      labelColor: () => colors.ink.muted,
      propsForDots: { r: "4" },
    }),
    []
  );

  const data = useMemo(
    () => ({
      labels: labels ?? points.map((_, i) => `${i + 1}`),
      datasets: [{ data: points }],
    }),
    [points, labels]
  );

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>{title}</Text>
      <LineChart
        data={data}
        width={width}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={{ borderRadius: 12, marginVertical: 4 }}
      />
      {/* <Text style={{ color: colors.ink.muted, fontSize: 12, marginTop: 6 }}>
        Simulation — Supabase phase will use dated rollups (JOB-019).
      </Text> */}

      {!isLive && (
        <Text style={{ color: colors.ink.muted, fontSize: 12, marginTop: 6 }}>
          Simulation — Using dummy data
        </Text>
      )}
    </View>
  );
}
