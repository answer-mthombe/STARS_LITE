// src/utils/supabase/mapAuthError.ts

export interface AuthErrorLike {
  message?: string;
  status?: number;
  code?: string;
}

/**
 * Translates Supabase / GoTrue error codes into user-friendly messages.
 * Prevents exposing raw API/database exceptions to end-users.
 */
export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) return "";

  // Check common Supabase error codes or message snippets
  const errorCode = error.code || "";
  const errorMessage = error.message?.toLowerCase() || "";

  switch (errorCode) {
    case "weak_password":
      return "Your password is too weak. Please use at least 6 characters including numbers and symbols.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email address already exists. Please sign in instead.";
    case "bad_request":
      return "Invalid registration data. Please ensure your student number is correct.";
    case "invalid_credentials":
      return "Incorrect email or password. Please verify your credentials and try again.";
    case "email_not_confirmed":
      return "Your institutional email address has not been verified yet. Please check your inbox for the activation link.";
    case "user_not_found":
      return "No account exists with this email address.";
    case "invalid_grant":
      return "Invalid login credentials provided.";
    default:
      break;
  }

  // Fallback checks using message strings if error code is missing
if (errorMessage.includes("already registered") || errorMessage.includes("user already exists")) {
    return "This student number/email is already registered.";
  }
  if (errorMessage.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }
  if (errorMessage.includes("email") && errorMessage.includes("valid")) {
    return "Please provide a valid institutional email address.";                  // ⬆ for registration, ⬇ for login
  }

  if (errorMessage.includes("invalid claim") || errorMessage.includes("login details")) {
    return "The login credentials provided are invalid.";
  }
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }
  if (errorMessage.includes("rate limit") || error.status === 429) {
    return "Too many attempts. Please wait a few minutes before trying to sign in again.";
  }

  // Final fallback safe error
  return error.message || "An unexpected error occurred during authentication. Please contact support.";
}