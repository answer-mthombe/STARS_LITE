/*import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { attendanceSimulationService } from "@/services/attendanceSimulationService";
import { captureLocationOnce } from "@/utils/captureLocationOnce";
import { useToastStore } from "@/store/toastStore";


export default function LecturerCreateSessionScreen() {
  useRoleGuard([
    "lecturer",
    "tutor",
    
  ]);

  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const [busy, setBusy] = useState(false);

  const mod = useMemo(() => mockDB.read("modules", String(moduleId)), [moduleId]);

  return (
    <ScreenShell title="Start session" subtitle={mod?.moduleName ?? "Module"} showBack>
      <Text style={{ color: colors.ink.muted, lineHeight: 22, marginBottom: 16 }}>
        Location is captured once as the class pin. Students must be within radius and enter the rotating code.
      </Text>
      <AppButton
        title={busy ? "Starting…" : "Capture GPS & start session"}
        disabled={busy || !mod}
        onPress={async () => {
          if (!user || !mod) return;
          if (user.role !== "lecturer" && user.role !== "tutor") return;
          setBusy(true);
          try {
            const loc = await captureLocationOnce();
            const hostRole = user.role === "tutor" ? "tutor" : "lecturer";
            const hostId = user.role === "tutor" ? user.studentId : user.id;
            const session = await attendanceSimulationService.createSession({
              moduleId: mod.id,
              hostRole,
              hostId,
              lecturerId: mod.lecturerId,
              latitude: loc.latitude,
              longitude: loc.longitude,
              radiusMeters: 50,
              durationMinutes: 25,
            });
            show({ type: "success", title: "Session live" });
            router.replace(`/lecturer/active-session/${session.id}`);
          } catch (e) {
            show({ type: "error", title: "Could not start", message: e instanceof Error ? e.message : "Try again." });
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScreenShell>
  );
}*/











import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { attendanceSimulationService } from "@/services/attendanceSimulationService";
import { captureLocationOnce } from "@/utils/captureLocationOnce";
import { useToastStore } from "@/store/toastStore";
// job 019 fix: module lookup needs to go through a service, not mockDB directly
import { getDataSource } from "@/services/dataSource";
import { getModuleById } from "@/services/supabase/moduleRepository";
import type { ModuleModel } from "@/models/Module";


export default function LecturerCreateSessionScreen() {
  useRoleGuard([
    "lecturer",
    "tutor",
    
  ]);

  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const [busy, setBusy] = useState(false);

  // job 019 fix: a tutor's delegated module may only exist in Supabase, so
  // this can no longer be a synchronous mockDB.read — fetch via the
  // data-source-aware service instead, keeping the mock path unchanged.
  const [mod, setMod] = useState<ModuleModel | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadModule() {
      if (getDataSource() === "supabase") {
        try {
          const m = await getModuleById(String(moduleId));
          if (!cancelled) setMod(m);
        } catch (e) {
          console.error("Failed to load module:", e);
          if (!cancelled) setMod(null);
        }
        return;
      }
      if (!cancelled) setMod(mockDB.read("modules", String(moduleId)) ?? null);
    }

    loadModule();
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  return (
    <ScreenShell title="Start session" subtitle={mod?.moduleName ?? "Module"} showBack>
      <Text style={{ color: colors.ink.muted, lineHeight: 22, marginBottom: 16 }}>
        Location is captured once as the class pin. Students must be within radius and enter the rotating code.
      </Text>
      <AppButton
        title={busy ? "Starting…" : "Capture GPS & start session"}
        disabled={busy || !mod}
        onPress={async () => {
          if (!user || !mod) return;
          if (user.role !== "lecturer" && user.role !== "tutor") return;
          setBusy(true);
          try {
            const loc = await captureLocationOnce();
            const hostRole = user.role === "tutor" ? "tutor" : "lecturer";
            const hostId = user.role === "tutor" ? user.studentId : user.id;
            const session = await attendanceSimulationService.createSession({
              moduleId: mod.id,
              hostRole,
              hostId,
              lecturerId: mod.lecturerId,
              latitude: loc.latitude,
              longitude: loc.longitude,
              radiusMeters: 50,
              durationMinutes: 25,
            });
            show({ type: "success", title: "Session live" });
            router.replace(`/lecturer/active-session/${session.id}`);
          } catch (e) {
            show({ type: "error", title: "Could not start", message: e instanceof Error ? e.message : "Try again." });
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScreenShell>
  );
}
