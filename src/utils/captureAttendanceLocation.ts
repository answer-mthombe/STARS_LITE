import { Platform } from "react-native";
import * as Location from "expo-location";

export type AttendanceFix = {
  latitude: number;
  longitude: number;
  /** Reported horizontal accuracy in metres (server rejects if too coarse). */
  accuracyMeters: number;
  /** When the fix was taken (server rejects stale fixes). */
  capturedAtMs: number;
};

/**
 * One real location fix for an attendance attempt — with accuracy + timestamp so
 * the SERVER can enforce the mandatory geofence and GPS-quality gates. There is
 * no fake fallback: if the location can't be obtained, attendance can't proceed
 * (the caller surfaces the error). See ATTENDANCE_SECURITY_ARCHITECTURE.md §5.
 */
export async function captureAttendanceLocation(): Promise<AttendanceFix> {
  if (Platform.OS === "web") {
    const geo = (globalThis as any)?.navigator?.geolocation;
    if (!geo) throw new Error("Location isn't available in this browser.");
    return await new Promise<AttendanceFix>((resolve, reject) => {
      geo.getCurrentPosition(
        (pos: any) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy ?? 9999,
            capturedAtMs: pos.timestamp ?? Date.now(),
          }),
        (err: any) =>
          reject(new Error(err?.code === 1 ? "Location permission was denied." : "We couldn't get your location.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission is required for attendance.");
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracyMeters: pos.coords.accuracy ?? 9999,
    capturedAtMs: pos.timestamp ?? Date.now(),
  };
}
