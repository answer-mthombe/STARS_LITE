import { useMemo } from "react";
import { useRouter } from "expo-router";

import {
  Chip,
  DelegationBadge,
  ListPressableItem,
  ModuleCard,
  RoleScopeCard,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { mockDB } from "@/mockDB/mockDBService";
import { delegationService } from "@/services/delegationService";
import { testInvigilationService } from "@/services/testInvigilationService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";

export default function TutorDashboard() {
  useRoleGuard("tutor");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const version = useMockDbVersionStore((s) => s.version);

  const modules = useMemo(() => {
    if (!user || user.role !== "tutor") return [];
    mockDB.touch();
    return user.moduleIds
      .map((id) => mockDB.read("modules", id))
      .filter(Boolean)
      .map((m) => {
        const del = delegationService
          .listModuleDelegations(m!.id)
          .find((d) => d.delegateStudentId === user.studentId && d.active);
        return { module: m!, delegation: del };
      });
  }, [user, version]);

  const activeTests = useMemo(() => {
    if (!user || user.role !== "tutor") return [];
    mockDB.touch();
    return testInvigilationService
      .listInvigilationForPerson(user.studentId)
      .filter((t) => t.status === "active" || t.status === "awaiting_lecturer_confirm");
  }, [user, version]);

  if (!user || user.role !== "tutor") return null;

  const tutorProfile = mockDB.query("tutors", { studentId: user.studentId })[0];

  return (
    <ScreenShell
      title="Tutor hub"
      subtitle="Senior student — paid by hours; submit timesheets after class or tests"
    >
      <RoleScopeCard
        role="tutor"
        scopeLabel={user.fullName}
        detail={`Year ${tutorProfile?.yearLevel ?? "—"} · ${(tutorProfile?.totalLoggedHours ?? 0).toFixed(1)}h logged`}
      />

      {activeTests.length > 0 ? (
        <Stack gap="sm" style={{ marginTop: 16 }}>
          <SectionHeader title="Test invigilation" />
          {activeTests.map((t) => (
            <ListPressableItem
              key={t.id}
              title={t.title}
              subtitle={`${t.moduleCode} · ${t.status}`}
              onPress={() => router.push(`/tutor/test-invigilate/${t.id}` as never)}
            />
          ))}
        </Stack>
      ) : null}

      <Spacer size="lg" />
      <SectionHeader title="Delegated modules" />

      <Stack gap="md">
        {modules.map(({ module, delegation }) => (
          <Stack key={module.id} gap="sm">
            {delegation ? <DelegationBadge delegateType={delegation.delegateType} /> : null}
            <ModuleCard
              code={module.moduleCode}
              name={module.moduleName}
              meta={module.classCode}
              onPress={() => router.push(`/lecturer/create-session/${module.id}` as never)}
            />
            {module.activeSessionId ? (
              <Chip
                label="Open live session"
                variant="accent"
                onPress={() => router.push(`/lecturer/active-session/${module.activeSessionId}` as never)}
              />
            ) : null}
          </Stack>
        ))}
      </Stack>

      <Spacer size="lg" />
      <RoleQuickNav role="tutor" />
    </ScreenShell>
  );
}
