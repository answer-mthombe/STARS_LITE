
import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import {
  attendanceRepository,
  type AttendanceHistoryModule,
} from "@/services/supabase/attendanceRepository";

import {
  AppText,
  Chip,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";

import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function AttendanceHistoryScreen() {
  useRoleGuard("lecturer");

  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [modules, setModules] = useState<AttendanceHistoryModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    if (!user?.id) {
      setError("Your lecturer account could not be identified.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("[STARS HISTORY] Loading history modules:", user.id);

      const result =
        await attendanceRepository.getAttendanceHistoryModules(user.id);

      setModules(result);

      console.log("[STARS HISTORY] Modules loaded:", result.length);
    } catch (e: unknown) {
      console.error("[STARS HISTORY] Module list failed:", e);

      setError(
        e instanceof Error
          ? e.message
          : "Could not load attendance history."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  return (
    <ScreenShell
      title="Attendance history"
      subtitle="Select a module to view its completed attendance sessions"
      right={
        <Chip
          label="Back"
          variant="outline"
          onPress={() =>
            router.replace("/lecturer/(tabs)/dashboard" as never)
          }
        />
      }
    >
      {loading ? (
        <View style={{ alignItems: "center", padding: 30 }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Spacer size="md" />
          <AppText variant="body">Loading modules...</AppText>
        </View>
      ) : error ? (
        <Stack gap="md">
          <AppText variant="body" style={{ color: "#C0392B" }}>
            {error}
          </AppText>

          <Chip
            label="Try again"
            variant="accent"
            onPress={() => void loadModules()}
          />
        </Stack>
      ) : modules.length === 0 ? (
        <View
          style={{
            backgroundColor: "#F4F6F8",
            borderRadius: 10,
            padding: 16,
          }}
        >
          <AppText variant="body" style={{ color: "#687076" }}>
            No completed attendance sessions have been recorded yet.
          </AppText>
        </View>
      ) : (
        <Stack gap="md">
          <SectionHeader title="Your modules" overline />

          {modules.map((module) => (
            <View
              key={module.moduleId}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 10,
                padding: 15,
                backgroundColor: "#FFFFFF",
              }}
            >
              <AppText
                variant="body"
                style={{ fontWeight: "700", marginBottom: 6 }}
              >
                {module.moduleCode}
              </AppText>

              <AppText
                variant="body"
                style={{ color: "#687076", fontSize: 13 }}
              >
                {module.totalSessions} completed{" "}
                {module.totalSessions === 1 ? "session" : "sessions"}
              </AppText>

              <AppText
                variant="body"
                style={{
                  color: "#687076",
                  fontSize: 12,
                  marginTop: 4,
                  marginBottom: 12,
                }}
              >
                Latest:{" "}
                {new Date(module.latestSessionDate).toLocaleDateString()}
              </AppText>

              <Chip
                label="View module history"
                variant="accent"
                onPress={() =>
                  router.push(
                    `/lecturer/attendance/module-history/${module.moduleId}` as never
                  )
                }
              />
            </View>
          ))}
        </Stack>
      )}

      <Spacer size="lg" />

      <Chip
        label="Back to lecturer dashboard"
        variant="outline"
        onPress={() =>
          router.replace("/lecturer/(tabs)/dashboard" as never)
        }
      />

      <Spacer size="lg" />
    </ScreenShell>
  );
}
