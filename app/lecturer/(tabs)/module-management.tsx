import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { ModuleCard } from "@/components/ui/ModuleCard";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { useMemo } from "react";
import type { ModuleModel } from "@/models/Module";

export default function LecturerModuleManagementScreen() {
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
    <ScreenShell title="Module management" showBack>
      <Text style={{ color: colors.ink.muted, marginBottom: 14 }}>Start sessions, manage students, review analytics.</Text>
      <View style={{ gap: 12, paddingBottom: 96 }}>
        {modules.map((m) => (
          <ModuleCard
            key={m.id}
            code={m.moduleCode}
            name={m.moduleName}
            meta={`Class code: ${m.classCode}`}
            onPress={() => router.push(`/lecturer/student-management/${m.id}`)}
          />
        ))}
      </View>

      {modules[0] ? (
        <FloatingActionButton label="Quick session" onPress={() => router.push(`/lecturer/create-session/${modules[0].id}`)} />
      ) : null}
    </ScreenShell>
  );
}
