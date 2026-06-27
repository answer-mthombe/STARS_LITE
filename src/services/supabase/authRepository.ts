import type { User } from "@supabase/supabase-js";

import { requireSupabaseClient } from "@/supabase/client";

import { mapAuthError } from "@/utils/supabase/mapAuthError";


export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Sign-in succeeded but no user was returned.");
  return data.user;
}

export async function signOutSupabase(): Promise<void> {
  const { error } = await requireSupabaseClient().auth.signOut();
  if (error) throw error;
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  const supabase = requireSupabaseClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

