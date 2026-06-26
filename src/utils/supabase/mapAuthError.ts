// src/services/mapAuthError.ts
export function mapAuthError(error: unknown): string {
  // 🔴 TEMPORARY DEBUG: Let's see exactly what Supabase is sending
  console.log("RAW AUTH ERROR:", error);
  console.log("ERROR MESSAGE STRING:", (error as any).message);

  if (!error || typeof error !== "object") {
    return "Unexpected error occurred. Please try again.";
  }

  const message = (error as any).message?.toLowerCase() || "";
  const code = (error as any).code?.toLowerCase() || ""; // Supabase sometimes provides an error code

  // 1. Invalid Credentials (broadened the check)
  if (message.includes("invalid login") || message.includes("invalid email") || message.includes("credentials")) {
    return "Email or password is incorrect.";
  }
  
  if (message.includes("user not found")) {
    return "No account exists with this email.";
  }
  
  if (message.includes("confirm your email") || message.includes("email not confirmed")) {
    return "Please verify your email before logging in.";
  }
  
  // 2. Enhanced Rate Limiting / Too Many Attempts Check
  if (
    message.includes("rate limit") || 
    message.includes("too many requests") || 
    message.includes("over_rate_limit") ||
    code === "over_rate_limit"
  ) {
    return "Too many attempts. Please try again later.";
  }
  
  if (message.includes("network") || message.includes("fetch failed") || message.includes("offline") || message.includes("failed to fetch")) {
    return "Network error. Check your connection.";
  }

  return "Something went wrong. Please try again.";
}