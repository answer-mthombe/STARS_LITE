import { useEffect, useState } from "react";
import * as Location from "expo-location";

// 🎯 REPLACE THESE WITH YOUR ACTUAL UNIVERSITY COORDINATES
const CAMPUS_LAT = -26.1833; // Example: MUT Campus
const CAMPUS_LON = 28.0667; 
const CAMPUS_RADIUS_METERS = 500; // 500 meters covers the whole campus

export function useCampusGeofence() {
  const [isOnCampus, setIsOnCampus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkLocation() {
      try {
        // 1. Ask for permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) setError("Location permission denied. You must allow location to verify you are on campus.");
          return;
        }

        // 2. Get current GPS position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        // 3. Calculate distance from campus center
        const distance = getDistanceInMeters(
          location.coords.latitude,
          location.coords.longitude,
          CAMPUS_LAT,
          CAMPUS_LON
        );

        if (isMounted) {
          setIsOnCampus(distance <= CAMPUS_RADIUS_METERS);
        }
      } catch (e: any) {
        if (isMounted) setError(e.message ?? "Failed to get location.");
      }
    }

    checkLocation();

    return () => { isMounted = false; };
  }, []);

  return { isOnCampus, error };
}

// Helper to calculate distance between two GPS points
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
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