import { requireSupabaseClient } from "@/supabase/client";

export type BiometricMethod = "fingerprint" | "face";

export type FingerprintStatus = {
  enrolled: boolean;
  method?: BiometricMethod;
  enrolledAt?: string;
};

/**
 * Thin wrappers over the SQL functions in
 * supabase/migrations/20261120090000_fingerprint_enrolment.sql.
 * The server works out WHICH student is calling from the login session,
 * so no student id is ever sent from the phone.
 */
export const biometricRepository = {
  async getStatus(): Promise<FingerprintStatus> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc("get_my_fingerprint_status");
    if (error) throw error;

    return {
      enrolled: Boolean(data?.enrolled),
      method: data?.method ?? undefined,
      enrolledAt: data?.enrolled_at ?? undefined,
    };
  },

  async enroll(deviceId: string, method: BiometricMethod = "fingerprint"): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc("enroll_fingerprint", {
      p_device_id: deviceId,
      p_method: method,
    });
    if (error) throw error;
  },
};
