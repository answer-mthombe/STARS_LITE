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
import { deanDepartmentBars, deanWeeklyTrend } from "@/services/dashboardChartDummy";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function DeanDashboardScreen() {
  useRoleGuard("dean");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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
      <Text style={{ color: colors.ink.muted, marginBottom: 14, lineHeight: 22 }}>
        Analytics scoped to your faculty only — departments, lecturers, and attendance trends under your portfolio.
      </Text>

      <View style={{ padding: 16, borderRadius: 14, backgroundColor: "rgba(79,26,29,0.08)", marginBottom: 14 }}>
        <Text style={{ color: colors.ink.muted, fontSize: 12 }}>Faculty attendance index</Text>
        <Text style={{ color: colors.palette.primary, fontSize: 28, fontWeight: "900" }}>
          {overview.facultyAttendancePct.toFixed(1)}%
        </Text>
        <Text style={{ color: colors.ink.muted, marginTop: 6 }}>Active sessions right now: {overview.activeSessions}</Text>
      </View>

      <AppCard>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Departments</Text>
        {overview.departmentStats.map((d) => (
          <View
            key={d.departmentId}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            }}
          >
            <Text style={{ color: colors.ink.default, fontWeight: "700" }}>{d.name}</Text>
            <Text style={{ color: colors.ink.muted }}>
              {(d.avgAttendance * 100).toFixed(0)}% · {d.studentCount} students
            </Text>
          </View>
        ))}
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Lecturer performance</Text>
        {overview.lecturerPerformance.map((l) => (
          <View key={l.lecturerId} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
            <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{l.name}</Text>
            <Text style={{ color: colors.ink.muted, fontSize: 13 }}>
              Modules: {l.modulesTaught} · Marks recorded: {l.marksRecorded}
            </Text>
          </View>
        ))}
      </AppCard>

      {overview.lowPerformingDepartments.length > 0 ? (
        <>
          <View style={{ height: 14 }} />
          <AppCard>
            <Text style={{ color: colors.palette.primary, fontWeight: "900", marginBottom: 8 }}>Low-performing departments</Text>
            {overview.lowPerformingDepartments.map((d) => (
              <Text key={d.departmentId} style={{ color: colors.ink.muted, marginBottom: 4 }}>
                {d.name} — {(d.avgAttendance * 100).toFixed(0)}%
              </Text>
            ))}
          </AppCard>
        </>
      ) : null}

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsBarChart title="Preview · departments (%)" data={previewDeptBars} />
        <View style={{ height: 8 }} />
        <StatsLineChart title="Preview · faculty trend" points={previewTrend} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppButton title="Faculty charts (full simulation)" onPress={() => router.push("/dean/analytics")} />

      <View style={{ height: 18 }} />

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
