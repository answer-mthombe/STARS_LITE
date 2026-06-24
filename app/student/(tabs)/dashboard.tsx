import { useMemo } from "react";
import { useRouter } from "expo-router";

import {
  AppCard,
  AppText,
  Avatar,
  LinkText,
  ModuleCard,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
  StarsWordmark,
} from "@/components/ui";
import { LogoutButton } from "@/components/navigation/LogoutButton";
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleModel } from "@/models/Module";

export default function StudentDashboard() {
  useRoleGuard("student");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const data = useMemo(() => {
    mockDB.touch();
    if (!user || user.role !== "student") return { student: null, modules: [] as ModuleModel[] };
    const student = mockDB.read("students", user.id);
    const modules: ModuleModel[] = (student?.registeredModules ?? [])
      .map((id) => mockDB.read("modules", id))
      .filter((m): m is ModuleModel => m != null);
    return { student, modules };
  }, [user, v]);

  const ratePct = data.student ? Math.round((data.student.attendanceStats.attendanceRate ?? 0) * 100) : 0;
  const first = user?.role === "student" ? (user.fullName?.trim().split(/\s+/)[0] ?? "Student") : "";

  return (
    <ScreenShell scroll hideHeader>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <Stack gap="xs" style={{ flex: 1, paddingRight: 12 }}>
          <StarsWordmark />
          <AppText variant="caption" style={{ letterSpacing: 0.5 }}>
            Student home
          </AppText>
        </Stack>
        <Row gap="sm">
          <LinkText onPress={() => router.push("/notifications")}>Alerts</LinkText>
          <LogoutButton compact />
          {user && user.role === "student" ? <Avatar name={user.fullName} size={40} /> : null}
        </Row>
      </Row>

      {user && user.role === "student" ? (
        <AppText variant="display" color="#0B0F14" style={{ fontSize: 26, marginBottom: 4 }}>
          Hello, {first}
        </AppText>
      ) : null}
      <AppText variant="body" style={{ marginBottom: 22 }}>
        Start with your classes — tap Attend when a session is live, then scan the QR or enter the code.
      </AppText>

      <SectionHeader title="My classes" overline />

      <Stack gap="md" style={{ marginBottom: 22 }}>
        {data.modules.map((m) => (
          <ModuleCard
            key={m.id}
            code={m.moduleCode}
            name={m.moduleName}
            meta={m.activeSessionId ? "Session active — scan lecturer QR or enter rotating code" : "No active session"}
            onPress={() => router.push(`/student/modules/${m.id}`)}
            actionLabel={m.activeSessionId ? "Attend now" : undefined}
            onActionPress={m.activeSessionId ? () => router.push(`/student/mark-attendance/${m.id}`) : undefined}
          />
        ))}
        {data.modules.length === 0 ? <AppText variant="body">No modules yet. Use Join class with your code.</AppText> : null}
      </Stack>

      <AppCard>
        <AppText variant="overline">Attendance</AppText>
        <AppText variant="metric">{ratePct}%</AppText>
        <AppText variant="caption" style={{ marginTop: 6 }}>
          Simulated aggregate across sessions
        </AppText>
      </AppCard>

      <Spacer size="lg" />
      <RoleQuickNav role="student" />
    </ScreenShell>
  );
}
