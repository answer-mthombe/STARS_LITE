import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { SessionTimer } from "@/components/ui/SessionTimer";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { currentAttendanceCode } from "@/utils/rotatingCode";

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

  const code = session ? currentAttendanceCode(session.algorithmSeed).code : "------";

  return (
    <ScreenShell title="Live attendance" showBack>
      {!session ? (
        <Text style={{ color: colors.ink.muted }}>Session not found.</Text>
      ) : (
        <>
          <SessionTimer expiresAtIso={session.expiresAt} />
          <View style={{ height: 16 }} />
          <AppCard>
            <Text style={{ color: colors.ink.muted, fontWeight: "800" }}>Rotating code</Text>
            <Text style={{ color: colors.palette.primary, fontSize: 40, fontWeight: "900", letterSpacing: 4, marginTop: 8 }}>{code}</Text>
            <Text style={{ color: colors.ink.muted, marginTop: 10, lineHeight: 22 }}>
              Refreshes on device every second; no Firestore writes per rotation.
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
