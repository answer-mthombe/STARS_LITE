import { useEffect, useState } from "react";
import { Platform, PermissionsAndroid, View, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { broadcast, isEnabled } from "@blunt-ly/ble-advertiser";

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

const ATTENDANCE_BEACON_UUID = "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0";

async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(result).every(
      (r) => r === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (e) {
    return false;
  }
}

export default function StartAttendanceScreen() {
  useRoleGuard("lecturer");
  const router = useRouter();
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const user = useAuthStore((s) => s.user);

  const [module, setModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!moduleId) return;
      try {
        const m = await getModuleById(moduleId);
        setModule(m);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load module");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [moduleId]);

  async function handleStart() {
    if (!user?.id || !moduleId) return;
    setBusy(true);
    setError(null);

    try {
      const granted = await ensureBluetoothPermissions();
      if (!granted) {
        setError("Bluetooth permissions denied.");
        setBusy(false);
        return;
      }

      const btEnabled = await isEnabled();
      if (!btEnabled) {
        Alert.alert("Bluetooth is Off", "Please turn on Bluetooth to start the session.", [{ text: "OK", onPress: () => setBusy(false) }]);
        return;
      }

      // 1. Create session (standard signature, no MAC address needed)
      const { sessionId } = await attendanceRepository.startAttendanceSession(
        moduleId,
        user.id,
        "lecture"
      );

      // 2. Start broadcasting
      try {
        await broadcast([ATTENDANCE_BEACON_UUID]);
        console.log("[beacon] started broadcasting");
      } catch (beaconErr: any) {
        console.warn("[beacon] failed to start:", beaconErr);
      }

      router.replace(`/lecturer/attendance/live/${sessionId}` as never);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to start session");
      setBusy(false);
    }
  }

  const enrolledCount = module?.enrolledStudents?.length ?? 0;

  return (
    <ScreenShell title="Start attendance" subtitle="Confirm and begin">
      {loading ? (
        <AppText variant="body" style={{ color: "#687076" }}>Loading module…</AppText>
      ) : !module ? (
        <AppText variant="body" style={{ color: "#C0392B" }}>Module not found.</AppText>
      ) : (
        <>
          <SectionHeader title="Session details" overline />
          <View style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 16, backgroundColor: "#FAFBFC", marginBottom: 16 }}>
            <AppText variant="body" style={{ fontWeight: "700", fontSize: 16 }}>{module.moduleCode}</AppText>
            <AppText variant="body" style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{module.moduleName}</AppText>
            <View style={{ height: 10 }} />
            <AppText variant="body" style={{ fontSize: 13, color: "#555" }}>👥 {enrolledCount} student{enrolledCount === 1 ? "" : "s"} enrolled</AppText>
            <AppText variant="body" style={{ fontSize: 13, color: "#555" }}>📡 BLE beacon will broadcast during the session</AppText>
          </View>

          {error ? (
            <AppText variant="body" style={{ color: "#C0392B", marginBottom: 12 }}>{error}</AppText>
          ) : null}

          <Stack gap="sm">
            <Chip label={busy ? "Starting…" : "▶ Start session now"} variant="accent" onPress={busy ? undefined : handleStart} />
            <Chip label="Cancel" variant="outline" onPress={() => router.back()} />
          </Stack>
        </>
      )}
      <Spacer size="lg" />
    </ScreenShell>
  );
}