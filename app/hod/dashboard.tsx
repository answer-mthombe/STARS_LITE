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
import { hodModuleBars, hodRiskTrend } from "@/services/dashboardChartDummy";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function HodDashboardScreen() {
  useRoleGuard("hod");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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
      <Text style={{ color: colors.ink.muted, marginBottom: 14, lineHeight: 22 }}>
        Head of Department view — courses, modules, lecturers, and student attendance risk within your department only.
      </Text>

      <View style={{ padding: 16, borderRadius: 14, backgroundColor: "rgba(0,98,129,0.10)", marginBottom: 14 }}>
        <Text style={{ color: colors.ink.muted, fontSize: 12 }}>Department attendance rate</Text>
        <Text style={{ color: colors.palette.accent, fontSize: 28, fontWeight: "900" }}>
          {(overview.attendanceRate * 100).toFixed(1)}%
        </Text>
        <Text style={{ color: colors.ink.muted, marginTop: 6 }}>
          Students tracked: {overview.studentInsights.total} · At-risk (&lt;55%): {overview.studentInsights.atRiskCount}
        </Text>
      </View>

      <AppCard>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Modules</Text>
        {overview.moduleStats.map((m) => (
          <View
            key={m.moduleId}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            }}
          >
            <Text style={{ color: colors.ink.default, fontWeight: "700" }}>
              {m.code} — {m.name}
            </Text>
            <Text style={{ color: colors.ink.muted }}>{m.enrolled} enrolled</Text>
          </View>
        ))}
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Lecturers</Text>
        {overview.lecturerPerformance.map((l) => (
          <View key={l.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
            <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{l.name}</Text>
            <Text style={{ color: colors.ink.muted }}>{l.modules} module(s)</Text>
          </View>
        ))}
      </AppCard>

      {overview.riskAlerts.length > 0 ? (
        <>
          <View style={{ height: 14 }} />
          <AppCard>
            <Text style={{ color: colors.palette.primary, fontWeight: "900", marginBottom: 8 }}>Attendance risk alerts</Text>
            {overview.riskAlerts.map((r) => (
              <Text key={r.studentId} style={{ color: colors.ink.muted, marginBottom: 4 }}>
                {r.name} — {(r.rate * 100).toFixed(0)}%
              </Text>
            ))}
          </AppCard>
        </>
      ) : null}

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsBarChart title="Preview · modules (proxy %)" data={previewModBars} />
        <View style={{ height: 8 }} />
        <StatsLineChart title="Preview · risk trajectory (dummy)" points={previewRisk} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppButton title="Department charts (full simulation)" onPress={() => router.push("/hod/analytics")} />

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
