/**
 * Scan API Service
 *
 * Frontend service layer for interacting with the AI scan API endpoints.
 * Provides typed methods for receipt scanning and usage tracking.
 */

import type { ReceiptScanResponseDTO, ReceiptImageType, AIUsageDTO, ErrorResponseDTO } from "@/types";

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Scan API errors with structured error data.
 */
export class ScanApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "ScanApiError";
  }

  /**
   * Check if this is a rate limit error.
   */
  isRateLimited(): boolean {
    return this.status === 429 || this.code === "RATE_LIMITED";
  }

  /**
   * Check if this is an image quality/validation error.
   */
  isImageError(): boolean {
    return this.status === 422 || this.status === 400;
  }

  /**
   * Check if this is an external service error.
   */
  isExternalServiceError(): boolean {
    return this.status === 502 || this.code === "EXTERNAL_SERVICE_ERROR";
  }
}

/**
 * Parses API error response and throws ScanApiError.
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

  throw new ScanApiError(message, code, response.status, details);
}

/**
 * Returns a default error message based on HTTP status code.
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Nieprawidłowy format obrazu";
    case 401:
      return "Sesja wygasła. Zaloguj się ponownie.";
    case 422:
      return "Nie można przetworzyć obrazu. Sprawdź jakość zdjęcia.";
    case 429:
      return "Osiągnięto dzienny limit skanowań";
    case 502:
      return "Usługa AI jest tymczasowo niedostępna";
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
// Scan API Types
// =============================================================================

/** Parameters for scanning receipt */
export interface ScanReceiptParams {
  /** Base64 encoded image data (without data URL prefix) */
  image: string;
  /** MIME type of the image */
  imageType: ReceiptImageType;
}

// =============================================================================
// Scan API
// =============================================================================

/**
 * Scan API methods for receipt processing and usage tracking.
 */
export const scanApi = {
  /**
   * Scans a receipt image and extracts items using AI.
   *
   * @param params - Image data and type
   * @returns Extracted items and usage info
   * @throws ScanApiError on validation, rate limit, or processing errors
   *
   * Error status codes:
   * - 400: Invalid image format
   * - 401: Unauthorized (redirect to login)
   * - 422: Image quality too low for processing
   * - 429: Rate limit exceeded
   * - 502: External AI service unavailable
   */
  async scanReceipt(params: ScanReceiptParams): Promise<ReceiptScanResponseDTO> {
    return post<ReceiptScanResponseDTO>("/api/ai/scan-receipt", {
      image: params.image,
      image_type: params.imageType,
    });
  },

  /**
   * Gets current AI usage statistics for the authenticated user.
   *
   * @returns Usage statistics including scan counts and limits
   * @throws ScanApiError on network or server errors
   */
  async getUsage(): Promise<AIUsageDTO> {
    return get<AIUsageDTO>("/api/ai/usage");
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Converts a File to base64 string (without data URL prefix).
 *
 * @param file - File to convert
 * @returns Promise resolving to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("Nie udało się odczytać pliku"));
    };

    reader.readAsDataURL(file);
  });
}
