import { useMemo, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

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
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { adminAttendanceTrend, adminFacultyBars } from "@/services/dashboardChartDummy";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function AdminDashboardScreen() {
  useRoleGuard("admin");
  const router = useRouter();
  const v = useMockDbVersionStore((s) => s.version);

  // 1. Manage state for backend remote data loading
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Fetch the asynchronous universityOverview data
  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);
        const data = await institutionAnalytics.universityOverview();
        if (isMounted) {
          setOverview(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to load admin analytics data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => { isMounted = false; };
  }, [v]);

  // 3. Dynamic layout charts fallback securely if data is missing
  const previewBars = useMemo(() => {
    if (!overview) return [];
    try {
      const bars = adminFacultyBars(overview);
      return Array.isArray(bars) ? bars.slice(0, 3) : [];
    } catch {
      return [];
    }
  }, [overview]);

  const previewTrend = useMemo(() => {
    if (!overview || overview.overallAttendanceRate == null) return [];
    try {
      const trend = adminAttendanceTrend(overview.overallAttendanceRate);
      return Array.isArray(trend) ? trend.slice(-8) : [];
    } catch {
      return [];
    }
  }, [overview]);

  // 4. Loading indicator view
  if (loading) {
    return (
      <ScreenShell title="University overview" subtitle="STARS — Loading live data...">
        <Spacer size="xl" />
        <ActivityIndicator size="large" color="#0000ff" />
      </ScreenShell>
    );
  }

  // 5. Database execution failure block
  if (error || !overview) {
    return (
      <ScreenShell title="University overview" subtitle="STARS — Connection Error">
        <Stack style={{ borderColor: "red", borderWidth: 1, borderRadius: 8, padding: 4 }}>
          <AppCard>
            <SectionHeader title="Database Connection Failed" />
            <AppText variant="body">{error || "No dynamic overview payload loaded."}</AppText>
          </AppCard>
        </Stack>
        <Spacer size="md" />
        <RoleQuickNav role="admin" />
      </ScreenShell>
    );
  }

  const statTiles = [
    { label: "Students", value: overview.totalStudents },
    { label: "Lecturers", value: overview.totalLecturers },
    { label: "Faculties", value: overview.totalFaculties },
    { label: "Departments", value: overview.totalDepartments },
    { label: "Courses", value: overview.totalCourses },
    { label: "Attendance rate", value: overview.overallAttendanceRate != null ? `${(overview.overallAttendanceRate * 100).toFixed(1)}%` : "0%" },
  ];

  const facultyPerformanceList = Array.isArray(overview.facultyPerformance) ? overview.facultyPerformance : [];

  return (
    <ScreenShell title="University overview" subtitle="STARS — institutional analytics" scroll>
      <AppText variant="body" style={{ marginBottom: 14 }}>
        Full visibility across Mangosuthu University of Technology: enrolment, attendance, and faculty performance
        routed live from remote engine via Supabase RPC services.
      </AppText>

      <Row wrap gap="sm" style={{ marginBottom: 4 }}>
        {statTiles.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} />
        ))}
      </Row>

      <Spacer size="lg" />

      <AppCard>
        <SectionHeader title="Activity & alerts" />
        <KeyValueRow label="Live attendance sessions" value={String(overview.activeSessions ?? 0)} />
        <KeyValueRow label="Low-attendance student alerts (<60%)" value={String(overview.lowAttendanceAlerts ?? 0)} />
        <KeyValueRow label="Attendance records (all time)" value={String(overview.totalAttendanceRecords ?? 0)} />
      </AppCard>

      <Spacer size="md" />

      <AppCard>
        <SectionHeader title="Faculty performance snapshot" />
        {facultyPerformanceList.length > 0 ? (
          facultyPerformanceList.map((f: any) => (
            <DividerListRow
              key={f.facultyId ?? f.facultyName}
              left={f.facultyName}
              right={`${((f.avgAttendance ?? 0) * 100).toFixed(0)}% avg`}
            />
          ))
        ) : (
          <AppText variant="body">No faculty performance data available.</AppText>
        )}
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