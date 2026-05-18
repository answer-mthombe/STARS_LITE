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

      <Pressable
        onPress={() => router.push("/lecturer/test-invigilate/test_demo_active" as never)}
        style={{
          padding: 14,
          marginBottom: 16,
          borderRadius: 12,
          backgroundColor: "rgba(0,98,129,0.12)",
          borderWidth: 1,
          borderColor: colors.palette.accent,
        }}
      >
        <Text style={{ fontWeight: "800", color: colors.palette.accent }}>Live demo: Quiz 2 invigilation</Text>
        <Text style={{ color: colors.ink.muted, fontSize: 12, marginTop: 4 }}>Pre-seeded — scan student cards now</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push("/lecturer/register/reg_test_mobile_midterm?type=test" as never)}
        style={{ padding: 12, marginBottom: 16, borderRadius: 10, backgroundColor: colors.surface.base, borderWidth: 1, borderColor: colors.border.subtle }}
      >
        <Text style={{ fontWeight: "700" }}>Print-ready: Midterm test register (PDF)</Text>
      </Pressable>
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 10 }}>Your modules</Text>
      <View style={{ gap: 12 }}>
        {modules.map((m) => (
          <View key={m.id} style={{ gap: 8 }}>
            <ModuleCard
              code={m.moduleCode}
              name={m.moduleName}
              meta={m.activeSessionId ? "Session running" : "Idle"}
              onPress={() => router.push(`/lecturer/student-management/${m.id}`)}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => router.push(`/lecturer/create-session/${m.id}` as never)}
                style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.palette.accent }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center", fontSize: 12 }}>Class session</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/lecturer/test-session/${m.id}` as never)}
                style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.palette.primary }}
              >
                <Text style={{ color: colors.palette.primary, fontWeight: "800", textAlign: "center", fontSize: 12 }}>Test / scan</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
      <Pressable onPress={() => logout().then(() => router.replace("/onboarding"))}>
        <Text style={{ color: colors.palette.primary, fontWeight: "800" }}>Sign out</Text>
      </Pressable>
    </ScreenShell>
  );
}
