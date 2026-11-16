import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location"; // <-- NEW

import { useBeaconScanner } from "@/hooks/useBeaconScanner";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AppText, Chip, Row, ScreenShell, SectionHeader, Spacer } from "@/components/ui";

// 🎯 REPLACE WITH YOUR ACTUAL CAMPUS COORDINATES
// MUT Main Campus Coordinates
const CAMPUS_LAT = -29.969800015960548; 
const CAMPUS_LON = 30.913284838442745; 
const CAMPUS_RADIUS_METERS = 2000; // 2km radius

export default function JoinSessionScreen() {
  useRoleGuard("student");
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const user = useAuthStore((s) => s.user);

  // Status: 'checking_gps' -> 'gps_failed' -> 'checking_biometrics' -> 'bio_failed' -> 'ready'
  const [status, setStatus] = useState<"checking_gps" | "gps_failed" | "checking_biometrics" | "bio_failed" | "ready">("checking_gps");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function startFlow() {
      // 1. CHECK GEOFENCE
      const { status: gpsStatus } = await Location.requestForegroundPermissionsAsync();
      if (gpsStatus !== "granted") {
        setErrorMsg("Location permission denied. You must allow location to verify you are on campus.");
        setStatus("gps_failed");
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const distance = getDistanceInMeters(
        location.coords.latitude, location.coords.longitude, CAMPUS_LAT, CAMPUS_LON
      );

      if (distance > CAMPUS_RADIUS_METERS) {
        setErrorMsg("You are too far from the university campus to join this class.");
        setStatus("gps_failed");
        return;
      }

      // 2. CHECK BIOMETRICS
      setStatus("checking_biometrics");
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify identity to join class",
          fallbackLabel: "Use PIN",
          disableDeviceFallback: false,
        });

        if (!auth.success) {
          setErrorMsg("Identity verification failed.");
          setStatus("bio_failed");
          return;
        }
      } else {
        console.log("No biometrics available. Falling back to PIN.");
        // If no biometrics, we prompt for PIN via fallback
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify identity to join class",
          fallbackLabel: "Use PIN",
          disableDeviceFallback: false,
        });
        if (!auth.success) {
          setErrorMsg("Identity verification failed.");
          setStatus("bio_failed");
          return;
        }
      }

      // 3. READY FOR BLE
      setStatus("ready");
    }

    startFlow();
  }, []);

  // 🎯 Only start BLE if status is 'ready'
  const scanner = useBeaconScanner(
    status === "ready" ? (sessionId ?? null) : null,
    status === "ready" ? (user?.id ?? null) : null
  );

  const dot = scanner.inside ? "🟢" : scanner.scanning ? "🟡" : "⚪";
  const label = scanner.inside ? "Inside classroom" : scanner.scanning ? "Scanning for beacon…" : "Not scanning";

  // --- RENDERING SCREENS ---

  if (status === "checking_gps") {
    return (
      <ScreenShell title="Join class">
        <AppText variant="body">Verifying campus location…</AppText>
      </ScreenShell>
    );
  }

  if (status === "gps_failed") {
    return (
      <ScreenShell title="Join class">
        <View style={{ backgroundColor: "#FDECEA", padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <AppText variant="body" style={{ color: "#C0392B", fontWeight: "600", fontSize: 16 }}>⚠ Not on campus</AppText>
          <AppText variant="body" style={{ color: "#C0392B", marginTop: 8 }}>{errorMsg}</AppText>
        </View>
        <Chip label="Go back" variant="outline" onPress={() => router.back()} />
      </ScreenShell>
    );
  }

  if (status === "checking_biometrics") {
    return (
      <ScreenShell title="Join class">
        <AppText variant="body">Waiting for fingerprint/PIN…</AppText>
      </ScreenShell>
    );
  }

  if (status === "bio_failed") {
    return (
      <ScreenShell title="Join class">
        <View style={{ backgroundColor: "#FDECEA", padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <AppText variant="body" style={{ color: "#C0392B", fontWeight: "600", fontSize: 16 }}>⚠ Verification Failed</AppText>
          <AppText variant="body" style={{ color: "#C0392B", marginTop: 8 }}>{errorMsg}</AppText>
        </View>
        <Chip label="Go back" variant="outline" onPress={() => router.back()} />
      </ScreenShell>
    );
  }

  // --- READY SCREEN (BLE ACTIVE) ---
  return (
    <ScreenShell title="Join class" subtitle="Stay on this screen">
      <SectionHeader title="Status" overline />
      <View
        style={{
          borderWidth: 1,
          borderColor: scanner.inside ? "#A5D6A7" : "#E5E7EB",
          borderRadius: 10,
          padding: 16,
          backgroundColor: scanner.inside ? "#F1F8E9" : "#FAFBFC",
          marginBottom: 16,
        }}
      >
        <AppText variant="body" style={{ fontSize: 20, marginBottom: 6 }}>{dot} {label}</AppText>
        <AppText variant="body" style={{ fontSize: 13, color: "#555" }}>RSSI: {scanner.rssi ?? "—"} dBm</AppText>
        <AppText variant="body" style={{ fontSize: 13, color: "#555" }}>Last event: {scanner.lastEvent ?? "—"}</AppText>
      </View>

      <AppText variant="body" style={{ fontSize: 13, color: "#687076" }}>
        Location and identity verified. Keep the app open. When you are near the lecturer, your presence is logged automatically.
      </AppText>

      <Spacer size="lg" />
      <Row gap="sm">
        <Chip label="Leave class" variant="outline" onPress={() => router.back()} />
      </Row>
    </ScreenShell>
  );
}

// Helper to calculate distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}