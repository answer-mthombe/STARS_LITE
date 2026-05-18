import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { ModuleCard } from "@/components/ui/ModuleCard";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleModel } from "@/models/Module";

export default function StudentModuleListScreen() {
  useRoleGuard("student");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const modules = useMemo(() => {
    mockDB.touch();
    if (!user || user.role !== "student") return [] as ModuleModel[];
    const stu = mockDB.read("students", user.id);
    return (stu?.registeredModules ?? [])
      .map((id) => mockDB.read("modules", id))
      .filter((m): m is ModuleModel => m != null);
  }, [user, v]);

  return (
    <ScreenShell title="Modules" subtitle="Enrolled classes" showBack>
      <Text style={{ color: colors.ink.muted, marginBottom: 14 }}>Tap a module for details and attendance.</Text>
      <View style={{ gap: 12 }}>
        {modules.map((m) => (
          <ModuleCard
            key={m.id}
            code={m.moduleCode}
            name={m.moduleName}
            meta={m.activeSessionId ? "Active session" : undefined}
            onPress={() => router.push(`/student/modules/${m.id}`)}
          />
        ))}
      </View>
    </ScreenShell>
  );
}
