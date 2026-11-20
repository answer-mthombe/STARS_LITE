import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

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
  status: "inside" | "on_break" | "left" | "not_seen";
  lastEventAt: string | null;
  lastRssi: number | null;
  exitCount: number;
  lastBreakAt: string | null;
};

const POLL_MS = 5000;
const BREAK_LIMIT_MS = 7 * 60 * 1000;

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
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await attendanceRepository.getSessionRoster(sessionId);
      setRoster(data);
      setLastSync(new Date());
      setError(null);
    } catch (e: any) {
      console.error("Live roster load failed:", e);
      setError(e?.message ?? "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const inside = roster.filter((s) => s.status === "inside").length;
  const onBreak = roster.filter((s) => s.status === "on_break").length;
  const left = roster.filter((s) => s.status === "left").length;
  const notSeen = roster.filter((s) => s.status === "not_seen").length;
  const total = roster.length;
  const hasAlerts = left > 0;

  const now = Date.now();
  const expiredBreaks = roster.filter(
    (s) =>
      s.status === "on_break" &&
      s.lastBreakAt &&
      now - new Date(s.lastBreakAt).getTime() > BREAK_LIMIT_MS
  );

  async function handleEnd() {
    if (!sessionId) return;
    setEnding(true);
    try {
      await attendanceRepository.endAttendanceSession(sessionId);
      router.replace("/lecturer/(tabs)/dashboard" as never);
    } catch (e: any) {
      console.error("End session failed:", e);
      setError(e?.message ?? "Failed to end session");
      setEnding(false);
    }
  }

  return (
    <ScreenShell
      title="Live attendance"
      subtitle={lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : "Syncing…"}
      right={
        <Chip
          label={ending ? "Ending…" : "End session"}
          variant="outline"
          onPress={ending ? undefined : handleEnd}
        />
      }
    >
      {hasAlerts ? (
        <View
          style={{
            backgroundColor: "#FDECEA",
            borderLeftWidth: 4,
            borderLeftColor: "#C0392B",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <AppText variant="body" style={{ color: "#C0392B", fontWeight: "600" }}>
            ⚠ {left} student{left > 1 ? "s" : ""} left the room
          </AppText>
          <AppText variant="body" style={{ color: "#7A1F16", fontSize: 13 }}>
            Check the roster below for names
          </AppText>
        </View>
      ) : null}

      <SectionHeader title="Summary" overline />
      <Row gap="sm" style={{ flexWrap: "wrap", marginBottom: 16 }}>
        <Chip label={`🟢 ${inside} inside`} variant="accent" />
        <Chip label={`🟡 ${onBreak} on break`} variant="outline" />
        <Chip label={`🔴 ${left} left`} variant="outline" />
        <Chip label={`⚪ ${notSeen} not seen`} variant="outline" />
        <Chip label={`Total ${total}`} variant="outline" />
      </Row>

      {expiredBreaks.length > 0 ? (
        <View
          style={{
            backgroundColor: "#FFF4E5",
            borderLeftWidth: 4,
            borderLeftColor: "#E67E22",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <AppText variant="body" style={{ color: "#A05000", fontWeight: "600" }}>
            ⏱ {expiredBreaks.length} break(s) exceeded 7 minutes
          </AppText>
        </View>
      ) : null}

      <SectionHeader title="Students" overline />
      {loading ? (
        <AppText variant="body" style={{ color: "#687076" }}>
          Loading roster…
        </AppText>
      ) : roster.length === 0 ? (
        <AppText variant="body" style={{ color: "#687076" }}>
          No students enrolled in this module.
        </AppText>
      ) : (
        <Stack gap="sm">
          {roster.map((s) => (
            <StudentRow key={s.studentId} student={s} />
          ))}
        </Stack>
      )}

      {error ? (
        <AppText variant="body" style={{ color: "#C0392B", marginTop: 12 }}>
          {error}
        </AppText>
      ) : null}

      <Spacer size="lg" />
    </ScreenShell>
  );
}

function StudentRow({ student }: { student: StudentStatus }) {
  const { status, studentId, lastEventAt, lastRssi, exitCount } = student;

  const dot =
    status === "inside"
      ? "🟢"
      : status === "on_break"
      ? "🟡"
      : status === "left"
      ? "🔴"
      : "⚪";

  const label =
    status === "inside"
      ? "Inside"
      : status === "on_break"
      ? "On break"
      : status === "left"
      ? "Left room"
      : "Not seen yet";

  const time = lastEventAt
    ? new Date(lastEventAt).toLocaleTimeString()
    : "—";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor:
          status === "left"
            ? "#FDECEA"
            : status === "on_break"
            ? "#FFF9E5"
            : "#F6F8FA",
      }}
    >
      <AppText variant="body" style={{ fontSize: 18, marginRight: 10 }}>
        {dot}
      </AppText>
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ fontWeight: "600" }}>
          {shortId(studentId)}
        </AppText>
        <AppText variant="body" style={{ fontSize: 12, color: "#687076" }}>
          {label} · {time}
          {lastRssi != null ? ` · RSSI ${lastRssi}` : ""}
          {exitCount > 0 ? ` · ${exitCount} exit${exitCount > 1 ? "s" : ""}` : ""}
        </AppText>
      </View>
    </View>
  );
}

function shortId(id: string): string {
  if (id.length <= 10) return id;
  return id.slice(0, 6) + "…" + id.slice(-4);
}