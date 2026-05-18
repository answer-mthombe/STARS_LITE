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
import { dummyHeatmapMatrix, hodModuleBars, hodRiskTrend } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function HodAnalyticsSimulationScreen() {
  useRoleGuard("hod");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const departmentId = user?.role === "hod" ? user.departmentId : "";
  const v = useMockDbVersionStore((s) => s.version);

  const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.departmentOverview(departmentId);
  }, [departmentId, v]);

  const modBars = useMemo(() => hodModuleBars(overview), [overview]);
  const risk = useMemo(() => hodRiskTrend(overview.attendanceRate), [overview]);
  const heat = useMemo(() => dummyHeatmapMatrix(`hod-${departmentId}`), [departmentId]);

  return (
    <ScreenShell title="Department analytics" subtitle="Charts simulation (scoped to your department)" scroll showBack>
      <Text style={{ color: colors.ink.muted, marginBottom: 14, lineHeight: 22 }}>
        Module bars use synthetic attendance proxies; trend shows fictional risk trajectory anchored on department rate.
      </Text>

      <AppCard>
        <StatsBarChart title="Module attendance proxy (%)" data={modBars} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsLineChart title="At-risk trajectory (dummy)" points={risk.map((x) => x * 100)} labels={["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"]} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <MockHeatmapGrid title="Module × day activity (simulation)" matrix={heat} />
      </AppCard>

      <View style={{ height: 18 }} />

      <AppButton title="Back to dashboard" onPress={() => router.back()} />
    </ScreenShell>
  );
}
