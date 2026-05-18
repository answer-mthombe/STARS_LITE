import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { testInvigilationService } from "@/services/testInvigilationService";
import { useToastStore } from "@/store/toastStore";
import { colors } from "@/theme";

export default function StartTestSessionScreen() {
  useRoleGuard("lecturer");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const [title, setTitle] = useState("Test 1");
  const [selectedTutors, setSelectedTutors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const mod = useMemo(() => mockDB.read("modules", String(moduleId)), [moduleId]);

  const tutorCandidates = useMemo(() => {
    return mockDB.list("tutors").map((t) => ({
      studentId: t.studentId,
      name: t.fullName,
    }));
  }, []);

  return (
    <ScreenShell title="Start test / exam" subtitle={mod?.moduleName} showBack>
      <Text style={{ color: colors.ink.muted, marginBottom: 12, lineHeight: 22 }}>
        Scan student cards or enter numbers. Add tutors to invigilate — any module, not only their tutor modules.
        Two invigilators can scan left/right on one shared register with no duplicates.
      </Text>
      <AppInput label="Test title" value={title} onChangeText={setTitle} />
      <Text style={{ color: colors.palette.primary, fontWeight: "800", marginTop: 16, marginBottom: 8 }}>
        Add tutor invigilators (optional)
      </Text>
      {tutorCandidates.map((t) => {
        const on = selectedTutors.includes(t.studentId);
        return (
          <Pressable
            key={t.studentId}
            onPress={() =>
              setSelectedTutors((prev) =>
                on ? prev.filter((id) => id !== t.studentId) : [...prev, t.studentId]
              )
            }
            style={{
              padding: 12,
              marginBottom: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: on ? colors.palette.accent : colors.border.subtle,
              backgroundColor: on ? "rgba(0,98,129,0.08)" : colors.surface.base,
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.ink.default }}>{t.name}</Text>
          </Pressable>
        );
      })}
      <View style={{ height: 16 }} />
      <AppButton
        title={busy ? "Starting…" : "Start test session"}
        disabled={busy || !mod}
        onPress={() => {
          if (!user || user.role !== "lecturer" || !mod) return;
          setBusy(true);
          try {
            const tutors = selectedTutors.map((sid, idx) => {
              const t = mockDB.query("tutors", { studentId: sid })[0];
              return {
                studentId: sid,
                fullName: t?.fullName ?? sid,
                canScan: true,
                scanSide: (idx % 2 === 0 ? "left" : "right") as "left" | "right",
              };
            });
            const sess = testInvigilationService.startTest({
              moduleId: mod.id,
              lecturerId: user.id,
              title,
              tutorInvigilators: tutors,
            });
            show({ type: "success", title: "Test session live" });
            router.replace(`/lecturer/test-invigilate/${sess.id}` as never);
          } catch (e) {
            show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "" });
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScreenShell>
  );
}
