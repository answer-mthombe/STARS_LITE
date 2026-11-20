
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getModuleById } from "@/services/supabase/moduleRepository";
import { attendanceRepository } from "@/services/supabase/attendanceRepository";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";

import {
  AppText,
  Chip,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";

const DURATIONS = [30, 45, 60, 90, 120];
const MIN_DURATION = 1;
const MAX_DURATION = 480;

export default function StartAttendanceScreen() {
  useRoleGuard("lecturer");

  const router = useRouter();
  const params = useLocalSearchParams();

  const moduleId =
    typeof params.moduleId === "string" ? params.moduleId : "";

  const user = useAuthStore((state) => state.user);

  const [module, setModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customDuration, setCustomDuration] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!moduleId) {
        setError("Module ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const result = await getModuleById(moduleId);
        if (mounted) setModule(result);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load module.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [moduleId]);

  const customValue = customDuration.trim();
  const parsedCustomDuration = customValue ? Number(customValue) : null;
  const effectiveDuration =
    parsedCustomDuration !== null ? parsedCustomDuration : durationMinutes;

  async function handleStart() {
    if (!user?.id || !moduleId || busy) return;

    if (
      !Number.isInteger(effectiveDuration) ||
      effectiveDuration < MIN_DURATION ||
      effectiveDuration > MAX_DURATION
    ) {
      setError("Enter a whole number of minutes between 1 and 480.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { sessionId } =
        await attendanceRepository.startAttendanceSession(
          moduleId,
          user.id,
          "lecture",
          null,
          "UNKNOWN",
          effectiveDuration
        );

      if (!sessionId) {
        throw new Error("The session was created without returning an ID.");
      }

      router.replace(`/lecturer/attendance/live/${sessionId}` as never);
    } catch (e: any) {
      console.error("[STARS] Start session error:", e);
      setError(e?.message ?? "Failed to start session.");
      setBusy(false);
    }
  }

  const enrolledCount = module?.enrolledStudents?.length ?? 0;

  return (
    <ScreenShell title="Start attendance" subtitle="Set the session duration">
      {loading ? (
        <AppText variant="body">Loading module…</AppText>
      ) : !module ? (
        <AppText variant="body" style={{ color: "#C0392B" }}>
          {error ?? "Module not found."}
        </AppText>
      ) : (
        <>
          <SectionHeader title="Session details" overline />

          <View
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              padding: 16,
              backgroundColor: "#FAFBFC",
              marginBottom: 20,
            }}
          >
            <AppText variant="body" style={{ fontWeight: "700", fontSize: 16 }}>
              {module.moduleCode}
            </AppText>

            <AppText
              variant="body"
              style={{ fontSize: 13, color: "#555", marginTop: 2 }}
            >
              {module.moduleName}
            </AppText>

            <View style={{ height: 10 }} />

            <AppText variant="body" style={{ fontSize: 13, color: "#555" }}>
              {enrolledCount} student{enrolledCount === 1 ? "" : "s"} enrolled
            </AppText>
            <AppText variant="body" style={{ fontSize: 13, color: "#555" }}>
              STARS classroom beacon
            </AppText>
          </View>

          <SectionHeader title="Session duration" overline />

          <AppText
            variant="body"
            style={{ color: "#687076", fontSize: 13, marginBottom: 12 }}
          >
            Choose a duration or enter your own number of minutes.
          </AppText>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 18,
            }}
          >
            {DURATIONS.map((minutes) => (
              <Chip
                key={minutes}
                label={`${minutes} min`}
                variant={
                  !customValue && durationMinutes === minutes
                    ? "accent"
                    : "outline"
                }
                onPress={() => {
                  setDurationMinutes(minutes);
                  setCustomDuration("");
                  setError(null);
                }}
              />
            ))}
          </View>

          <AppText
            variant="body"
            style={{ fontWeight: "600", marginBottom: 8 }}
          >
            Custom duration (minutes)
          </AppText>

          <TextInput
            value={customDuration}
            onChangeText={(value) => {
              setCustomDuration(value.replace(/[^0-9]/g, ""));
              setError(null);
            }}
            placeholder="Enter minutes, e.g. 75"
            keyboardType="number-pad"
            editable={!busy}
            style={{
              borderWidth: 1,
              borderColor: "#D5D9DE",
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              color: "#17202A",
              backgroundColor: "#FFFFFF",
              marginBottom: 16,
            }}
          />

          <View
            style={{
              backgroundColor: "#F1F8E9",
              borderRadius: 10,
              padding: 14,
              marginBottom: 18,
            }}
          >
            <AppText
              variant="body"
              style={{ fontWeight: "700", color: "#33691E" }}
            >
              Selected duration: {effectiveDuration} minutes
            </AppText>
            <AppText
              variant="body"
              style={{ fontSize: 13, color: "#33691E", marginTop: 4 }}
            >
              Attendance closes automatically when the countdown reaches zero.
            </AppText>
          </View>

          {error ? (
            <AppText
              variant="body"
              style={{ color: "#C0392B", marginBottom: 12 }}
            >
              {error}
            </AppText>
          ) : null}

          <Stack gap="sm">
            <Chip
              label={busy ? "Starting session…" : "Start attendance"}
              variant="accent"
              onPress={busy ? undefined : handleStart}
            />

            <Chip
              label="Cancel"
              variant="outline"
              onPress={() => router.back()}
            />
          </Stack>
        </>
      )}

      <Spacer size="lg" />
    </ScreenShell>
  );
}
