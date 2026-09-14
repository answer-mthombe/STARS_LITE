import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { AppInput } from "@/components/ui/AppInput";
import { SessionTimer } from "@/components/ui/SessionTimer";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { attendanceSimulationService } from "@/services/attendanceSimulationService";
import { captureAttendanceLocation } from "@/utils/captureAttendanceLocation";
import { beginAttendance, submitAttendance } from "@/services/serverAttendanceService";
import type { AttendanceSessionModel } from "@/models/Attendance";

type Phase = "form" | "locating" | "submitting" | "success";

export default function StudentMarkAttendanceScreen() {
  useRoleGuard("student");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const [session, setSession] = useState<AttendanceSessionModel | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [distanceM, setDistanceM] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingSession(true);
    attendanceSimulationService
      .fetchLiveSessionForModule(String(moduleId))
      .then((live) => {
        if (!cancelled) setSession(live);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId, v]);

  const busy = phase === "locating" || phase === "submitting";
  const codeReady = code.trim().length === 6;

  async function markPresent() {
    if (!session || !user || user.role !== "student") return;
    setError(null);
    try {
      setPhase("locating");
      const fix = await captureAttendanceLocation();

      setPhase("submitting");
      const begun = await beginAttendance(session.id);
      if (!begun.ok) {
        setError({ message: begun.message, retryable: begun.retryable });
        setPhase("form");
        return;
      }
      const out = await submitAttendance({ token: begun.token, code, fix });
      if (!out.ok) {
        setError({ message: out.message, retryable: out.retryable });
        setPhase("form");
        return;
      }
      setDistanceM(out.distanceM);
      setPhase("success");
    } catch (e: any) {
      setError({ message: e?.message ?? "We couldn't get your location.", retryable: true });
      setPhase("form");
    }
  }

  // --- Loading ---
  if (loadingSession) {
    return (
      <ScreenShell title="Mark attendance" showBack>
        <View style={{ paddingTop: 40 }}>
          <ActivityIndicator size="large" color={colors.palette.accent} />
        </View>
      </ScreenShell>
    );
  }

  // --- No active session ---
  if (!session) {
    return (
      <ScreenShell title="Mark attendance" showBack>
        <AppCard>
          <AppText variant="bodyStrong">No active session</AppText>
          <AppText variant="caption" color={colors.ink.subtle} style={{ marginTop: 6 }}>
            Your lecturer hasn't started attendance for this class yet. Come back when the session is live.
          </AppText>
        </AppCard>
        <View style={{ height: 16 }} />
        <AppButton title="Back" variant="outline" onPress={() => router.back()} />
      </ScreenShell>
    );
  }

  // --- Success ---
  if (phase === "success") {
    return (
      <ScreenShell title="Mark attendance" showBack>
        <View style={{ alignItems: "center", paddingTop: 24 }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.palette.accent,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <AppText style={{ fontSize: 40, color: colors.ink.inverse }}>✓</AppText>
          </View>
          <AppText variant="title">You're marked present</AppText>
          <AppText variant="caption" color={colors.ink.subtle} style={{ marginTop: 8, textAlign: "center" }}>
            Verified inside the venue · {Math.round(distanceM)} m from the class anchor.
          </AppText>
        </View>
        <View style={{ height: 28 }} />
        <AppButton title="Done" onPress={() => router.back()} />
      </ScreenShell>
    );
  }

  // --- Form ---
  return (
    <ScreenShell title="Mark attendance" subtitle="Enter the code — we verify you're in the room" showBack scroll>
      <SessionTimer expiresAtIso={session.expiresAt} />

      <AppText variant="body" color={colors.ink.muted} style={{ marginTop: 12, lineHeight: 22 }}>
        Type the 6-digit code on your lecturer's screen. When you tap below, we check your location and confirm the code
        on the server — you must be inside the venue.
      </AppText>

      <View style={{ height: 18 }} />

      <AppCard>
        <AppText variant="label" style={{ marginBottom: 10 }}>
          Attendance code
        </AppText>
        <AppInput
          label=""
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
          keyboardType="number-pad"
          placeholder="6 digits"
        />
        <AppText variant="caption" color={colors.ink.subtle} style={{ marginTop: 10 }}>
          The code changes every few seconds — enter the current one and submit promptly.
        </AppText>
      </AppCard>

      {error ? (
        <>
          <View style={{ height: 14 }} />
          <View
            style={{
              backgroundColor: "rgba(79,26,29,0.06)",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.palette.primary,
              padding: 14,
            }}
          >
            <AppText variant="bodyStrong" color={colors.palette.primary}>
              Not recorded
            </AppText>
            <AppText variant="caption" color={colors.ink.muted} style={{ marginTop: 4 }}>
              {error.message}
            </AppText>
          </View>
        </>
      ) : null}

      <View style={{ height: 18 }} />
      <AppButton
        title={phase === "locating" ? "Checking your location…" : phase === "submitting" ? "Submitting…" : "Mark me present"}
        disabled={busy || !codeReady}
        onPress={() => void markPresent()}
      />
      {busy ? (
        <View style={{ paddingTop: 14 }}>
          <ActivityIndicator color={colors.palette.accent} />
        </View>
      ) : null}
    </ScreenShell>
  );
}
