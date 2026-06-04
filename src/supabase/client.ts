import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Anon Key Exists:", Boolean(supabaseAnonKey));


function hasMinimumConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let client: SupabaseClient | undefined;

/** Returns `undefined` when env is not configured (mock-only runs). */
export function tryGetSupabaseClient(): SupabaseClient | undefined {
  if (!hasMinimumConfig()) return undefined;
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function requireSupabaseClient(): SupabaseClient {
  const c = tryGetSupabaseClient();
  if (!c) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return c;
}
