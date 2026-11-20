
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useBeaconScanner } from "@/hooks/useBeaconScanner";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";

import {
  AppText,
  Chip,
  ScreenShell,
  SectionHeader,
  Spacer,
} from "@/components/ui";

type JoinStatus = "checking_data" | "missing_data" | "ready";

export default function JoinSessionScreen() {
  useRoleGuard("student");

  const router = useRouter();
  const params = useLocalSearchParams();

  const rawSessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;

  const sessionId =
    typeof rawSessionId === "string" && rawSessionId.trim()
      ? rawSessionId.trim()
      : null;

  // Keep account identification; remove biometric verification.
  const user = useAuthStore((s) => s.user);

  const studentId =
    typeof user?.id === "string" && user.id.trim()
      ? user.id.trim()
      : null;

  const [status, setStatus] = useState<JoinStatus>("checking_data");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    console.log("[STARS] JOIN SESSION:", {
      sessionId,
      studentId,
      userAvailable: !!user,
    });

    if (!sessionId) {
      setErrorMsg("The session ID is missing. Return to My Classes and try again.");
      setStatus("missing_data");
      return;
    }

    if (!studentId) {
      setErrorMsg("Your student account could not be identified. Please sign in again.");
      setStatus("missing_data");
      return;
    }

    setErrorMsg(null);
    setStatus("ready");
  }, [sessionId, studentId]);

  // Scanner starts as soon as valid session and student IDs are available.
  const scanner = useBeaconScanner(
    status === "ready" ? sessionId : null,
    status === "ready" ? studentId : null
  );

  const dot = scanner.error
    ? "🔴"
    : scanner.inside
      ? "🟢"
      : scanner.scanning
        ? "🟡"
        : "⚪";

  const label = scanner.error
    ? "Scanner problem"
    : scanner.inside
      ? "Present — inside classroom"
      : scanner.scanning
        ? "Searching for classroom beacon..."
        : "Waiting for scanner";

  if (status === "checking_data") {
    return (
      <ScreenShell title="Join class">
        <AppText variant="body">
          Preparing your attendance session...
        </AppText>
      </ScreenShell>
    );
  }

  if (status === "missing_data") {
    return (
      <ScreenShell title="Join class">
        <View
          style={{
            backgroundColor: "#FFF4E5",
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <AppText
            variant="body"
            style={{ color: "#9A6700", fontWeight: "600", fontSize: 16 }}
          >
            Attendance information missing
          </AppText>

          <AppText
            variant="body"
            style={{ color: "#9A6700", marginTop: 8 }}
          >
            {errorMsg}
          </AppText>
        </View>

        <Chip
          label="Go back"
          variant="outline"
          onPress={() => router.back()}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Join class"
      subtitle="Keep this screen open while your attendance is monitored."
    >
      <SectionHeader title="Attendance status" overline />

      <View
        style={{
          borderWidth: 1,
          borderColor: scanner.error
            ? "#E57373"
            : scanner.inside
              ? "#A5D6A7"
              : "#E5E7EB",
          borderRadius: 10,
          padding: 16,
          backgroundColor: scanner.error
            ? "#FFF5F5"
            : scanner.inside
              ? "#F1F8E9"
              : "#FAFBFC",
          marginBottom: 16,
        }}
      >
        <AppText
          variant="body"
          style={{ fontSize: 20, marginBottom: 10 }}
        >
          {dot} {label}
        </AppText>

        <AppText
          variant="body"
          style={{ fontSize: 13, color: "#555", marginBottom: 5 }}
        >
          Bluetooth: {scanner.scanning ? "Active" : "Inactive"}
        </AppText>

        <AppText
          variant="body"
          style={{ fontSize: 13, color: "#555", marginBottom: 5 }}
        >
          RSSI: {scanner.rssi ?? "—"} dBm
        </AppText>

        <AppText
          variant="body"
          style={{ fontSize: 13, color: "#555" }}
        >
          Last event: {scanner.lastEvent ?? "—"}
        </AppText>
      </View>

      {scanner.error ? (
        <View
          style={{
            backgroundColor: "#FDECEA",
            padding: 14,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <AppText
            variant="body"
            style={{ color: "#C0392B", fontWeight: "600" }}
          >
            Scanner message
          </AppText>

          <AppText
            variant="body"
            style={{ color: "#C0392B", marginTop: 5 }}
          >
            {scanner.error}
          </AppText>
        </View>
      ) : null}

      <AppText
        variant="body"
        style={{ fontSize: 13, color: "#687076" }}
      >
        You have joined this session. STARS will monitor the classroom
        beacon and record your attendance when your phone is detected
        inside the classroom.
      </AppText>

      <Spacer size="lg" />

      <Chip
        label="Leave class"
        variant="outline"
        onPress={() => router.back()}
      />
    </ScreenShell>
  );
}
