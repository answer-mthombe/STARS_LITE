import * as LocalAuthentication from "expo-local-authentication";

import { getOrCreateDeviceId } from "@/utils/deviceId";
import { isSupabaseEnabled } from "@/supabase/client";
import { biometricRepository } from "@/services/supabase/biometricRepository";

/**
 * Fingerprint only for now. When face verification is added later, flip this
 * to false (and pass "face" where the method is recorded).
 */
const FINGERPRINT_ONLY = true;

export type PromptResult = { ok: true } | { ok: false; message: string };

/** Turn a Supabase/Postgres error into something a student can act on. */
function friendlyServerError(e: unknown): string {
  const raw =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e && "message" in e
        ? String((e as any).message)
        : "";

  if (raw.includes("NOT_AUTHENTICATED")) return "Please sign in again.";
  if (raw.includes("NOT_STUDENT")) return "Only student accounts can register a fingerprint.";
  return raw || "Something went wrong. Check your connection and try again.";
}

/** Does this phone have a fingerprint sensor with at least one finger registered? */
export async function checkFingerprintAvailability(): Promise<PromptResult> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return { ok: false, message: "This phone has no fingerprint sensor." };
  }

  if (FINGERPRINT_ONLY) {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (!types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return { ok: false, message: "This phone doesn't support fingerprint verification." };
    }
  }

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    return {
      ok: false,
      message: "No fingerprint is set up on this phone. Add one in Settings > Security > Fingerprints, then try again.",
    };
  }

  return { ok: true };
}

/** Show the phone's own fingerprint prompt. No PIN/pattern fallback. */
export async function promptFingerprint(promptMessage: string): Promise<PromptResult> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    disableDeviceFallback: true,
    // Android: only accept strong biometrics (fingerprint), not weak face unlock.
    biometricsSecurityLevel: "strong",
  } as LocalAuthentication.LocalAuthenticationOptions);

  if (result.success) return { ok: true };

  switch (result.error) {
    case "user_cancel":
    case "system_cancel":
    case "app_cancel":
      return { ok: false, message: "Fingerprint check cancelled." };
    case "lockout":
      return { ok: false, message: "Too many wrong attempts. Wait 30 seconds and try again." };
    case "not_enrolled":
      return { ok: false, message: "No fingerprint is set up on this phone." };
    default:
      return { ok: false, message: "Fingerprint not recognised. Try again." };
  }
}

/** Availability check + prompt. Used at sign-up, before the account exists. */
export async function confirmFingerprintOnDevice(promptMessage: string): Promise<PromptResult> {
  const available = await checkFingerprintAvailability();
  if (!available.ok) return available;
  return promptFingerprint(promptMessage);
}

/**
 * Save the enrolment record (needs a signed-in student).
 * Call this AFTER sign-up has created the account.
 */
export async function saveFingerprintEnrolment(): Promise<void> {
  const deviceId = await getOrCreateDeviceId();
  await biometricRepository.enroll(deviceId, "fingerprint");
}

/**
 * Is a fingerprint registration on record for the signed-in student?
 * Returns null when it can't be checked (offline, Supabase off) so callers
 * can carry on with just the phone's own fingerprint prompt.
 */
export async function getFingerprintEnrolled(): Promise<boolean | null> {
  if (!isSupabaseEnabled()) return null;
  try {
    const status = await biometricRepository.getStatus();
    return status.enrolled;
  } catch {
    return null;
  }
}

/** Prompt + save enrolment. Used by the lock screen when a student has no registration on record. */
export async function registerFingerprintNow(): Promise<PromptResult> {
  const checked = await confirmFingerprintOnDevice("Register your fingerprint for STARS");
  if (!checked.ok) return checked;

  try {
    await saveFingerprintEnrolment();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: friendlyServerError(e) };
  }
}
