import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  session_id: string;
  device_id: string;
  gps_bucket_hash: string;
  time_bucket: number;
  client_seed: string;
  tapped_index: number;
  expected_object: number;
  latitude: number;
  longitude: number;
  target_latitude: number;
  target_longitude: number;
  max_radius_meters?: number;
  tier?: string;
}

// Haversine formula to calculate distance in meters between two GPS coordinates
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute SHA-256 hash matching client-side generation
async function computeSeed(
  sessionId: string,
  deviceId: string,
  gpsHash: string,
  timeBucket: number
): Promise<string> {
  const rawData = `${sessionId}:${deviceId}:${gpsHash}:${timeBucket}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(rawData);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: VerifyRequest = await req.json();
    const {
      session_id,
      device_id,
      gps_bucket_hash,
      time_bucket,
      client_seed,
      tapped_index,
      expected_object,
      latitude,
      longitude,
      target_latitude,
      target_longitude,
      max_radius_meters = 50, // default 50 meters radius threshold
      tier = "standard",
    } = payload;

    // 1. Recompute and verify cryptographic seed
    const serverSeed = await computeSeed(
      session_id,
      device_id,
      gps_bucket_hash,
      time_bucket
    );
    const isSeedValid = serverSeed === client_seed;

    // 2. Check object/tapped_index verification
    const isObjectValid = tapped_index === expected_object;

    // 3. Verify GPS distance within radius
    const distanceMeters = calculateDistanceMeters(
      latitude,
      longitude,
      target_latitude,
      target_longitude
    );
    const isWithinRadius = distanceMeters <= max_radius_meters;

    // 4. Plausibility check per tier (e.g., strict distance limits for high security tiers)
    let isPlausible = true;
    if (tier === "strict" && distanceMeters > 20) {
      isPlausible = false;
    }

    // Server makes the final decision
    const passed = isSeedValid && isObjectValid && isWithinRadius && isPlausible;

    return new Response(
      JSON.stringify({
        passed,
        checks: {
          seed_valid: isSeedValid,
          object_valid: isObjectValid,
          within_radius: isWithinRadius,
          distance_meters: Math.round(distanceMeters * 100) / 100,
          plausible: isPlausible,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});