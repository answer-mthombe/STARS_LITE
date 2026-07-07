import { useMemo, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

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
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function HodDashboardScreen() {
  useRoleGuard("hod");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const departmentId = user?.role === "hod" ? user.departmentId : "";

  // 1. Manage loading, error, and dynamic payload state
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Fetch the department-scoped data asynchronously
  useEffect(() => {
    if (!departmentId) return;

    let isMounted = true;
    async function loadHodData() {
      try {
        setLoading(true);
        const data = await institutionAnalytics.departmentOverview(departmentId);
        if (isMounted) {
          setOverview(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to load department analytics.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHodData();
    return () => { isMounted = false; };
  }, [departmentId, v]);

  // 3. Dynamic layout charts fallback securely if data is missing
  const previewModBars = useMemo(() => {
    if (!overview) return [];
    return hodModuleBars(overview).slice(0, 4);
  }, [overview]);

  const previewRisk = useMemo(() => {
    if (!overview) return [];
    return hodRiskTrend(overview.attendanceRate).slice(-6).map((x) => x * 100);
  }, [overview]);

  // 4. Loading indicator view
  if (loading) {
    return (
      <ScreenShell title="Department overview" subtitle="STARS — Loading live data...">
        <Spacer size="xl" />
        <ActivityIndicator size="large" color="#006281" />
      </ScreenShell>
    );
  }

  // 5. Database execution failure block
  if (error || !overview) {
    return (
      <ScreenShell title="Department overview" subtitle="STARS — Connection Error">
        <Stack style={{ borderColor: "red", borderWidth: 1, borderRadius: 8, padding: 4 }}>
          <AppCard>
            <SectionHeader title="Database Connection Failed" />
            <AppText variant="body">{error || "No dynamic overview payload loaded."}</AppText>
          </AppCard>
        </Stack>
        <Spacer size="md" />
        <RoleQuickNav role="hod" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Department overview" subtitle={overview.departmentName} scroll>
      <AppText variant="body" style={{ marginBottom: 14 }}>
        Head of Department view — courses, modules, lecturers, and student attendance risk within your department only.
      </AppText>

      <HighlightStat
        label="Department attendance rate"
        value={`${(overview.attendanceRate * 100).toFixed(1)}%`}
        detail={`Students tracked: ${overview.studentInsights?.total ?? 0} · At-risk (<55%): ${overview.studentInsights?.atRiskCount ?? 0}`}
      />

      <Spacer size="md" />

      <AppCard>
        <SectionHeader title="Modules" />
        {overview.moduleStats?.map((m: any) => (
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