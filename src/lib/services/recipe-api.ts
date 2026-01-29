/**
 * Recipe API Service
 *
 * Frontend service layer for interacting with the recipe parsing API endpoints.
 * Provides typed methods for URL parsing, text parsing, and AI usage tracking.
 */

import type {
  RecipeParseCommand,
  RecipeParseResponseDTO,
  RecipeParseTextCommand,
  RecipeParseTextResponseDTO,
  AIUsageDTO,
  ErrorResponseDTO,
  ErrorCode,
} from "@/types";

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Recipe API errors with structured error data.
 */
export class RecipeApiError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode | string,
    public readonly status: number,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "RecipeApiError";
  }

  /**
   * Check if this is an unauthorized error.
   */
  isUnauthorized(): boolean {
    return this.status === 401 || this.code === "UNAUTHORIZED";
  }

  /**
   * Check if this is a domain not supported error.
   */
  isDomainNotSupported(): boolean {
    return this.status === 403 || this.code === "FORBIDDEN";
  }

  /**
   * Check if this is a not found error.
   */
  isNotFound(): boolean {
    return this.status === 404 || this.code === "NOT_FOUND";
  }

  /**
   * Check if this is a validation error.
   */
  isValidationError(): boolean {
    return this.status === 400 || this.status === 422 || this.code === "VALIDATION_ERROR";
  }

  /**
   * Check if this is an external service error.
   */
  isExternalServiceError(): boolean {
    return this.status === 502 || this.code === "EXTERNAL_SERVICE_ERROR";
  }

  /**
   * Check if this is a server error.
   */
  isServerError(): boolean {
    return this.status >= 500 || this.code === "INTERNAL_ERROR";
  }
}

/**
 * Parses API error response and throws RecipeApiError.
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

  throw new RecipeApiError(message, code, response.status, details);
}

/**
 * Returns a default Polish error message based on HTTP status code.
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Nieprawidłowy format danych";
    case 401:
      return "Sesja wygasła. Zaloguj się ponownie.";
    case 403:
      return "Ta strona nie jest obsługiwana";
    case 404:
      return "Nie znaleziono przepisu pod tym adresem";
    case 422:
      return "Nie udało się przeanalizować przepisu";
    case 429:
      return "Osiągnięto dzienny limit analiz";
    case 502:
      return "Nie udało się pobrać przepisu";
    case 500:
    case 503:
      return "Wystąpił błąd serwera. Spróbuj ponownie.";
    default:
      return "Wystąpił nieoczekiwany błąd";
  }
}

// =============================================================================
// Request Helpers
// =============================================================================

/**
 * Default fetch options for API requests.
 */
const defaultOptions: RequestInit = {
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * Makes a GET request to the specified endpoint.
 */
async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "GET",
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Makes a POST request to the specified endpoint with JSON body.
 */
async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

// =============================================================================
// Recipe API
// =============================================================================

/**
 * Recipe API methods for parsing recipes and tracking usage.
 */
export const recipeApi = {
  /**
   * Parses a recipe from a URL.
   *
   * @param url - Recipe URL to parse
   * @returns Parsed recipe data including title, ingredients, and confidence
   * @throws RecipeApiError on validation, domain, or processing errors
   *
   * Error status codes:
   * - 400: Invalid URL format
   * - 401: Unauthorized (redirect to login)
   * - 403: Domain not supported
   * - 404: Recipe page not found
   * - 422: Failed to parse recipe
   * - 502: Failed to fetch external page
   */
  async parseUrl(url: string): Promise<RecipeParseResponseDTO> {
    const command: RecipeParseCommand = { url };
    return post<RecipeParseResponseDTO>("/api/recipes/parse", command);
  },

  /**
   * Parses a recipe from raw text.
   *
   * @param text - Raw recipe text to parse
   * @returns Parsed ingredients and confidence
   * @throws RecipeApiError on validation or processing errors
   *
   * Error status codes:
   * - 400: Text too short or too long
   * - 401: Unauthorized (redirect to login)
   * - 422: Failed to parse text
   */
  async parseText(text: string): Promise<RecipeParseTextResponseDTO> {
    const command: RecipeParseTextCommand = { text };
    return post<RecipeParseTextResponseDTO>("/api/recipes/parse-text", command);
  },

  /**
   * Gets current AI usage statistics for the authenticated user.
   *
   * @returns Usage statistics including substitution counts and limits
   * @throws RecipeApiError on network or server errors
   */
  async getUsage(): Promise<AIUsageDTO> {
    return get<AIUsageDTO>("/api/ai/usage");
  },
};
