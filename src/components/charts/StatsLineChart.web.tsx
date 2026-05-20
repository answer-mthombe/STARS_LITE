import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { colors } from "@/theme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type Props = {
  title: string;
  points: number[];
  labels?: string[];
};

export function StatsLineChart({ title, points, labels }: Props) {
  const labs = labels ?? points.map((_, i) => `${i + 1}`);

  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ color: colors.palette.accent, fontWeight: 900, marginBottom: 10, marginTop: 0 }}>{title}</p>
      <Line
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: false, ticks: { color: colors.ink.muted } },
            x: { ticks: { color: colors.ink.muted } },
          },
        }}
        data={{
          labels: labs,
          datasets: [
            {
              label: title,
              data: points,
              borderColor: colors.palette.primary,
              backgroundColor: "rgba(0, 98, 129, 0.15)",
              fill: true,
              tension: 0.35,
            },
          ],
        }}
      />
      <p style={{ color: colors.ink.muted, fontSize: 12, marginTop: 8 }}>
        Simulation — Supabase phase will use dated rollups (JOB-019).
      </p>
    </div>
  );
}
