import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import { colors } from "@/theme";
import type { BarDatum } from "@/services/dashboardChartDummy";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Props = {
  title: string;
  data: BarDatum[];
  max?: number;
  unit?: string;
};

export function StatsBarChart({ title, data, max = 100, unit = "%" }: Props) {
  const chartMax = Math.max(max, ...data.map((d) => d.value), 1);

  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ color: colors.palette.accent, fontWeight: 900, marginBottom: 10, marginTop: 0 }}>{title}</p>
      <Bar
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: (ctx) => {
                  const row = data[ctx.dataIndex];
                  return row?.subtitle ? String(row.subtitle) : "";
                },
              },
            },
          },
          scales: {
            y: { beginAtZero: true, max: chartMax, ticks: { color: colors.ink.muted } },
            x: { ticks: { color: colors.ink.muted, maxRotation: 45, minRotation: 0 } },
          },
        }}
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            {
              label: title,
              data: data.map((d) => d.value),
              backgroundColor: colors.palette.accent,
              borderRadius: 6,
            },
          ],
        }}
      />
      <p style={{ color: colors.ink.muted, fontSize: 12, marginTop: 8 }}>
        Values shown in {unit} (max scale {chartMax.toFixed(0)}
        {unit}).
      </p>
    </div>
  );
}
