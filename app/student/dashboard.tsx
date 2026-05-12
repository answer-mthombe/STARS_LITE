import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { ModuleCard } from "@/components/ui/ModuleCard";
import { Avatar } from "@/components/ui/Avatar";
import { StarsWordmark } from "@/components/ui/StarsWordmark";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleModel } from "@/models/Module";

export default function StudentDashboard() {
  useRoleGuard("student");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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
  const first = user?.role === "student" ? user.fullName.split(" ")[0] : "";

  return (
    <ScreenShell scroll hideHeader>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <StarsWordmark />
          <Text style={{ color: colors.ink.muted, fontSize: 12, fontWeight: "600", marginTop: 6, letterSpacing: 0.5 }}>
            Student home
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.push("/notifications")} hitSlop={8}>
            <Text style={{ color: colors.palette.accent, fontWeight: "800", fontSize: 13 }}>Alerts</Text>
          </Pressable>
          {user && user.role === "student" ? <Avatar name={user.fullName} size={40} /> : null}
        </View>
      </View>

      {user && user.role === "student" ? (
        <Text style={{ color: colors.ink.default, fontSize: 26, fontWeight: "900", marginBottom: 4, letterSpacing: -0.5 }}>
          Hello, {first}
        </Text>
      ) : null}
      <Text style={{ color: colors.ink.muted, marginBottom: 22, fontSize: 15, lineHeight: 22 }}>
        Start with your classes — tap Attend when a session is live, then scan the QR or enter the code.
      </Text>

      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 12, fontSize: 13, letterSpacing: 0.8 }}>
        MY CLASSES
      </Text>
      <View style={{ gap: 12, marginBottom: 22 }}>
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
        {data.modules.length === 0 ? (
          <Text style={{ color: colors.ink.muted, lineHeight: 22 }}>No modules yet. Use Join class with your code.</Text>
        ) : null}
      </View>

      <AppCard>
        <Text style={{ color: colors.palette.accent, fontWeight: "900", fontSize: 12, letterSpacing: 1 }}>ATTENDANCE</Text>
        <Text style={{ color: colors.ink.default, fontSize: 40, fontWeight: "900", marginTop: 4, letterSpacing: -1 }}>
          {ratePct}%
        </Text>
        <Text style={{ color: colors.ink.muted, marginTop: 6, fontSize: 13 }}>Simulated aggregate across sessions</Text>
      </AppCard>

      <View style={{ height: 20 }} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Link href="/student/join-class" asChild>
          <Pressable
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: colors.palette.primary,
            }}
          >
            <Text style={{ color: colors.ink.inverse, fontWeight: "900", fontSize: 13 }}>Join class</Text>
          </Pressable>
        </Link>
        <Link href="/student/modules" asChild>
          <Pressable
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.palette.accent,
              backgroundColor: colors.surface.base,
            }}
          >
            <Text style={{ color: colors.palette.accent, fontWeight: "900", fontSize: 13 }}>Modules</Text>
          </Pressable>
        </Link>
        <Link href="/student/attendance-history" asChild>
          <Pressable
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              backgroundColor: colors.surface.base,
            }}
          >
            <Text style={{ color: colors.ink.default, fontWeight: "800", fontSize: 13 }}>History</Text>
          </Pressable>
        </Link>
        <Link href="/student/profile" asChild>
          <Pressable style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
            <Text style={{ color: colors.palette.accent, fontWeight: "800", fontSize: 13 }}>Profile</Text>
          </Pressable>
        </Link>
        <Pressable onPress={() => router.push("/settings")} style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
          <Text style={{ color: colors.ink.muted, fontWeight: "700", fontSize: 13 }}>Settings</Text>
        </Pressable>
      </View>

      <View style={{ height: 32 }} />
      <Pressable onPress={() => logout().then(() => router.replace("/onboarding"))}>
        <Text style={{ color: colors.palette.primary, fontWeight: "800" }}>Sign out</Text>
      </Pressable>
    </ScreenShell>
  );
}
