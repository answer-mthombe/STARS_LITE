
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { requireSupabaseClient } from "@/supabase/client";
import { TABLES } from "@/supabase/tables";
import {
  studentAttendanceRepository,
  type ActiveSessionForStudent,
} from "@/services/supabase/studentAttendanceRepository";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import {
  AppText,
  Chip,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";

type EnrolledModule = {
  id: string;
  moduleCode: string;
  moduleName: string;
};

export default function StudentDashboard() {
  useRoleGuard("student");

  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [sessions, setSessions] = useState<ActiveSessionForStudent[]>([]);
  const [modules, setModules] = useState<EnrolledModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const client = requireSupabaseClient();

      // 1. Get modules enrolled by this student.
      const { data: mods, error: modErr } = await client
        .from(TABLES.modules)
        .select("id, module_code, module_name")
        .contains("enrolled_students", JSON.stringify([user.id]));

      if (modErr) throw modErr;

      setModules(
        (mods ?? []).map((m: any) => ({
          id: m.id,
          moduleCode: m.module_code,
          moduleName: m.module_name,
        }))
      );

      // 2. Get active attendance sessions.
      const active =
        await studentAttendanceRepository.getActiveSessionsForStudent(
          user.id
        );

      setSessions(active);
      setError(null);
    } catch (e: any) {
      console.error("[STARS] Dashboard loading error:", e);
      setError(e?.message ?? "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      load();
    }, 5000);

    return () => clearInterval(interval);
  }, [load]);

  // Open the selected attendance session.
  const joinSession = (rawSessionId: string | null | undefined) => {
    const sessionId = rawSessionId?.trim();

    if (!sessionId) {
      console.error("[STARS] Cannot join: session ID is empty.");
      setError("This attendance session has an invalid ID. Please refresh.");
      return;
    }

    if (!user?.id) {
      console.error("[STARS] Cannot join: student ID is missing.");
      setError("Your student account is not ready. Please sign in again.");
      return;
    }

    console.log("[STARS] Opening attendance session:", sessionId);
    console.log("[STARS] Current student ID:", user.id);

    router.push({
      pathname: "/student/join/[sessionId]",
      params: {
        sessionId: sessionId,
      },
    } as never);
  };

  return (
    <ScreenShell title="My classes" subtitle="Join an active session">
      <SectionHeader title="Active sessions" overline />

      {loading ? (
        <AppText variant="body" style={{ color: "#687076" }}>
          Checking for sessions…
        </AppText>
      ) : sessions.length === 0 ? (
        <View
          style={{
            backgroundColor: "#F4F6F8",
            padding: 16,
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <AppText variant="body" style={{ color: "#687076" }}>
            No active sessions right now. Your lecturer will start one when
            class begins.
          </AppText>
        </View>
      ) : (
        <Stack gap="sm" style={{ marginBottom: 16 }}>
          {sessions.map((s) => (
            <View
              key={s.sessionId}
              style={{
                borderWidth: 1,
                borderColor: "#A5D6A7",
                borderRadius: 10,
                padding: 16,
                backgroundColor: "#F1F8E9",
              }}
            >
              <AppText
                variant="body"
                style={{ fontWeight: "700", fontSize: 16 }}
              >
                {s.moduleCode}
              </AppText>

              <AppText
                variant="body"
                style={{ fontSize: 13, color: "#555", marginTop: 2 }}
              >
                {s.moduleName}
              </AppText>

              <AppText
                variant="body"
                style={{ fontSize: 12, color: "#687076", marginTop: 6 }}
              >
                Started {new Date(s.startedAt).toLocaleTimeString()}
              </AppText>

              <Row gap="sm" style={{ marginTop: 12 }}>
                <Chip
                  label="▶ Join class"
                  variant="accent"
                  onPress={() => joinSession(s.sessionId)}
                />
              </Row>
            </View>
          ))}
        </Stack>
      )}

      <SectionHeader title="My modules" overline />

      {loading ? (
        <AppText variant="body" style={{ color: "#687076" }}>
          Loading…
        </AppText>
      ) : modules.length === 0 ? (
        <View
          style={{
            backgroundColor: "#F4F6F8",
            padding: 16,
            borderRadius: 10,
          }}
        >
          <AppText variant="body" style={{ color: "#687076" }}>
            You're not enrolled in any modules yet. Ask your lecturer to add
            you.
          </AppText>
        </View>
      ) : (
        <Stack gap="sm">
          {modules.map((m) => (
            <View
              key={m.id}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 10,
                padding: 14,
                backgroundColor: "#FFFFFF",
              }}
            >
              <AppText variant="body" style={{ fontWeight: "600" }}>
                {m.moduleCode}
              </AppText>

              <AppText
                variant="body"
                style={{ fontSize: 13, color: "#555", marginTop: 2 }}
              >
                {m.moduleName}
              </AppText>
            </View>
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
