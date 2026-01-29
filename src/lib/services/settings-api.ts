/**
 * Settings API Service
 *
 * Frontend service layer for interacting with settings-related API endpoints.
 * Provides typed methods for profile, AI usage, config, and account operations.
 */

import type {
  ProfileDTO,
  ProfileUpdateCommand,
  AIUsageDTO,
  SystemConfigDTO,
  DeleteAccountCommand,
  DeleteAccountResponseDTO,
  ErrorResponseDTO,
} from "@/types";

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Settings API errors.
 */
export class SettingsApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "SettingsApiError";
  }
}

/**
 * Parses API error response and throws SettingsApiError.
 */
async function handleApiError(response: Response): Promise<never> {
  let errorData: ErrorResponseDTO | null = null;

  try {
    errorData = await response.json();
  } catch {
    // JSON parsing failed, use generic error
  }

  const code = errorData?.error?.code ?? "UNKNOWN_ERROR";
  const message = errorData?.error?.message ?? getDefaultErrorMessage(response.status);
  const details = errorData?.error?.details;

  throw new SettingsApiError(message, code, response.status, details);
}

/**
 * Returns a default error message based on HTTP status code.
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Nieprawidłowe dane wejściowe";
    case 401:
      return "Sesja wygasła. Zaloguj się ponownie.";
    case 403:
      return "Nieprawidłowe hasło lub potwierdzenie";
    case 404:
      return "Element nie został znaleziony";
    case 422:
      return "Nie można przetworzyć danych";
    case 500:
    case 502:
    case 503:
      return "Wystąpił błąd serwera. Spróbuj ponownie.";
    default:
      return "Wystąpił nieoczekiwany błąd";
  }
}

// =============================================================================
// Profile API
// =============================================================================

/**
 * Fetches the current user's profile.
 */
export async function getProfile(): Promise<ProfileDTO> {
  const response = await fetch("/api/profile", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Updates the current user's profile.
 */
export async function updateProfile(data: ProfileUpdateCommand): Promise<ProfileDTO> {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

// =============================================================================
// AI Usage API
// =============================================================================

/**
 * Fetches the current user's AI usage statistics.
 */
export async function getAIUsage(): Promise<AIUsageDTO> {
  const response = await fetch("/api/ai/usage", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

// =============================================================================
// Config API
// =============================================================================

/**
 * Fetches the system configuration.
 */
export async function getConfig(): Promise<SystemConfigDTO> {
  const response = await fetch("/api/config", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

// =============================================================================
// Account API
// =============================================================================

/**
 * Deletes the current user's account.
 */
export async function deleteAccount(data: DeleteAccountCommand): Promise<DeleteAccountResponseDTO> {
  const response = await fetch("/api/auth/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

// =============================================================================
// Grouped exports
// =============================================================================

export const settingsApi = {
  getProfile,
  updateProfile,
  getAIUsage,
  getConfig,
  deleteAccount,
};
