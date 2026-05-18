import { useMemo } from "react";
import { useRouter } from "expo-router";

import {
  AppText,
  Chip,
  LinkText,
  ModuleCard,
  PromoBanner,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleModel } from "@/models/Module";

export default function LecturerDashboard() {
  useRoleGuard("lecturer");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const modules = useMemo(() => {
    mockDB.touch();
    if (!user || user.role !== "lecturer") return [] as ModuleModel[];
    return mockDB.list("modules").filter((m) => m.lecturerId === user.id);
  }, [user, v]);

  return (
    <ScreenShell
      title="Lecturer"
      subtitle="Modules & sessions"
      right={<LinkText onPress={() => router.push("/notifications")}>Alerts</LinkText>}
    >
      <PromoBanner
        title="Live demo: Quiz 2 invigilation"
        subtitle="Pre-seeded — scan student cards now"
        onPress={() => router.push("/lecturer/test-invigilate/test_demo_active" as never)}
      />
      <PromoBanner
        title="Print-ready: Midterm test register (PDF)"
        tone="neutral"
        onPress={() => router.push("/lecturer/register/reg_test_mobile_midterm?type=test" as never)}
      />

      <SectionHeader title="Your modules" overline />

      <Stack gap="md">
        {modules.map((m) => (
          <Stack key={m.id} gap="sm">
            <ModuleCard
              code={m.moduleCode}
              name={m.moduleName}
              meta={m.activeSessionId ? "Session running" : "Idle"}
              onPress={() => router.push(`/lecturer/student-management/${m.id}`)}
            />
            <Row gap="sm">
              <Chip
                label="Class session"
                variant="accent"
                onPress={() => router.push(`/lecturer/create-session/${m.id}` as never)}
              />
              <Chip
                label="Test / scan"
                variant="outline"
                onPress={() => router.push(`/lecturer/test-session/${m.id}` as never)}
              />
            </Row>
          </Stack>
        ))}
      </Stack>

      <Spacer size="lg" />
      <RoleQuickNav role="lecturer" />
    </ScreenShell>
  );
}
