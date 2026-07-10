import { useMemo,useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { getDataSource } from "@/services/dataSource";
import { listModulesForLecturer } from "@/services/supabase/moduleRepository";

import {
  AppText,
  Chip,
  LinkText,
  ModuleCard,
  PromoBanner,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleModel } from "@/models/Module";

export default function LecturerDashboard() {
  useRoleGuard("lecturer");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

const [modules, setModules] = useState<ModuleModel[]>([]);
  const [loading, setLoading] = useState(true);
  

// 2. Single useEffect for data fetching
  useEffect(() => {
    async function loadModules() {
      if (!user || user.role !== "lecturer") {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (getDataSource() === "supabase") {
          // Fetch real modules for the lecturer from Supabase
          const data = await listModulesForLecturer(user.id);
          setModules(data);
        } else {
          // Keep existing mock logic for offline/mock development
          mockDB.touch();
          const allModules = mockDB.list("modules");
          const filtered = allModules.filter((m) => m.lecturerId === user.id);
          setModules(filtered);
        }
      } catch (error) {
        console.error("Failed to load lecturer modules:", error);
      } finally {
        setLoading(false);
      }
    }

    loadModules();
  }, [user, v]); // v ensures it updates if the mockDB changes

  const first = user?.role === "lecturer" ? (user.fullName?.trim().split(/\s+/)[0] ?? "Lecturer") : "";
  
  return (
    <ScreenShell
      title="Lecturer"
      subtitle="Modules & sessions"
      right={<LinkText onPress={() => router.push("/notifications")}>Alerts</LinkText>}
    >
      <PromoBanner
        title="Live demo: Quiz 2 invigilation"
        subtitle="Pre-seeded — scan student cards now"
        onPress={() => router.push("/lecturer/test-invigilate/test_demo_active" as never)}
      />
      <PromoBanner
        title="Print-ready: Midterm test register (PDF)"
        tone="neutral"
        onPress={() => router.push("/lecturer/register/reg_test_mobile_midterm?type=test" as never)}
      />

      <SectionHeader title="Your modules" overline />

      {/* <Stack gap="md">
        {modules.map((m) => (
          <Stack key={m.id} gap="sm">
            <ModuleCard
              code={m.moduleCode}
              name={m.moduleName}
              meta={m.activeSessionId ? "Session running" : "Idle"}
              onPress={() => router.push(`/lecturer/student-management/${m.id}`)}
            />
            <Row gap="sm">
              <Chip
                label="Class session"
                variant="accent"
                onPress={() => router.push(`/lecturer/create-session/${m.id}` as never)}
              />
              <Chip
                label="Test / scan"
                variant="outline"
                onPress={() => router.push(`/lecturer/test-session/${m.id}` as never)}
              />
            </Row>
          </Stack>
        ))}
      </Stack> */}
      <Stack gap="md">
        {loading ? (
          <AppText variant="body" style={{ color: "#687076" }}>
            Loading your modules from Supabase...
          </AppText>
        ) : (
          modules.map((m) => (
            <Stack key={m.id} gap="sm">
              <ModuleCard
                code={m.moduleCode}
                name={m.moduleName}
                meta={m.activeSessionId ? "Session running" : "Idle"}
                onPress={() => router.push(`/lecturer/student-management/${m.id}`)}
              />
              <Row gap="sm">
                <Chip
                  label="Class session"
                  variant="accent"
                  onPress={() => router.push(`/lecturer/create-session/${m.id}` as never)}
                />
                <Chip
                  label="Test / scan"
                  variant="outline"
                  onPress={() => router.push(`/lecturer/test-session/${m.id}` as never)}
                />
              </Row>
            </Stack>
          ))
        )}

        {!loading && modules.length === 0 ? (
          <AppText variant="body" style={{ color: "#687076" }}>
            No modules found where you are listed as a primary or co-lecturer.
          </AppText>
        ) : null}
      </Stack>

      <Spacer size="lg" />
      <RoleQuickNav role="lecturer" />
    </ScreenShell>
  );
}
