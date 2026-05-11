import { useMemo } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function StudentModuleDetailsScreen() {
  useRoleGuard("student");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const mod = useMemo(() => {
    mockDB.touch();
    return mockDB.read("modules", String(moduleId));
  }, [moduleId, v]);

  const enrolled = user?.role === "student" && mod?.enrolledStudents.includes(user.id);

  return (
    <ScreenShell title={mod?.moduleName ?? "Module"} subtitle={mod?.moduleCode} showBack>
      {!mod ? (
        <Text style={{ color: colors.ink.muted }}>Module not found.</Text>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <Badge label={`Class ${mod.classCode}`} tone="accent" />
            {mod.activeSessionId ? <Badge label="Live session" tone="primary" /> : <Badge label="No session" tone="muted" />}
          </View>

          <AppCard>
            <Text style={{ color: colors.ink.muted, lineHeight: 22 }}>
              When your lecturer starts attendance, a rotating code appears. You verify once with GPS — no continuous
              tracking.
            </Text>
          </AppCard>

          <View style={{ height: 14 }} />

          {enrolled ? (
            <AppButton
              title={mod.activeSessionId ? "Mark attendance" : "No active session"}
              disabled={!mod.activeSessionId}
              onPress={() => mod.activeSessionId && router.push(`/student/mark-attendance/${mod.id}`)}
            />
          ) : (
            <Text style={{ color: colors.palette.primary, fontWeight: "800" }}>You are not enrolled in this module.</Text>
          )}

          <View style={{ height: 10 }} />
          <AppButton title="Request join (demo)" variant="outline" onPress={() => router.push("/student/join-class")} />
        </>
      )}
    </ScreenShell>
  );
}
