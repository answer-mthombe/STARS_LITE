
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { stopBroadcast } from "@blunt-ly/ble-advertiser";
import { Audio } from "expo-av";

import { attendanceRepository } from "@/services/supabase/attendanceRepository";

import {
  AppText,
  Chip,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";

type StudentStatus = {
  studentId: string;
  fullName: string;
  studentNumber: string;
  status: "inside" | "on_break" | "left" | "not_seen";
  lastEventAt: string | null;
  lastRssi: number | null;
  exitCount: number;
  lastBreakAt: string | null;
  wasPresent: boolean;
};

const POLL_MS = 3000;

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default function LiveAttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const sessionId =
    typeof params.sessionId === "string"
      ? params.sessionId
      : Array.isArray(params.sessionId)
        ? params.sessionId[0]
        : "";

  const [roster, setRoster] = useState<StudentStatus[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const closingRef = useRef(false);
  const prevLeftCountRef = useRef(0);

  const goToFinalRegister = useCallback(() => {
    router.replace(
      `/lecturer/attendance/final/${sessionId}` as never
    );
  }, [router, sessionId]);

  const closeSession = useCallback(
    async (navigate = true) => {
      if (!sessionId || closingRef.current) return;

      closingRef.current = true;
      setEnding(true);

      try {
        try {
          await stopBroadcast();
          console.log("[STARS] Lecturer beacon stopped.");
        } catch (stopError) {
          console.warn("[STARS] Beacon stop warning:", stopError);
        }

        await attendanceRepository.endAttendanceSession(sessionId);

        if (navigate) {
          goToFinalRegister();
        }
      } catch (e: any) {
        console.error("[STARS] Could not close session:", e);
        setError(e?.message ?? "Could not close the session.");
        closingRef.current = false;
        setEnding(false);
      }
    },
    [sessionId, goToFinalRegister]
  );

  const load = useCallback(async () => {
    if (!sessionId || closingRef.current) return;

    try {
      const [session, data] = await Promise.all([
        attendanceRepository.getAttendanceSession(sessionId),
        attendanceRepository.getSessionRosterWithNames(sessionId),
      ]);

      if (!session) {
        setError("Attendance session could not be found.");
        setLoading(false);
        return;
      }

      setRoster(data);
      setExpiresAt(session.expiresAt);
      setLastSync(new Date());
      setError(null);

      const expired =
        new Date(session.expiresAt).getTime() <= Date.now();

      // Both flags must be true for a session to remain live.
      // An expired or already-ended session goes to the final register.
      if (
        expired ||
        !session.isActive ||
        !session.active ||
        session.endedAt
      ) {
        await closeSession(true);
      }
    } catch (e: any) {
      console.error("[STARS] Live roster load failed:", e);
      setError(e?.message ?? "Failed to load the attendance register.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, closeSession]);

  useEffect(() => {
    void load();

    const interval = setInterval(() => {
      void load();
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [load]);

  // Countdown is calculated from the stored expiry timestamp.
  useEffect(() => {
    if (!expiresAt || closingRef.current) return;

    const updateCountdown = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );

      setRemainingSeconds(seconds);

      if (seconds <= 0) {
        void closeSession(true);
      }
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, closeSession]);

  const inside = roster.filter((student) => student.status === "inside").length;
  const onBreak = roster.filter((student) => student.status === "on_break").length;
  const left = roster.filter((student) => student.status === "left").length;
  const notSeen = roster.filter((student) => student.status === "not_seen").length;
  const total = roster.length;

  useEffect(() => {
    if (left > prevLeftCountRef.current) {
      void playAlarm();
    }

    prevLeftCountRef.current = left;
  }, [left]);

  async function handleEnd() {
    await closeSession(true);
  }

  return (
    <ScreenShell
      title="Live attendance"
      subtitle={
        lastSync
          ? `Last synced ${lastSync.toLocaleTimeString()}`
          : "Syncing attendance…"
      }
      right={
        <Chip
          label={ending ? "Ending…" : "End session"}
          variant="outline"
          onPress={ending ? undefined : handleEnd}
        />
      }
    >
      <View
        style={{
          backgroundColor: remainingSeconds <= 60 ? "#FFF4E5" : "#F1F8E9",
          borderRadius: 12,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <AppText
          variant="body"
          style={{
            fontSize: 13,
            color: "#555",
            marginBottom: 5,
          }}
        >
          SESSION TIME REMAINING
        </AppText>

        <AppText
          variant="body"
          style={{
            fontSize: 32,
            fontWeight: "800",
            color: remainingSeconds <= 60 ? "#B45309" : "#33691E",
          }}
        >
          {formatTime(remainingSeconds)}
        </AppText>

        <AppText
          variant="body"
          style={{ fontSize: 12, color: "#555", marginTop: 5 }}
        >
          {expiresAt
            ? `Ends at ${new Date(expiresAt).toLocaleTimeString()}`
            : "Loading session expiry…"}
        </AppText>
      </View>

      <SectionHeader title="Live summary" overline />

      <Row gap="sm" style={{ flexWrap: "wrap", marginBottom: 16 }}>
        <Chip label={`🟢 ${inside} inside`} variant="accent" />
        <Chip label={`🟡 ${onBreak} on break`} variant="outline" />
        <Chip label={`🔴 ${left} left`} variant="outline" />
        <Chip label={`⚪ ${notSeen} not seen`} variant="outline" />
        <Chip label={`Total ${total}`} variant="outline" />
      </Row>

      <SectionHeader title="Students" overline />

      {loading ? (
        <AppText variant="body">Loading students…</AppText>
      ) : roster.length === 0 ? (
        <AppText variant="body">No enrolled students were found.</AppText>
      ) : (
        <Stack gap="sm">
          {roster.map((student) => (
            <StudentRow key={student.studentId} student={student} />
          ))}
        </Stack>
      )}

      {error ? (
        <AppText
          variant="body"
          style={{ color: "#C0392B", marginTop: 12 }}
        >
          {error}
        </AppText>
      ) : null}

      <Spacer size="lg" />
    </ScreenShell>
  );
}

async function playAlarm() {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require("../../../../assets/alarm.mp3.wav")
    );

    await sound.playAsync();

    setTimeout(() => {
      void sound.unloadAsync().catch(() => {});
    }, 3000);
  } catch (e) {
    console.warn("[STARS] Alarm playback failed:", e);
  }
}

function StudentRow({ student }: { student: StudentStatus }) {
  const statusLabel =
    student.status === "inside"
      ? "Inside"
      : student.status === "on_break"
        ? "On break"
        : student.status === "left"
          ? "Left"
          : "Not seen";

  const statusColor =
    student.status === "inside"
      ? "#2E7D32"
      : student.status === "on_break"
        ? "#B7791F"
        : student.status === "left"
          ? "#C0392B"
          : "#687076";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 13,
        backgroundColor: "#FFFFFF",
      }}
    >
      <Row
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  }}
>
        <View style={{ flex: 1 }}>
          <AppText variant="body" style={{ fontWeight: "700" }}>
            {student.fullName}
          </AppText>

          <AppText
            variant="body"
            style={{ color: "#687076", fontSize: 12, marginTop: 3 }}
          >
            {student.studentNumber}
          </AppText>
        </View>

        <AppText
          variant="body"
          style={{ color: statusColor, fontWeight: "700" }}
        >
          {statusLabel}
        </AppText>
      </Row>

      <AppText
        variant="body"
        style={{ color: "#687076", fontSize: 11, marginTop: 7 }}
      >
        {student.lastEventAt
          ? `Last event: ${new Date(student.lastEventAt).toLocaleTimeString()}`
          : "No beacon event recorded"}
        {student.lastRssi !== null ? `  •  RSSI ${student.lastRssi} dBm` : ""}
      </AppText>
    </View>
  );
}
