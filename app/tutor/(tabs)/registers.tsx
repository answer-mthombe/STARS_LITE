import { useMemo } from "react";
import { useRouter } from "expo-router";

import { AppText, ListPressableItem, ScreenShell, SectionHeader, Spacer, Stack } from "@/components/ui";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { classRegisterService } from "@/services/classRegisterService";
import { testInvigilationService } from "@/services/testInvigilationService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function TutorRegistersScreen() {
  useRoleGuard("tutor");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const { classRegs, testRegs } = useMemo(() => {
    if (!user || user.role !== "tutor") return { classRegs: [], testRegs: [] };
    return {
      classRegs: classRegisterService.listForTutor(user.studentId),
      testRegs: testInvigilationService.listRegistersVisibleToTutor(user.studentId),
    };
  }, [user, v]);

  if (!user || user.role !== "tutor") return null;

  return (
    <ScreenShell
      title="Registers & PDFs"
      subtitle={`${classRegs.length} class · ${testRegs.length} test — tap to print or share`}
    >
      <AppText variant="body">
        PDF registers appear after the lecturer ends a class or confirms a test. Use these for payroll evidence and
        faculty records.
      </AppText>
      <Spacer size="md" />
      <SectionHeader title="Class registers" />
      {classRegs.length === 0 ? (
        <AppText variant="body" style={{ marginBottom: 16 }}>
          No class registers yet.
        </AppText>
      ) : (
        <Stack gap="sm" style={{ marginBottom: 16 }}>
          {classRegs.map((r) => (
            <ListPressableItem
              key={r.id}
              title={r.moduleCode}
              subtitle={`Tutors: ${r.tutorNames.join(", ") || "—"} · ${r.durationMinutes} min`}
              onPress={() => router.push(`/lecturer/register/${r.id}` as never)}
            />
          ))}
        </Stack>
      )}

      <SectionHeader title="Test registers (after lecturer confirms)" />
      {testRegs.length === 0 ? (
        <AppText variant="body">No test registers yet.</AppText>
      ) : (
        <Stack gap="sm">
          {testRegs.map((r) => (
            <ListPressableItem
              key={r.id}
              title={r.title}
              subtitle="PDF ready to print"
              onPress={() => router.push(`/lecturer/register/${r.id}?type=test` as never)}
            />
          ))}
        </Stack>
      )}
    </ScreenShell>
  );
}
