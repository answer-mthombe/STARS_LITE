import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { LiveSessionQr } from "@/components/attendance/LiveSessionQr";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { SessionTimer } from "@/components/ui/SessionTimer";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { ATTENDANCE_CODE_WINDOW_MS, currentAttendanceCode } from "@/utils/rotatingCode";
import { buildAttendanceQrPayload } from "@/utils/attendanceQr";

export default function LecturerActiveSessionScreen() {
  useRoleGuard("lecturer");
  const { sessionId } = useLocalSearchParams() as { sessionId: string };
  const router = useRouter();
  const v = useMockDbVersionStore((s) => s.version);
  const [tick, setTick] = useState(0);

  const session = useMemo(() => {
    mockDB.touch();
    return mockDB.read("attendanceSessions", String(sessionId));
  }, [sessionId, v, tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const rot = session ? currentAttendanceCode(session.algorithmSeed) : null;
  const code = rot?.code ?? "------";
  const qrPayload = session && rot ? buildAttendanceQrPayload(session.id, session.algorithmSeed) : "";
  const secsToRefresh = rot ? Math.max(0, Math.ceil((rot.nextChangeAt - Date.now()) / 1000)) : 0;

  return (
    <ScreenShell title="Live attendance" showBack>
      {!session ? (
        <Text style={{ color: colors.ink.muted }}>Session not found.</Text>
      ) : (
        <>
          <SessionTimer expiresAtIso={session.expiresAt} />
          <View style={{ height: 16 }} />
          <AppCard>
            <Text style={{ color: colors.ink.muted, fontWeight: "800" }}>Scan this QR (updates every {ATTENDANCE_CODE_WINDOW_MS / 1000}s)</Text>
            <View style={{ alignItems: "center", marginTop: 14, marginBottom: 8 }}>
              {qrPayload ? <LiveSessionQr value={qrPayload} /> : null}
            </View>
            <Text style={{ color: colors.ink.muted, fontSize: 12, textAlign: "center", marginBottom: 12 }}>
              Next refresh in ~{secsToRefresh}s · same code as below
            </Text>
            <Text style={{ color: colors.ink.muted, fontWeight: "800" }}>Or enter code manually</Text>
            <Text style={{ color: colors.palette.primary, fontSize: 40, fontWeight: "900", letterSpacing: 4, marginTop: 8 }}>{code}</Text>
            <Text style={{ color: colors.ink.muted, marginTop: 10, lineHeight: 22 }}>
              Refreshes locally from the session seed; no Firestore writes per tick.
            </Text>
          </AppCard>
          <View style={{ height: 16 }} />
          <AppButton
            title="End session (demo)"
            variant="outline"
            onPress={() => {
              mockDB.update("attendanceSessions", session.id, { active: false });
              const mod = mockDB.read("modules", session.moduleId);
              if (mod?.activeSessionId === session.id) mockDB.update("modules", session.moduleId, { activeSessionId: null });
              useMockDbVersionStore.getState().bump();
              router.replace("/lecturer/dashboard");
            }}
          />
        </>
      )}
    </ScreenShell>
  );
}
