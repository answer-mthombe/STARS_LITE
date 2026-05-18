import { useMemo } from "react";
import { useRouter } from "expo-router";

import {
  AppButton,
  AppCard,
  AppText,
  DividerListRow,
  HighlightStat,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { hodModuleBars, hodRiskTrend } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function HodDashboardScreen() {
  useRoleGuard("hod");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const departmentId = user?.role === "hod" ? user.departmentId : "";

  const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.departmentOverview(departmentId);
  }, [departmentId, v]);

  const previewModBars = useMemo(() => hodModuleBars(overview).slice(0, 4), [overview]);
  const previewRisk = useMemo(() => hodRiskTrend(overview.attendanceRate).slice(-6).map((x) => x * 100), [overview]);

  return (
    <ScreenShell title="Department overview" subtitle={overview.departmentName} scroll>
      <AppText variant="body" style={{ marginBottom: 14 }}>
        Head of Department view — courses, modules, lecturers, and student attendance risk within your department only.
      </AppText>

      <HighlightStat
        label="Department attendance rate"
        value={`${(overview.attendanceRate * 100).toFixed(1)}%`}
        detail={`Students tracked: ${overview.studentInsights.total} · At-risk (&lt;55%): ${overview.studentInsights.atRiskCount}`}
      />

      <AppCard>
        <SectionHeader title="Modules" />
        {overview.moduleStats.map((m) => (
          <DividerListRow key={m.moduleId} left={m.name} right={`${m.enrolled} enrolled`} />
        ))}
      </AppCard>

      <Spacer size="md" />

      <AppCard>
        <StatsBarChart title="Preview · modules (proxy %)" data={previewModBars} />
        <Spacer size="sm" />
        <StatsLineChart title="Preview · at-risk trend" points={previewRisk} />
      </AppCard>

      <Spacer size="md" />

      <AppButton title="Department analytics (full)" onPress={() => router.push("/hod/analytics")} />

      <Spacer size="lg" />
      <RoleQuickNav role="hod" />
    </ScreenShell>
  );
}
