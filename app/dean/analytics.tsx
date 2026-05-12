import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { MockHeatmapGrid } from "@/components/ui/MockHeatmapGrid";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { deanDepartmentBars, deanWeeklyTrend, dummyHeatmapMatrix } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function DeanAnalyticsSimulationScreen() {
  useRoleGuard("dean");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const facultyId = user?.role === "dean" ? user.facultyId : "";
  const v = useMockDbVersionStore((s) => s.version);

  const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.facultyOverview(facultyId);
  }, [facultyId, v]);

  const deptBars = useMemo(() => deanDepartmentBars(overview), [overview]);
  const trend = useMemo(() => deanWeeklyTrend(overview.facultyAttendancePct), [overview]);
  const { heatMatrix, heatLabels } = useMemo(() => {
    const full = dummyHeatmapMatrix(`dean-${facultyId}`);
    const n = Math.min(full.length, Math.max(overview.departmentStats.length, 1));
    return {
      heatMatrix: full.slice(0, n),
      heatLabels: overview.departmentStats.slice(0, n).map((d) => d.name.slice(0, 4)),
    };
  }, [facultyId, overview]);

  return (
    <ScreenShell title="Faculty analytics" subtitle="Charts simulation (scoped to your faculty)" scroll showBack>
      <Text style={{ color: colors.ink.muted, marginBottom: 14, lineHeight: 22 }}>
        Dummy trends + heatmap; department bars use live averages from the mock DB for your faculty.
      </Text>

      <AppCard>
        <StatsBarChart title="Department attendance (%)" data={deptBars} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsLineChart title="8-week faculty attendance trend (index)" points={trend} labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <MockHeatmapGrid title="Department × day heatmap (simulation)" matrix={heatMatrix} rowLabels={heatLabels} />
      </AppCard>

      <View style={{ height: 18 }} />

      <AppButton title="Back to dashboard" onPress={() => router.back()} />
    </ScreenShell>
  );
}
