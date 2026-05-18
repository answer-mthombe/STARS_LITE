import { useMemo } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { classRegisterService } from "@/services/classRegisterService";
import { testInvigilationService } from "@/services/testInvigilationService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { colors } from "@/theme";

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
      showBack
      subtitle={`${classRegs.length} class · ${testRegs.length} test — tap to print or share`}
    >
      <Text style={{ fontWeight: "800", color: colors.palette.primary, marginBottom: 10 }}>Class registers</Text>
      {classRegs.length === 0 ? (
        <Text style={{ color: colors.ink.muted, marginBottom: 16 }}>No class registers yet.</Text>
      ) : (
        classRegs.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => router.push(`/lecturer/register/${r.id}` as never)}
            style={{ padding: 14, marginBottom: 8, borderRadius: 12, backgroundColor: colors.surface.base, borderWidth: 1, borderColor: colors.border.subtle }}
          >
            <Text style={{ fontWeight: "700" }}>{r.moduleCode}</Text>
            <Text style={{ color: colors.ink.muted, fontSize: 12 }}>
              Tutors: {r.tutorNames.join(", ") || "—"} · {r.durationMinutes} min
            </Text>
          </Pressable>
        ))
      )}
      <Text style={{ fontWeight: "800", color: colors.palette.primary, marginTop: 16, marginBottom: 10 }}>
        Test registers (after lecturer confirms)
      </Text>
      {testRegs.length === 0 ? (
        <Text style={{ color: colors.ink.muted }}>No test registers yet.</Text>
      ) : (
        testRegs.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => router.push(`/lecturer/register/${r.id}?type=test` as never)}
            style={{ padding: 14, marginBottom: 8, borderRadius: 12, backgroundColor: colors.surface.base, borderWidth: 1, borderColor: colors.border.subtle }}
          >
            <Text style={{ fontWeight: "700" }}>{r.title}</Text>
            <Text style={{ color: colors.ink.muted, fontSize: 12 }}>PDF ready to print</Text>
          </Pressable>
        ))
      )}
    </ScreenShell>
  );
}
