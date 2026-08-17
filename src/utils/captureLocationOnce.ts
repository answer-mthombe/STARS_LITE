import { Platform } from "react-native";
import * as Location from "expo-location";

/** One-shot location for attendance simulation. Web uses a fixed demo pin. */
export async function captureLocationOnce(): Promise<{ latitude: number; longitude: number }> {
  if (Platform.OS === "web") {
  //  return {"latitude": -29.9701, "longitude": 30.9137} // MUT region — demo only
  return { latitude: -29.9669923, longitude: 30.9134354 };
 //  return { latitude: -29.86005, longitude: 31.02824 };
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission is required for attendance.");
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}
