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
import { deanDepartmentBars, deanWeeklyTrend } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function DeanDashboardScreen() {
  useRoleGuard("dean");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const facultyId = user?.role === "dean" ? user.facultyId : "";

  // 1. Manage loading, error, and dynamic payload state
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Fetch the faculty-scoped data asynchronously
  useEffect(() => {
    if (!facultyId) return;
    
    let isMounted = true;
    async function loadDeanData() {
      try {
        setLoading(true);
        const data = await institutionAnalytics.facultyOverview(facultyId);
        if (isMounted) {
          setOverview(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to load faculty analytics.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDeanData();
    return () => { isMounted = false; };
  }, [facultyId, v]);

  // Keep the synchronous faculty context name mapping
  const faculty = useMemo(() => mockDB.read("faculties", facultyId), [facultyId, v]);

  // 3. Dynamic layout charts fallback securely if data is missing
  const previewDeptBars = useMemo(() => {
    if (!overview) return [];
    return deanDepartmentBars(overview).slice(0, 4);
  }, [overview]);

  const previewTrend = useMemo(() => {
    if (!overview) return [];
    return deanWeeklyTrend(overview.facultyAttendancePct).slice(-6);
  }, [overview]);

  // 4. Loading indicator view
  if (loading) {
    return (
      <ScreenShell title="Faculty overview" subtitle="STARS — Loading live data...">
        <Spacer size="xl" />
        <ActivityIndicator size="large" color="#006281" />
      </ScreenShell>
    );
  }

  // 5. Database execution failure block
  if (error || !overview) {
    return (
      <ScreenShell title="Faculty overview" subtitle="STARS — Connection Error">
        <Stack style={{ borderColor: "red", borderWidth: 1, borderRadius: 8, padding: 4 }}>
          <AppCard>
            <SectionHeader title="Database Connection Failed" />
            <AppText variant="body">{error || "No dynamic overview payload loaded."}</AppText>
          </AppCard>
        </Stack>
        <Spacer size="md" />
        <RoleQuickNav role="dean" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Faculty overview" subtitle={faculty?.facultyName ?? "Faculty"} scroll>
      <AppText variant="body" style={{ marginBottom: 14 }}>
        Analytics scoped to your faculty only — departments, lecturers, and attendance trends under your portfolio.
      </AppText>

      <HighlightStat
        label="Faculty attendance index"
        value={`${overview.facultyAttendancePct.toFixed(1)}%`}
        detail={`Active sessions right now: ${overview.activeSessions}`}
      />

      <Spacer size="md" />

      <AppCard>
        <SectionHeader title="Departments" />
        {overview.departmentStats?.map((d: any) => (
          <DividerListRow
            key={d.departmentId}
            left={d.name}
            right={`${(d.avgAttendance * 100).toFixed(0)}% · ${d.studentCount} students`}
          />
        ))}
      </AppCard>

      <Spacer size="md" />

      <AppCard>
        <SectionHeader title="Lecturer performance" />
        {overview.lecturerPerformance?.map((l: any) => (
          <Stack key={l.lecturerId} gap="xs" style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(0,98,129,0.25)" }}>
            <AppText variant="bodyStrong">{l.name}</AppText>
            <AppText variant="caption">
              Modules: {l.modulesTaught} · Marks recorded: {l.marksRecorded}
            </AppText>
          </Stack>
        ))}
      </AppCard>

      {overview.lowPerformingDepartments?.length > 0 ? (
        <>
          <Spacer size="md" />
          <AppCard>
            <SectionHeader title="Low-performing departments" />
            {overview.lowPerformingDepartments.map((d: any) => (
              <AppText key={d.departmentId} variant="body" style={{ marginBottom: 4 }}>
                {d.name} — {(d.avgAttendance * 100).toFixed(0)}%
              </AppText>
            ))}
          </AppCard>
        </>
      ) : null}

      <Spacer size="md" />

      <AppCard>
        <StatsBarChart title="Preview · departments (%)" data={previewDeptBars} />
        <Spacer size="sm" />
        <StatsLineChart title="Preview · faculty trend" points={previewTrend} />
      </AppCard>

      <Spacer size="md" />

      <AppButton title="Faculty charts (full simulation)" onPress={() => router.push("/dean/analytics")} />

      <Spacer size="lg" />
      <RoleQuickNav role="dean" />
    </ScreenShell>
  );
}