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
import { deanDepartmentBars, deanWeeklyTrend } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function DeanDashboardScreen() {
  useRoleGuard("dean");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const facultyId = user?.role === "dean" ? user.facultyId : "";
  const faculty = useMemo(() => mockDB.read("faculties", facultyId), [facultyId, v]);

  const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.facultyOverview(facultyId);
  }, [facultyId, v]);

  const previewDeptBars = useMemo(() => deanDepartmentBars(overview).slice(0, 4), [overview]);
  const previewTrend = useMemo(() => deanWeeklyTrend(overview.facultyAttendancePct).slice(-6), [overview]);

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

      <AppCard>
        <SectionHeader title="Departments" />
        {overview.departmentStats.map((d) => (
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
        {overview.lecturerPerformance.map((l) => (
          <Stack key={l.lecturerId} gap="xs" style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(0,98,129,0.25)" }}>
            <AppText variant="bodyStrong">{l.name}</AppText>
            <AppText variant="caption">
              Modules: {l.modulesTaught} · Marks recorded: {l.marksRecorded}
            </AppText>
          </Stack>
        ))}
      </AppCard>

      {overview.lowPerformingDepartments.length > 0 ? (
        <>
          <Spacer size="md" />
          <AppCard>
            <SectionHeader title="Low-performing departments" />
            {overview.lowPerformingDepartments.map((d) => (
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
