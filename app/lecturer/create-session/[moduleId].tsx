import { useEffect, useMemo, useState } from "react";
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
import { isSupabaseEnabled, requireSupabaseClient } from "@/supabase";
import { TABLES } from "@/supabase";

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

  //const mod = useMemo(() => mockDB.read("modules", String(moduleId)), [moduleId]);
  const [mod, setMod] = useState<any>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    async function loadModule() {
      try {
        if (isSupabaseEnabled()) {
          const supabase = requireSupabaseClient();
          const { data, error } = await supabase
            .from(TABLES.modules)
            .select("*")
            .eq("id", moduleId)
            .single();

          if (error) throw error;
          
          // Convert database snake_case to UI camelCase
          setMod({
            id: data.id,
            moduleName: data.module_name,
            lecturerId: data.lecturer_id,
            coLecturerIds: data.co_lecturer_ids || [],
          });
        } else {
          setMod(mockDB.read("modules", String(moduleId)));
        }
      } catch (err) {
        console.error("Failed to load module:", err);
        show({ type: "error", title: "Error", message: "Failed to load module details." });
      } finally {
        setLoading(false);
      }
    }
    loadModule();
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
