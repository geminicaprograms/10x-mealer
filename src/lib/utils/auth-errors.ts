/**
 * Mapping of Supabase Auth error messages to user-friendly Polish messages.
 *
 * These messages are shown to users when authentication operations fail.
 * The keys are the exact error messages returned by Supabase Auth.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Login errors
  "Invalid login credentials": "Nieprawidłowy email lub hasło",
  "Email not confirmed": "Email nie został potwierdzony. Sprawdź swoją skrzynkę.",

  // Registration errors
  "User already registered": "Ten email jest już zarejestrowany",
  "Password should be at least 6 characters": "Hasło jest za krótkie",

  // Rate limiting
  "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie później.",
  "For security purposes, you can only request this once every 60 seconds":
    "Ze względów bezpieczeństwa możesz wysłać kolejną prośbę za 60 sekund.",

  // Session errors
  "Auth session missing!": "Sesja wygasła. Zaloguj się ponownie.",
  "Invalid Refresh Token: Refresh Token Not Found": "Sesja wygasła. Zaloguj się ponownie.",
};

/**
 * Network error message shown when connection to server fails.
 */
const NETWORK_ERROR_MESSAGE = "Brak połączenia z serwerem. Sprawdź połączenie internetowe.";

/**
 * Fallback error message for unmapped errors.
 */
const FALLBACK_ERROR_MESSAGE = "Wystąpił błąd. Spróbuj ponownie później.";

/**
 * Maps a Supabase Auth error to a user-friendly Polish message.
 *
 * @param error - Error object from Supabase Auth operation
 * @returns Polish error message suitable for displaying to users
 *
 * @example
 * ```typescript
 * const { error } = await supabase.auth.signInWithPassword({ email, password });
 * if (error) {
 *   setServerError(mapAuthError(error));
 * }
 * ```
 */
export function mapAuthError(error: Error | null): string {
  if (!error) {
    return FALLBACK_ERROR_MESSAGE;
  }

  // Check for network errors
  if (error.message.includes("fetch") || error.message.includes("network")) {
    return NETWORK_ERROR_MESSAGE;
  }

  // Look up mapped message
  const mappedMessage = AUTH_ERROR_MESSAGES[error.message];
  if (mappedMessage) {
    return mappedMessage;
  }

  // Log unmapped errors for debugging (helps identify new error messages to map)
  console.error("Unmapped auth error:", error.message);

  return FALLBACK_ERROR_MESSAGE;
}

/**
 * Checks if an error is a rate limit error.
 *
 * @param error - Error object from Supabase Auth operation
 * @returns true if the error is related to rate limiting
 */
export function isRateLimitError(error: Error | null): boolean {
  if (!error) return false;

  return (
    error.message.includes("rate limit") || error.message.includes("too many") || error.message.includes("once every")
  );
}
