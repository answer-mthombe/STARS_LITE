
import { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device, State } from "react-native-ble-plx";

import { studentAttendanceRepository } from "@/services/supabase/studentAttendanceRepository";

// ============================================
// STARS BEACON CONFIGURATION
// ============================================

const BEACON_NAME = "STARS_Beacon";

const BEACON_UUID = "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0";
const BEACON_MAJOR = 1;
const BEACON_MINOR = 1;

const RSSI_INSIDE_THRESHOLD = -60;

const EXIT_DEBOUNCE_MS = 12000;
const BEACON_TIMEOUT_MS = 15000;
const SCAN_TICK_MS = 2000;

const INITIAL_RESTART_DELAY_MS = 3000;
const MAX_RESTART_DELAY_MS = 15000;

const ADVERTISEMENT_WATCHDOG_MS = 45000;
const POST_RECOVERY_GRACE_MS = 15000;

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// ============================================
// TYPES
// ============================================

export type ScannerState = {
  scanning: boolean;
  rssi: number | null;
  inside: boolean;
  lastEvent: string | null;
  error: string | null;
};

// ============================================
// BASE64 DECODER
// ============================================

function decodeBase64(value: string): number[] {
  const bytes: number[] = [];

  let buffer = 0;
  let bits = 0;

  for (const character of value) {
    if (character === "=") break;

    const digit = BASE64_CHARS.indexOf(character);

    if (digit < 0) continue;

    buffer = (buffer << 6) | digit;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return bytes;
}

// ============================================
// IDENTIFY THE ACTUAL STARS IBEACON
// ============================================

function matchesStarsBeacon(device: Device): boolean {
  const deviceName = (
    device.name ||
    device.localName ||
    ""
  ).trim();

  // Name is a secondary matching method.
  if (deviceName === BEACON_NAME) {
    return true;
  }

  if (!device.manufacturerData) {
    return false;
  }

  try {
    const bytes = decodeBase64(device.manufacturerData);

    // iBeacon manufacturer data:
    // 4C 00 = Apple company identifier
    // 02 = iBeacon type
    // 15 = iBeacon data length
    if (
      bytes.length < 25 ||
      bytes[0] !== 0x4c ||
      bytes[1] !== 0x00 ||
      bytes[2] !== 0x02 ||
      bytes[3] !== 0x15
    ) {
      return false;
    }

    const expectedUuid = BEACON_UUID.replace(/-/g, "").toLowerCase();

    const actualUuid = bytes
      .slice(4, 20)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    if (actualUuid !== expectedUuid) {
      return false;
    }

    const major = (bytes[20] << 8) | bytes[21];
    const minor = (bytes[22] << 8) | bytes[23];

    return major === BEACON_MAJOR && minor === BEACON_MINOR;
  } catch (error) {
    console.warn("[STARS] Beacon manufacturer data error:", error);
    return false;
  }
}

// ============================================
// ANDROID PERMISSIONS
// ============================================

async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }

  try {
    const apiLevel = Number(Platform.Version);

    if (apiLevel >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      return (
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error("[STARS] Permission error:", error);
    return false;
  }
}

// ============================================
// MAIN BEACON SCANNER
// ============================================

export function useBeaconScanner(
  activeSessionId: string | null,
  studentId: string | null
) {
  const [state, setState] = useState<ScannerState>({
    scanning: false,
    rssi: null,
    inside: false,
    lastEvent: null,
    error: null,
  });

  const lastRssiRef = useRef<number | null>(null);
  const lastSeenAtRef = useRef<number | null>(null);

  const weakSinceRef = useRef<number | null>(null);

  const insideRef = useRef(false);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!activeSessionId || !studentId) {
      setState({
        scanning: false,
        rssi: null,
        inside: false,
        lastEvent: null,
        error: null,
      });

      return;
    }

    const sessionId = activeSessionId;
    const currentStudentId = studentId;

    let cancelled = false;

    // The current manager can be replaced during recovery.
    let manager: BleManager | null = null;

    let scanOperational = false;
    let startInProgress = false;

    let generation = 0;

    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    let stateSubscription: { remove: () => void } | null = null;

    let lastAnyAdvertisementAt: number | null = null;
    let lastLoggedDevice = 0;

    let scanResumedAt = 0;

    let restartDelay = INITIAL_RESTART_DELAY_MS;

    // Reset session state.
    lastRssiRef.current = null;
    lastSeenAtRef.current = null;
    weakSinceRef.current = null;

    insideRef.current = false;
    processingRef.current = false;

    setState({
      scanning: false,
      rssi: null,
      inside: false,
      lastEvent: null,
      error: null,
    });

    // ========================================
    // MANAGER CLEANUP
    // ========================================

    function disposeCurrentManager() {
      const oldManager = manager;

      // Remove the reference BEFORE destroying it.
      // This prevents another operation from reusing it.
      manager = null;

      scanOperational = false;

      if (stateSubscription) {
        try {
          stateSubscription.remove();
        } catch (error) {
          console.warn("[STARS] State listener cleanup:", error);
        }

        stateSubscription = null;
      }

      if (oldManager) {
        try {
          oldManager.stopDeviceScan();
        } catch {
          // The manager may already have stopped.
        }

        try {
          oldManager.destroy();
        } catch (error) {
          console.warn("[STARS] Manager cleanup warning:", error);
        }
      }
    }

    // ========================================
    // CHECK WHETHER AN OPERATION IS CURRENT
    // ========================================

    function isCurrent(
      currentManager: BleManager,
      currentGeneration: number
    ): boolean {
      return (
        !cancelled &&
        manager === currentManager &&
        generation === currentGeneration
      );
    }

    // ========================================
    // WAIT FOR BLUETOOTH
    // ========================================

    async function waitForBluetooth(
      currentManager: BleManager,
      currentGeneration: number
    ): Promise<void> {
      const currentState = await currentManager.state();

      if (!isCurrent(currentManager, currentGeneration)) {
        throw new Error("Scanner startup cancelled.");
      }

      if (currentState === State.PoweredOn) {
        return;
      }

      if (
        currentState === State.Unsupported ||
        currentState === State.Unauthorized
      ) {
        throw new Error(`Bluetooth unavailable: ${currentState}`);
      }

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        let timeout: ReturnType<typeof setTimeout> | null = null;

        let subscription: { remove: () => void } | null = null;

        const finish = (error?: Error) => {
          if (settled) return;

          settled = true;

          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }

          subscription?.remove();
          subscription = null;

          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };

        timeout = setTimeout(() => {
          finish(new Error("Timed out waiting for Bluetooth."));
        }, 20000);

        subscription = currentManager.onStateChange(
          (bluetoothState) => {
            if (!isCurrent(currentManager, currentGeneration)) {
              finish(new Error("Scanner startup cancelled."));
              return;
            }

            if (bluetoothState === State.PoweredOn) {
              finish();
            } else if (
              bluetoothState === State.Unsupported ||
              bluetoothState === State.Unauthorized
            ) {
              finish(
                new Error(`Bluetooth unavailable: ${bluetoothState}`)
              );
            }
          },
          true
        );
      });
    }

    // ========================================
    // AUTOMATIC RECOVERY
    // ========================================

    function scheduleRecovery(reason: string) {
      if (cancelled || restartTimer) {
        return;
      }

      console.warn("[STARS] Scheduling scanner recovery:", reason);

      // Invalidate every callback belonging to the old manager.
      generation++;

      // Destroy old manager. Recovery will create a NEW one.
      disposeCurrentManager();

      // A scanner failure is not proof that the student left.
      weakSinceRef.current = null;

      setState((previous) => ({
        ...previous,
        scanning: false,
        error: reason,
      }));

      const delay = restartDelay;

      restartDelay = Math.min(
        restartDelay * 2,
        MAX_RESTART_DELAY_MS
      );

      restartTimer = setTimeout(() => {
        restartTimer = null;

        if (!cancelled) {
          console.log("[STARS] Recovering BLE scanner...");
          void startScan();
        }
      }, delay);
    }

    // ========================================
    // BLUETOOTH STATE MONITOR
    // ========================================

    function monitorBluetoothState(
      currentManager: BleManager,
      currentGeneration: number
    ) {
      stateSubscription?.remove();

      stateSubscription = currentManager.onStateChange(
        (bluetoothState) => {
          if (!isCurrent(currentManager, currentGeneration)) {
            return;
          }

          console.log("[STARS] Bluetooth state:", bluetoothState);

          if (
            bluetoothState === State.PoweredOff ||
            bluetoothState === State.Unauthorized ||
            bluetoothState === State.Unsupported
          ) {
            scheduleRecovery(
              `Bluetooth state changed: ${bluetoothState}`
            );

            return;
          }

          if (
            bluetoothState === State.PoweredOn &&
            !scanOperational &&
            !startInProgress &&
            !restartTimer
          ) {
            scheduleRecovery("Bluetooth became available again.");
          }
        },
        true
      );
    }

    // ========================================
    // START SCANNING
    // ========================================

    async function startScan(): Promise<void> {
      if (cancelled || startInProgress || scanOperational) {
        return;
      }

      startInProgress = true;

      try {
        console.log("[STARS] Checking Bluetooth permissions...");

        const granted = await ensureBluetoothPermissions();

        if (cancelled) return;

        if (!granted) {
          throw new Error(
            "Bluetooth permissions were not granted. Enable them in Android settings."
          );
        }

        // Always create a fresh manager when no manager exists.
        if (!manager) {
          manager = new BleManager();
        }

        const currentManager = manager;
        const currentGeneration = ++generation;

        monitorBluetoothState(
          currentManager,
          currentGeneration
        );

        console.log("[STARS] Waiting for Bluetooth...");

        await waitForBluetooth(
          currentManager,
          currentGeneration
        );

        if (!isCurrent(currentManager, currentGeneration)) {
          return;
        }

        console.log("[STARS] Bluetooth ready.");
        console.log("[STARS] Looking for STARS iBeacon...");

        lastAnyAdvertisementAt = Date.now();

        currentManager.startDeviceScan(
          null,
          { allowDuplicates: true },
          (error, device: Device | null) => {
            if (
              !isCurrent(currentManager, currentGeneration)
            ) {
              return;
            }

            if (error) {
              console.error(
                "[STARS] BLE scan error:",
                error.message
              );

              scheduleRecovery(error.message);
              return;
            }

            if (!device) {
              return;
            }

            lastAnyAdvertisementAt = Date.now();

            if (device.rssi == null) {
              return;
            }

            const deviceName = (
              device.name ||
              device.localName ||
              ""
            ).trim();

            if (Date.now() - lastLoggedDevice > 5000) {
              console.log("[STARS] BLE DEVICE:", {
                id: device.id,
                name: device.name,
                localName: device.localName,
                rssi: device.rssi,
                hasManufacturerData: !!device.manufacturerData,
              });

              lastLoggedDevice = Date.now();
            }

            // Match using the actual iBeacon UUID, major and minor.
            // The device name is only a secondary matching method.
            if (!matchesStarsBeacon(device)) {
              return;
            }

            const rssi = device.rssi;
            const now = Date.now();

            lastRssiRef.current = rssi;
            lastSeenAtRef.current = now;

            console.log(
              `[STARS] STARS BEACON FOUND: ${deviceName || "iBeacon"}, RSSI: ${rssi}`
            );

            setState((previous) => ({
              ...previous,
              scanning: true,
              rssi,
              error: null,
            }));
          }
        );

        if (!isCurrent(currentManager, currentGeneration)) {
          try {
            currentManager.stopDeviceScan();
          } catch {
            // Manager may already be disposed.
          }

          return;
        }

        scanOperational = true;
        scanResumedAt = Date.now();

        // Reset the retry delay after a successful scan start.
        restartDelay = INITIAL_RESTART_DELAY_MS;

        setState((previous) => ({
          ...previous,
          scanning: true,
          error: null,
        }));

        console.log("[STARS] BLE scanner started successfully.");
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "An unexpected Bluetooth error occurred.";

        if (cancelled) return;

        console.error("[STARS] Scanner startup failed:", message);

        setState((previous) => ({
          ...previous,
          scanning: false,
          error: message,
        }));

        const lowerMessage = message.toLowerCase();

        // Do not repeatedly request permissions.
        if (
          lowerMessage.includes("permission") ||
          lowerMessage.includes("unauthorized") ||
          lowerMessage.includes("unsupported")
        ) {
          disposeCurrentManager();
          return;
        }

        scheduleRecovery(message);
      } finally {
        startInProgress = false;
      }
    }

    // ========================================
    // ATTENDANCE MONITOR
    // ========================================

    function startAttendanceMonitor() {
      if (tickTimer) {
        clearInterval(tickTimer);
      }

      tickTimer = setInterval(async () => {
        if (
          cancelled ||
          processingRef.current ||
          !scanOperational
        ) {
          return;
        }

        const now = Date.now();

        // --------------------------------
        // SCANNER HEALTH WATCHDOG
        // --------------------------------

        if (
          lastAnyAdvertisementAt !== null &&
          now - lastAnyAdvertisementAt >
            ADVERTISEMENT_WATCHDOG_MS
        ) {
          scheduleRecovery(
            "No Bluetooth advertisements received. Restarting scanner."
          );

          return;
        }

        const rssi = lastRssiRef.current;
        const lastSeen = lastSeenAtRef.current;

        const beaconLost =
          lastSeen === null ||
          now - lastSeen > BEACON_TIMEOUT_MS;

        const isInside =
          !beaconLost &&
          rssi !== null &&
          rssi >= RSSI_INSIDE_THRESHOLD;

        const wasInside = insideRef.current;

        // --------------------------------
        // PROTECT AGAINST RECOVERY FALSE EXITS
        // --------------------------------

        if (
          wasInside &&
          beaconLost &&
          now - scanResumedAt < POST_RECOVERY_GRACE_MS
        ) {
          return;
        }

        // --------------------------------
        // STUDENT CHECK-IN / RE-ENTRY
        // --------------------------------

        if (isInside && !wasInside && rssi !== null) {
          processingRef.current = true;

          try {
            console.log("[STARS] Processing check-in...");

            const last =
              await studentAttendanceRepository.getLastEventForStudent(
                sessionId,
                currentStudentId
              );

            if (cancelled) return;

            const eventType =
              last?.eventType === "exit" ||
              last?.eventType === "emergency"
                ? "re_entry"
                : "check_in";

            await studentAttendanceRepository.logPresence(
              sessionId,
              currentStudentId,
              eventType,
              rssi
            );

            if (cancelled) return;

            insideRef.current = true;
            weakSinceRef.current = null;

            setState((previous) => ({
              ...previous,
              inside: true,
              scanning: true,
              rssi,
              lastEvent: eventType,
              error: null,
            }));

            console.log(
              `[STARS] CHECK-IN SUCCESS: ${eventType}, RSSI: ${rssi}`
            );
          } catch (error: unknown) {
            const message =
              error instanceof Error
                ? error.message
                : "Unable to record attendance.";

            if (!cancelled) {
              setState((previous) => ({
                ...previous,
                error: message,
              }));
            }

            console.error("[STARS] Check-in failed:", message);
          } finally {
            processingRef.current = false;
          }

          return;
        }

        // --------------------------------
        // STUDENT EXIT MONITORING
        // --------------------------------

        if (!isInside) {
          if (weakSinceRef.current === null) {
            weakSinceRef.current = now;
          }

          const weakDuration =
            now - weakSinceRef.current;

          if (
            wasInside &&
            weakDuration >= EXIT_DEBOUNCE_MS
          ) {
            processingRef.current = true;

            try {
              console.log("[STARS] Processing confirmed exit...");

              await studentAttendanceRepository.logPresence(
                sessionId,
                currentStudentId,
                "exit",
                rssi ?? -100
              );

              if (cancelled) return;

              insideRef.current = false;
              weakSinceRef.current = null;

              setState((previous) => ({
                ...previous,
                inside: false,
                scanning: true,
                lastEvent: "exit",
                error: null,
              }));

              console.log("[STARS] CHECK-OUT SUCCESS.");
            } catch (error: unknown) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Unable to record student exit.";

              if (!cancelled) {
                setState((previous) => ({
                  ...previous,
                  error: message,
                }));
              }

              console.error("[STARS] Exit failed:", message);
            } finally {
              processingRef.current = false;
            }
          }
        } else {
          // Beacon signal recovered.
          weakSinceRef.current = null;
        }
      }, SCAN_TICK_MS);
    }

    // ========================================
    // INITIALIZE
    // ========================================

    startAttendanceMonitor();
    void startScan();

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      console.log("[STARS] Stopping scanner...");

      cancelled = true;
      generation++;

      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }

      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }

      disposeCurrentManager();

      console.log("[STARS] Scanner cleanup completed.");
    };
  }, [activeSessionId, studentId]);

  return state;
}
