import { useMemo } from "react";
import { useRouter } from "expo-router";

import {
  AppButton,
  AppCard,
  AppText,
  KeyValueRow,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
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
      <AppText variant="body" style={{ marginBottom: 16 }}>
        Supabase-ready mock database for STARS. Inspect counts and reset seed data during demos.
      </AppText>

      <AppCard>
        <SectionHeader title="Collection counts" />
        {Object.entries(stats).map(([k, n]) => (
          <KeyValueRow key={k} label={k} value={String(n)} bordered />
        ))}
      </AppCard>

      <Spacer size="lg" />

      <Stack gap="sm">
        <AppButton
          title="Open sample class PDF (Mobile Dev)"
          variant="outline"
          onPress={() => router.push("/lecturer/register/reg_class_mobile" as never)}
        />
        <AppButton
          title="Open sample test PDF (Midterm)"
          variant="outline"
          onPress={() => router.push("/lecturer/register/reg_test_mobile_midterm?type=test" as never)}
        />
        <AppButton
          title="Open live test invigilation (demo)"
          variant="outline"
          onPress={() => router.push("/lecturer/test-invigilate/test_demo_active" as never)}
        />
        <AppButton title="Back to university dashboard" variant="outline" onPress={() => router.push("/admin/dashboard")} />
        <AppButton
          title="Re-seed mock database"
          onPress={() => {
            mockDB.seedInitialData();
            useMockDbVersionStore.getState().bump();
          }}
        />
        <AppButton title="Open notifications (shared)" variant="outline" onPress={() => router.push("/notifications")} />
      </Stack>
    </ScreenShell>
  );
}
