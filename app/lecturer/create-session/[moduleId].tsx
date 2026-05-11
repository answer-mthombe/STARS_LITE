import { useMemo, useState } from "react";
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
  useRoleGuard("lecturer");
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
          if (!user || user.role !== "lecturer" || !mod) return;
          setBusy(true);
          try {
            const loc = await captureLocationOnce();
            const session = await attendanceSimulationService.createSession({
              moduleId: mod.id,
              lecturerId: user.id,
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
