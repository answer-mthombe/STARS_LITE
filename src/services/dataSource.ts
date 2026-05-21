/**
 * Single switch for mock vs Supabase integration (JOB-027).
 * Screens must not read this directly — branch inside services only.
 */
export type DataSource = "mock" | "supabase";

export function getDataSource(): DataSource {
  const v = process.env.EXPO_PUBLIC_DATA_SOURCE;
  return v === "supabase" ? "supabase" : "mock";
}

export function isSupabaseDataSource(): boolean {
  return getDataSource() === "supabase";
}
