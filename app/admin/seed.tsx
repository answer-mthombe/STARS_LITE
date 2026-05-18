import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function AdminSeedScreen() {
  useRoleGuard("admin");
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const v = useMockDbVersionStore((s) => s.version);

  const stats = useMemo(() => {
    mockDB.touch();
    return {
      faculties: mockDB.list("faculties").length,
      departments: mockDB.list("departments").length,
      deans: mockDB.list("deans").length,
      hods: mockDB.list("hods").length,
      courses: mockDB.list("courses").length,
      modules: mockDB.list("modules").length,
      lecturers: mockDB.list("lecturers").length,
      students: mockDB.list("students").length,
      sessions: mockDB.list("attendanceSessions").length,
      records: mockDB.list("attendanceRecords").length,
      tutors: mockDB.list("tutors").length,
      classRegisters: mockDB.list("classRegisters").length,
      testSessions: mockDB.list("testSessions").length,
      testMarks: mockDB.list("testMarks").length,
      testRegisters: mockDB.list("testRegisters").length,
      timesheets: mockDB.list("tutorTimesheets").length,
    };
  }, [v]);

  return (
    <ScreenShell title="STARS Admin" subtitle="Simulation & data controls" scroll>
      <Text style={{ color: colors.ink.muted, marginBottom: 16, lineHeight: 22 }}>
        Firebase-ready mock database for STARS. Inspect counts and reset seed data during demos.
      </Text>

      <AppCard>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Collection counts</Text>
        {Object.entries(stats).map(([k, n]) => (
          <View
            key={k}
            style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}
          >
            <Text style={{ color: colors.ink.muted, textTransform: "capitalize" }}>{k}</Text>
            <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{n}</Text>
          </View>
        ))}
      </AppCard>

      <View style={{ height: 16 }} />

      <AppButton
        title="Open sample class PDF (Mobile Dev)"
        variant="outline"
        onPress={() => router.push("/lecturer/register/reg_class_mobile" as never)}
      />
      <View style={{ height: 10 }} />
      <AppButton
        title="Open sample test PDF (Midterm)"
        variant="outline"
        onPress={() => router.push("/lecturer/register/reg_test_mobile_midterm?type=test" as never)}
      />
      <View style={{ height: 10 }} />
      <AppButton
        title="Open live test invigilation (demo)"
        variant="outline"
        onPress={() => router.push("/lecturer/test-invigilate/test_demo_active" as never)}
      />
      <View style={{ height: 16 }} />
      <AppButton title="Back to university dashboard" variant="outline" onPress={() => router.push("/admin/dashboard")} />

      <View style={{ height: 12 }} />

      <AppButton
        title="Re-seed mock database"
        onPress={() => {
          mockDB.seedInitialData();
          useMockDbVersionStore.getState().bump();
        }}
      />

      <View style={{ height: 12 }} />

      <AppButton title="Open notifications (shared)" variant="outline" onPress={() => router.push("/notifications")} />
      <View style={{ height: 10 }} />
      <AppButton title="Settings" variant="outline" onPress={() => router.push("/settings")} />

      <View style={{ height: 24 }} />

      <Pressable onPress={() => logout().then(() => router.replace("/onboarding"))}>
        <Text style={{ color: colors.palette.primary, fontWeight: "800" }}>Sign out</Text>
      </Pressable>
    </ScreenShell>
  );
}
