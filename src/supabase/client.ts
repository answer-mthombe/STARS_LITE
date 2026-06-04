import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const dataSource = process.env.EXPO_PUBLIC_DATA_SOURCE;


// function hasMinimumConfig(): boolean {
//   return Boolean(supabaseUrl && supabaseAnonKey);
// }

console.log("Supabase URL:", supabaseUrl);
console.log("Anon Key Exists:", Boolean(supabaseAnonKey));


function hasMinimumConfig(): boolean {
  return dataSource === 'supabase' && Boolean(supabaseUrl && supabaseAnonKey);
}

export function isSupabaseEnabled(): boolean {
  return hasMinimumConfig();
}

let client: SupabaseClient | undefined;

/** Returns `undefined` when env is not configured (mock-only runs). */
export function tryGetSupabaseClient(): SupabaseClient | undefined {
  if (!hasMinimumConfig()) return undefined;
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,   // this tells supabase to use AsyncStorage for storing the session, which is necessary in React Native
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
"Supabase is not configured. Check your .env file and ensure EXPO_PUBLIC_DATA_SOURCE=supabase."  
  );
  }
  return c;
}
