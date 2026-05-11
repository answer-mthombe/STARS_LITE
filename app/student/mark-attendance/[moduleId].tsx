import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { SessionTimer } from "@/components/ui/SessionTimer";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { attendanceSimulationService } from "@/services/attendanceSimulationService";
import { captureLocationOnce } from "@/utils/captureLocationOnce";
import { useToastStore } from "@/store/toastStore";

export default function StudentMarkAttendanceScreen() {
  useRoleGuard("student");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const v = useMockDbVersionStore((s) => s.version);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const session = useMemo(() => {
    mockDB.touch();
    const mod = mockDB.read("modules", String(moduleId));
    if (!mod?.activeSessionId) return null;
    return mockDB.read("attendanceSessions", mod.activeSessionId);
  }, [moduleId, v]);

  return (
    <ScreenShell title="Mark attendance" subtitle="One-time GPS + rotating code" showBack>
      {!session ? (
        <Text style={{ color: colors.ink.muted }}>No active session for this module.</Text>
      ) : (
        <>
          <SessionTimer expiresAtIso={session.expiresAt} />
          <Text style={{ color: colors.ink.muted, marginTop: 14, lineHeight: 22 }}>
            Radius: {session.radius}m. Code rotates every 30s — enter what you see on the lecturer screen.
          </Text>
          <View style={{ height: 16 }} />
          <AppInput label="Attendance code" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="6 digits" />
          <View style={{ height: 14 }} />
          <AppButton
            title={busy ? "Verifying…" : "Submit"}
            disabled={busy}
            onPress={async () => {
              if (!user || user.role !== "student") return;
              setBusy(true);
              try {
                const loc = await captureLocationOnce();
                const res = attendanceSimulationService.markAttendance({
                  sessionId: session.id,
                  studentId: user.id,
                  studentLat: loc.latitude,
                  studentLng: loc.longitude,
                  codeEntered: code,
                });
                if (!res.ok) {
                  show({ type: "error", title: "Not recorded", message: res.reason });
                  return;
                }
                show({ type: "success", title: "Attendance recorded" });
                router.replace("/student/attendance-history");
              } catch (e) {
                show({ type: "error", title: "Error", message: e instanceof Error ? e.message : "Try again." });
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </ScreenShell>
  );
}
