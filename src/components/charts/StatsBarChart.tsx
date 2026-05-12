import { useMemo } from "react";
import { Dimensions, Text, View } from "react-native";
import { BarChart } from "react-native-chart-kit";

import { colors } from "@/theme";
import type { BarDatum } from "@/services/dashboardChartDummy";

type Props = {
  title: string;
  data: BarDatum[];
  max?: number;
  unit?: string;
};

export function StatsBarChart({ title, data, max = 100, unit = "%" }: Props) {
  const width = Dimensions.get("window").width - 48;
  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.surface.base,
      backgroundGradientTo: colors.surface.base,
      color: () => colors.palette.accent,
      labelColor: () => colors.ink.muted,
      barPercentage: 0.65,
      decimalPlaces: max === 100 ? 1 : 0,
      propsForLabels: { fontSize: 10 },
    }),
    [max]
  );

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => (d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label)),
      datasets: [{ data: data.map((d) => d.value) }],
    }),
    [data]
  );

  const chartMax = Math.max(max, ...data.map((d) => d.value), 1);

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>{title}</Text>
      <BarChart
        data={chartData}
        width={width}
        height={220}
        yAxisLabel=""
        yAxisSuffix={unit === "%" ? "%" : ""}
        fromZero
        segments={4}
        chartConfig={chartConfig}
        style={{ borderRadius: 12, marginVertical: 4 }}
        showValuesOnTopOfBars
        withHorizontalLabels
        withVerticalLabels
      />
      <Text style={{ color: colors.ink.muted, fontSize: 11, marginTop: 6 }}>
        Scale 0–{chartMax.toFixed(0)}
        {unit}
      </Text>
      {data.some((d) => d.subtitle) ? (
        <View style={{ marginTop: 8, gap: 4 }}>
          {data.map((row, i) =>
            row.subtitle ? (
              <Text key={`${row.label}-${i}`} style={{ color: colors.ink.muted, fontSize: 11 }}>
                {row.label}: {row.subtitle}
              </Text>
            ) : null
          )}
        </View>
      ) : null}
    </View>
  );
}
