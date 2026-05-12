import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { adminAttendanceTrend, adminFacultyBars } from "@/services/dashboardChartDummy";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function AdminDashboardScreen() {
  useRoleGuard("admin");
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
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
      <Text style={{ color: colors.ink.muted, marginBottom: 14, lineHeight: 22 }}>
        Full visibility across Mangosuthu University of Technology: enrolment, attendance, and faculty performance (mock
        data — Firebase will scope the same views per security rules).
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {statTiles.map((t) => (
          <View
            key={t.label}
            style={{
              flexGrow: 1,
              minWidth: "45%",
              padding: 14,
              borderRadius: 14,
              backgroundColor: "rgba(0,98,129,0.08)",
              borderWidth: 1,
              borderColor: colors.border.subtle,
            }}
          >
            <Text style={{ color: colors.ink.muted, fontSize: 12 }}>{t.label}</Text>
            <Text style={{ color: colors.palette.primary, fontSize: 22, fontWeight: "900", marginTop: 4 }}>{t.value}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 16 }} />

      <AppCard>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Activity & alerts</Text>
        <Row label="Live attendance sessions" value={String(overview.activeSessions)} />
        <Row label="Low-attendance student alerts (&lt;60%)" value={String(overview.lowAttendanceAlerts)} />
        <Row label="Attendance records (all time)" value={String(overview.totalAttendanceRecords)} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Faculty performance snapshot</Text>
        {overview.facultyPerformance.map((f) => (
          <View
            key={f.facultyId}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            }}
          >
            <Text style={{ color: colors.ink.default, fontWeight: "700", flex: 1 }}>{f.facultyName}</Text>
            <Text style={{ color: colors.ink.muted }}>{(f.avgAttendance * 100).toFixed(0)}% avg</Text>
          </View>
        ))}
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsBarChart title="Preview · attendance by faculty (%)" data={previewBars} />
        <View style={{ height: 8 }} />
        <StatsLineChart title="Preview · 8-day attendance index" points={previewTrend} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppButton title="Charts & trends (full simulation)" onPress={() => router.push("/admin/analytics")} />

      <View style={{ height: 18 }} />

      <AppButton title="Simulation & data controls" variant="outline" onPress={() => router.push("/admin/seed")} />
      <View style={{ height: 10 }} />
      <AppButton title="Notifications" variant="outline" onPress={() => router.push("/notifications")} />
      <View style={{ height: 10 }} />
      <AppButton title="Settings" variant="outline" onPress={() => router.push("/settings")} />

      <View style={{ height: 24 }} />

      <Pressable onPress={() => logout().then(() => router.replace("/onboarding"))}>
        <Text style={{ color: colors.palette.primary, fontWeight: "800" }}>Sign out</Text>
      </Pressable>
    </ScreenShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: colors.ink.muted }}>{label}</Text>
      <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}
