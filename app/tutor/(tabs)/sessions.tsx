/*import { useMemo } from "react";
import { useRouter } from "expo-router";

import {
  AppText,
  Chip,
  DelegationBadge,
  ModuleCard,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { mockDB } from "@/mockDB/mockDBService";
import { delegationService } from "@/services/delegationService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function TutorSessionsScreen() {
  useRoleGuard("tutor");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const modules = useMemo(() => {
    if (!user || user.role !== "tutor") return [];
    return user.moduleIds
      .map((id) => mockDB.read("modules", id))
      .filter((m): m is NonNullable<typeof m> => m != null)
      .map((module) => {
        const delegation = mockDB
          .list("moduleDelegations")
          .find((d) => d.moduleId === module.id && d.delegateStudentId === user.studentId && d.active);
        return { module, delegation };
      });
  }, [user, v]);

  return (
    <ScreenShell
      title="Delegated sessions"
      subtitle="Modules where you may start class attendance or assist invigilation"
    >
      <AppText variant="body">
        You are a senior student tutor — sessions you open are logged under your name and appear in the lecturer audit
        trail.
      </AppText>

      <Spacer size="md" />
      <SectionHeader title="Your modules" />

      <Stack gap="md">
        {modules.map(({ module, delegation }) => (
          <Stack key={module.id} gap="sm">
            {delegation ? <DelegationBadge delegateType={delegation.delegateType} /> : null}
            <ModuleCard
              code={module.moduleCode}
              name={module.moduleName}
              meta={module.activeSessionId ? "Live session running" : "No active session"}
              onPress={() => router.push(`/lecturer/create-session/${module.id}` as never)}
            />
            <Stack gap="xs">
              <Chip
                label="Start / open class"
                variant="accent"
                onPress={() => router.push(`/lecturer/create-session/${module.id}` as never)}
              />
              {module.activeSessionId ? (
                <Chip
                  label="Join live session"
                  variant="outline"
                  onPress={() => router.push(`/lecturer/active-session/${module.activeSessionId}` as never)}
                />
              ) : null}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </ScreenShell>
  );
}*/








import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import {
  AppText,
  Chip,
  DelegationBadge,
  ModuleCard,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { mockDB } from "@/mockDB/mockDBService";
import { delegationService, listModulesForTutor } from "@/services/delegationService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { getDataSource } from "@/services/dataSource";
import type { ModuleModel } from "@/models/Module";

export default function TutorSessionsScreen() {
  useRoleGuard("tutor");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  // job 019 fix: delegated modules can live only in Supabase, so this tab
  // needs the same data-source branch already used on the tutor dashboard.
  const [supabaseModules, setSupabaseModules] = useState<ModuleModel[]>([]);

  useEffect(() => {
    async function loadModules() {
      if (!user || user.role !== "tutor") return;
      if (getDataSource() !== "supabase") return;
      try {
        const modules = await listModulesForTutor(user.studentId);
        setSupabaseModules(modules);
      } catch (error) {
        console.error("Failed to load tutor modules:", error);
      }
    }
    loadModules();
  }, [user]);

  const modules = useMemo(() => {
    if (!user || user.role !== "tutor") return [];

    if (getDataSource() === "supabase") {
      // listModulesForTutor already scopes strictly to this tutor's active
      // delegations, so every module here is a delegated module.
      return supabaseModules.map((module) => ({ module, delegation: undefined }));
    }

    return user.moduleIds
      .map((id) => mockDB.read("modules", id))
      .filter((m): m is NonNullable<typeof m> => m != null)
      .map((module) => {
        const delegation = mockDB
          .list("moduleDelegations")
          .find((d) => d.moduleId === module.id && d.delegateStudentId === user.studentId && d.active);
        return { module, delegation };
      });
  }, [user, v, supabaseModules]);

  return (
    <ScreenShell
      title="Delegated sessions"
      subtitle="Modules where you may start class attendance or assist invigilation"
    >
      <AppText variant="body">
        You are a senior student tutor — sessions you open are logged under your name and appear in the lecturer audit
        trail.
      </AppText>

      <Spacer size="md" />
      <SectionHeader title="Your modules" />

      <Stack gap="md">
        {modules.map(({ module, delegation }) => (
          <Stack key={module.id} gap="sm">
            {delegation ? <DelegationBadge delegateType={delegation.delegateType} /> : null}
            <ModuleCard
              code={module.moduleCode}
              name={module.moduleName}
              meta={module.activeSessionId ? "Live session running" : "No active session"}
              onPress={() => router.push(`/lecturer/create-session/${module.id}` as never)}
            />
            <Stack gap="xs">
              <Chip
                label="Start / open class"
                variant="accent"
                onPress={() => router.push(`/lecturer/create-session/${module.id}` as never)}
              />
              {module.activeSessionId ? (
                <Chip
                  label="Join live session"
                  variant="outline"
                  onPress={() => router.push(`/lecturer/active-session/${module.activeSessionId}` as never)}
                />
              ) : null}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </ScreenShell>
  );
}

