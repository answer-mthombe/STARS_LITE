import { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device, State } from "react-native-ble-plx";
import { studentAttendanceRepository } from "@/services/supabase/studentAttendanceRepository";

const ATTENDANCE_BEACON_UUID = "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0";

// 🎯 LARGE CLASSROOM SETTINGS
const RSSI_INSIDE_THRESHOLD = -85; // Covers the whole room
const EXIT_DEBOUNCE_MS = 12000; // 12 seconds delay before marking out
const SCAN_TICK_MS = 2000; 
const BEACON_TIMEOUT_MS = 15000; // 15 seconds of no signal = lost

export type ScannerState = {
  scanning: boolean;
  rssi: number | null;
  inside: boolean;
  lastEvent: string | null;
  error: string | null;
};

async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const apiLevel = parseInt(Platform.Version.toString(), 10);
    if (apiLevel >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return (
        result["android.permission.BLUETOOTH_SCAN"] === PermissionsAndroid.RESULTS.GRANTED &&
        result["android.permission.BLUETOOTH_CONNECT"] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    return false;
  }
}

export function useBeaconScanner(
  sessionId: string | null,
  studentId: string | null
) {
  const [state, setState] = useState<ScannerState>({
    scanning: false, rssi: null, inside: false, lastEvent: null, error: null,
  });

  const lastRssiRef = useRef<number | null>(null);
  const lastSeenAtRef = useRef<number | null>(null);
  const weakSinceRef = useRef<number | null>(null);
  const insideRef = useRef(false);

  useEffect(() => {
    if (!sessionId || !studentId) return;

    let cancelled = false;
    let destroyed = false;
    const manager = new BleManager();
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    async function startScan() {
      try {
        const granted = await ensureBluetoothPermissions();
        if (cancelled || !granted) return;

        await new Promise<void>((resolve, reject) => {
          const sub = manager.onStateChange((state) => {
            if (state === State.PoweredOn) { sub.remove(); resolve(); } 
            else if (state === State.Unsupported || state === State.Unauthorized) { sub.remove(); reject(new Error(`BT State: ${state}`)); }
          }, true);
        });

        if (cancelled) return;

        // 🎯 SCAN EXACTLY FOR THE LECTURER'S UUID
        manager.startDeviceScan(
          [ATTENDANCE_BEACON_UUID], 
          { allowDuplicates: true },
          (error, device: Device | null) => {
            if (cancelled || destroyed) return;
            if (error) {
              setState((s) => ({ ...s, error: error.message }));
              return;
            }
            
            if (device && device.rssi != null) {
              lastRssiRef.current = device.rssi;
              lastSeenAtRef.current = Date.now();
              setState((s) => ({ ...s, rssi: device.rssi, scanning: true, error: null }));
            }
          }
        );

        setState((s) => ({ ...s, scanning: true, error: null }));

        tickTimer = setInterval(async () => {
          if (cancelled || destroyed) return;

          const now = Date.now();
          const rssi = lastRssiRef.current;
          const lastSeen = lastSeenAtRef.current;
          
          const beaconLost = lastSeen == null || now - lastSeen > BEACON_TIMEOUT_MS;
          const isInside = !beaconLost && rssi != null && rssi >= RSSI_INSIDE_THRESHOLD;
          const wasInside = insideRef.current;

          if (isInside) {
            weakSinceRef.current = null;
            if (!wasInside) {
              insideRef.current = true;
              setState((s) => ({ ...s, inside: true }));

              const last = await studentAttendanceRepository.getLastEventForStudent(sessionId!, studentId!);
              const type = last && (last.eventType === "exit" || last.eventType === "emergency") ? "re_entry" : "check_in";

              await studentAttendanceRepository.logPresence(sessionId!, studentId!, type, rssi);
              setState((s) => ({ ...s, lastEvent: type }));
              console.log(`[scanner] INSIDE (RSSI ${rssi}): logged ${type}`);
            }
          } else {
            if (weakSinceRef.current == null) {
              weakSinceRef.current = now;
            } else if (now - weakSinceRef.current > EXIT_DEBOUNCE_MS) {
              if (wasInside) {
                insideRef.current = false;
                setState((s) => ({ ...s, inside: false }));
                
                await studentAttendanceRepository.logPresence(sessionId!, studentId!, "exit", rssi);
                setState((s) => ({ ...s, lastEvent: "exit" }));
                console.log(`[scanner] OUTSIDE (RSSI ${rssi}): logged exit`);
              }
              weakSinceRef.current = null;
            }
          }
        }, SCAN_TICK_MS);
      } catch (e: any) {
        if (!cancelled && !destroyed) setState((s) => ({ ...s, error: e?.message }));
      }
    }

    startScan();

    return () => {
      cancelled = true;
      if (tickTimer) clearInterval(tickTimer);
      (async () => {
        try { manager.stopDeviceScan(); } catch {}
        await new Promise((r) => setTimeout(r, 250));
        try { manager.destroy(); } catch {}
        destroyed = true;
      })();
    };
  }, [sessionId, studentId]);

  return state;
}