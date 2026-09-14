import { useEffect, useMemo, useState } from "react";
import { View,Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { LiveSessionQr } from "@/components/attendance/LiveSessionQr";
import { AppButton, AppCard, AppText, ScreenShell, SessionTimer, Spacer } from "@/components/ui";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { ATTENDANCE_CODE_WINDOW_MS, currentAttendanceCode } from "@/utils/rotatingCode";
import { buildAttendanceQrPayload } from "@/utils/attendanceQr";
import { classRegisterService } from "@/services/classRegisterService";
import { useToastStore } from "@/store/toastStore";
import { AttendanceSessionModel } from "@/models/Attendance";
import { attendanceSessionRepository } from "@/services/supabase/attendanceSessionRepository";
import { isSupabaseEnabled } from "@/supabase/client";
import { attendanceSimulationService } from "@/services/attendanceSimulationService";
import { getActiveSessionCode } from "@/services/serverAttendanceService";
import { colors } from "@/theme/colors";

export default function LecturerActiveSessionScreen() {
  useRoleGuard(["lecturer", "tutor"]);
  const { sessionId } = useLocalSearchParams() as { sessionId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const v = useMockDbVersionStore((s) => s.version);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<AttendanceSessionModel | null>(null);
  const [serverCode, setServerCode] = useState<{ code: string; secondsRemaining: number } | null>(null);

  // const session = useMemo(() => {
  //   mockDB.touch();
  //   return mockDB.read("attendanceSessions", String(sessionId));
  // }, [sessionId, v, tick]);

  useEffect(() => {
  async function loadSession() {
    if (isSupabaseEnabled()) {
       const live = await attendanceSessionRepository.getActiveSession(String(sessionId));
       setSession(live);
    } else {
       mockDB.touch();
       setSession(mockDB.read("attendanceSessions", String(sessionId)) ?? null);
    }
  }
  loadSession();
}, [sessionId, v, tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll the SERVER for the current rotating code (seed stays server-side).
  // Mock mode / offline falls back to the local derivation below.
  useEffect(() => {
    if (!session || !isSupabaseEnabled()) return;
    let cancelled = false;
    const poll = async () => {
      const res = await getActiveSessionCode(session.id);
      if (!cancelled) setServerCode(res);
    };
    void poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session]);

  const rot = session ? currentAttendanceCode(session.algorithmSeed) : null;
  const secsToRefresh = rot ? Math.max(0, Math.ceil((rot.nextChangeAt - Date.now()) / 1000)) : 0;
  // Prefer the server code; fall back to local derivation in mock mode.
  const code = serverCode?.code ?? rot?.code ?? "------";
  const codeSecs = serverCode ? serverCode.secondsRemaining : secsToRefresh;
  const isLecturer = user?.role === "lecturer";

  const endClass = async () => {
    if (!session || !user) return;
    setBusy(true);
    try {
      const personId = user.role === "tutor" ? user.studentId : user.id;
      const role = user.role === "tutor" ? "tutor" : "lecturer";
      const res = await classRegisterService.confirmClassEnded({
        sessionId: session.id,
        confirmedByRole: role,
        confirmedByPersonId: personId,
      });
      if (res.ok) {
        show({ type: "success", title: "Class register PDF generated" });
        router.replace(`/lecturer/register/${res.register.id}` as never);
      } else {
        show({ type: "info", title: res.reason });
      }
    } catch (e) {
      show({ type: "error", title: e instanceof Error ? e.message : "Could not end class" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell title="Live attendance" showBack>
      {!session ? (
        <AppText variant="body">Session not found.</AppText>
      ) : session.classRegisterId ? (
        <>
          <AppText variant="body" style={{ marginBottom: 12 }}>
            Class ended — register is ready.
          </AppText>
          <AppButton
            title="View PDF register"
            onPress={() => router.push(`/lecturer/register/${session.classRegisterId}` as never)}
          />
        </>
      ) : (
        <>
          {/* <SessionTimer expiresAtIso={session.expiresAt} />
          <Spacer size="lg" />
          <AppCard>
            <AppText variant="label">Scan this QR (updates every {ATTENDANCE_CODE_WINDOW_MS / 1000}s)</AppText>
            <View style={{ alignItems: "center", marginTop: 14, marginBottom: 8 }}>
              {qrPayload ? <LiveSessionQr value={qrPayload} /> : null}
            </View>
            <AppText variant="caption" align="center" style={{ marginBottom: 12 }}>
              Next refresh in ~{secsToRefresh}s
            </AppText>
            <AppText variant="label">Or enter code manually</AppText>
            <AppText variant="metric" color="#4F1A1D" style={{ fontSize: 40, letterSpacing: 4, marginTop: 8 }}>
              {code}
            </AppText>
          </AppCard>
          <Spacer size="lg" /> */}

           <SessionTimer expiresAtIso={session.expiresAt} />
          <Spacer size="lg" />
          <AppCard>
            <AppText variant="label" align="center">Attendance code</AppText>
            <AppText
              variant="metric"
              color={colors.palette.primary}
              style={{ fontSize: 52, letterSpacing: 8, textAlign: "center", marginTop: 12 }}
            >
              {code}
            </AppText>
            {/* Rotation countdown bar */}
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border.subtle, marginTop: 16, overflow: "hidden" }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.palette.accent,
                  width: `${Math.max(0, Math.min(100, (codeSecs / 20) * 100))}%`,
                }}
              />
            </View>
            <AppText variant="caption" align="center" style={{ color: colors.ink.muted, marginTop: 10 }}>
              Changes every ~20s · new code in ~{codeSecs}s. Students type this; the server checks it with GPS.
            </AppText>
          </AppCard>
          <Spacer size="lg" />
          
          <AppButton
            title={busy ? "Finalising…" : isLecturer ? "Confirm class ended & PDF" : "Confirm class ended (tutor)"}
            variant="outline"
            disabled={busy}
            onPress={endClass}
          />
          {session.tutorEndConfirmations?.length ? (
            <AppText variant="caption" style={{ marginTop: 10 }}>
              Tutor confirmations: {session.tutorEndConfirmations.length}
            </AppText>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}
