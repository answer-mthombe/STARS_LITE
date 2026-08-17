export interface AuthErrorLike {
  message?: string;
  error_description?: string;
  status?: number;
  code?: string;
}

/**
 * Translates Supabase / GoTrue error codes into user-friendly messages.
 * Prevents exposing raw API/database exceptions to end-users.
 */
export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) return "";

  // Extract code and messages, checking standard and alternative properties
  const errorCode = error.code || "";
  const errorMessage = (error.message || error.error_description || "").toLowerCase();

  // 1. Rate Limiting Check
  if (
    errorCode === "over_rate_limit" ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests") ||
    errorMessage.includes("over_rate_limit")
  ) {
    return "Too many attempts. Please try again later.";
  }

  // 2. Invalid Credentials Check (Handles Supabase's exact phrases)
  if (
    errorCode === "invalid_credentials" ||
    errorCode === "bad_request" ||
    errorMessage.includes("invalid login credentials") ||
    errorMessage.includes("invalid grant") ||
    errorMessage.includes("invalid claim") ||
    errorMessage.includes("login details") ||
    errorMessage.includes("invalid email or password")
  ) {
    return "Incorrect email or password. Please verify your credentials and try again.";
  }

  // 3. Email Not Confirmed Check
  if (
    errorCode === "email_not_confirmed" ||
    errorMessage.includes("email not confirmed") ||
    errorMessage.includes("confirm your email") ||
    errorMessage.includes("email not verified")
  ) {
    return "Your institutional email address has not been verified yet. Please check your inbox for the activation link.";
  }

  // 4. Network / Offline Check
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("offline") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("network request failed")
  ) {
    return "Network error. Check your connection.";
  }

  // 5. Account Exists Check (Handy for registration flows)
  if (
    errorCode === "user_already_exists" ||
    errorCode === "email_exists" ||
    errorMessage.includes("already registered") ||
    errorMessage.includes("user already exists")
  ) {
    return "An account with this email address already exists. Please sign in instead.";
  }

  // 6. User Not Found Check
  if (
    errorCode === "user_not_found" ||
    errorMessage.includes("user not found")
  ) {
    return "No account exists with this email address.";
  }

  // 7. Weak Password Check
  if (
    errorCode === "weak_password" ||
    errorMessage.includes("password should be at least") ||
    errorMessage.includes("weak password")
  ) {
    return "Your password is too weak. Please use at least 6 characters including numbers and symbols.";
  }

  // 8. Unknown Fallback
  return "Something went wrong. Please try again.";
}