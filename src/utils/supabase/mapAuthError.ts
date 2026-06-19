// src/utils/supabase/mapAuthError.ts
// JOB-008: Clear login error mapping

export type AuthErrorCode =
  | "invalid_login_credentials"
  | "email_not_confirmed"
  | "network_error"
  | "unknown_error";

export function mapAuthError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "An unexpected error occurred. Please try again.";
  }

  const err = error as { message?: string; status?: number };

  // Supabase returns "Invalid login credentials" for wrong password/email
  if (err.message?.toLowerCase().includes("invalid login credentials")) {
    return "Wrong email or password. Please try again.";
  }

  // Email not confirmed
  if (err.message?.toLowerCase().includes("email not confirmed")) {
    return "Your email is not confirmed. Please check your inbox.";
  }

  // Network issues
  if (err.message?.toLowerCase().includes("fetch") || err.status === 0) {
    return "Network error. Please check your internet connection.";
  }

  // Default fallback
  return "Login failed. Please try again later.";
}
