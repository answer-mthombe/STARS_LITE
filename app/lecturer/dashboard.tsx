import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { ModuleCard } from "@/components/ui/ModuleCard";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleModel } from "@/models/Module";

export default function LecturerDashboard() {
  useRoleGuard("lecturer");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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
      right={
        <Pressable onPress={() => router.push("/notifications")}>
          <Text style={{ color: colors.palette.accent, fontWeight: "800" }}>Alerts</Text>
        </Pressable>
      }
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <Pressable
          onPress={() => router.push("/lecturer/module-management")}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: colors.palette.primary,
          }}
        >
          <Text style={{ color: colors.ink.inverse, fontWeight: "900", fontSize: 13 }}>Modules</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/lecturer/analytics")}
          style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.palette.accent }}
        >
          <Text style={{ color: colors.palette.accent, fontWeight: "900", fontSize: 13 }}>Analytics</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/settings")}>
          <Text style={{ color: colors.ink.muted, fontWeight: "800", paddingVertical: 10 }}>Settings</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Your modules</Text>
      <View style={{ gap: 12 }}>
        {modules.map((m) => (
          <ModuleCard
            key={m.id}
            code={m.moduleCode}
            name={m.moduleName}
            meta={m.activeSessionId ? "Session running" : "Idle"}
            onPress={() => router.push(`/lecturer/student-management/${m.id}`)}
          />
        ))}
      </View>

      <View style={{ height: 24 }} />
      <Pressable onPress={() => logout().then(() => router.replace("/onboarding"))}>
        <Text style={{ color: colors.palette.primary, fontWeight: "800" }}>Sign out</Text>
      </Pressable>
    </ScreenShell>
  );
}
