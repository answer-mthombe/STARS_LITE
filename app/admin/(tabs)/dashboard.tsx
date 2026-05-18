import { useMemo } from "react";
import { useRouter } from "expo-router";

import {
  AppButton,
  AppCard,
  AppText,
  DividerListRow,
  KeyValueRow,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
  StatTile,
} from "@/components/ui";
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { adminAttendanceTrend, adminFacultyBars } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function AdminDashboardScreen() {
  useRoleGuard("admin");
  const router = useRouter();
  const v = useMockDbVersionStore((s) => s.version);

  const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.universityOverview();
  }, [v]);

  const previewBars = useMemo(() => adminFacultyBars(overview).slice(0, 3), [overview]);
  const previewTrend = useMemo(() => adminAttendanceTrend(overview.overallAttendanceRate).slice(-8), [overview]);

  const statTiles = [
    { label: "Students", value: overview.totalStudents },
    { label: "Lecturers", value: overview.totalLecturers },
    { label: "Faculties", value: overview.totalFaculties },
    { label: "Departments", value: overview.totalDepartments },
    { label: "Courses", value: overview.totalCourses },
    { label: "Attendance rate", value: `${(overview.overallAttendanceRate * 100).toFixed(1)}%` },
  ];

  return (
    <ScreenShell title="University overview" subtitle="STARS — institutional analytics (simulation)" scroll>
      <AppText variant="body" style={{ marginBottom: 14 }}>
        Full visibility across Mangosuthu University of Technology: enrolment, attendance, and faculty performance
        (mock data — Firebase will scope the same views per security rules).
      </AppText>

      <Row wrap gap="sm" style={{ marginBottom: 4 }}>
        {statTiles.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} />
        ))}
      </Row>

      <Spacer size="lg" />

      <AppCard>
        <SectionHeader title="Activity & alerts" />
        <KeyValueRow label="Live attendance sessions" value={String(overview.activeSessions)} />
        <KeyValueRow label="Low-attendance student alerts (&lt;60%)" value={String(overview.lowAttendanceAlerts)} />
        <KeyValueRow label="Attendance records (all time)" value={String(overview.totalAttendanceRecords)} />
      </AppCard>

      <Spacer size="md" />

      <AppCard>
        <SectionHeader title="Faculty performance snapshot" />
        {overview.facultyPerformance.map((f) => (
          <DividerListRow
            key={f.facultyId}
            left={f.facultyName}
            right={`${(f.avgAttendance * 100).toFixed(0)}% avg`}
          />
        ))}
      </AppCard>

      <Spacer size="md" />

      <AppCard>
        <StatsBarChart title="Preview · attendance by faculty (%)" data={previewBars} />
        <Spacer size="sm" />
        <StatsLineChart title="Preview · 8-day attendance index" points={previewTrend} />
      </AppCard>

      <Spacer size="md" />

      <AppButton title="Charts & trends (full simulation)" onPress={() => router.push("/admin/analytics")} />

      <Spacer size="lg" />
      <RoleQuickNav role="admin" />
    </ScreenShell>
  );
}
