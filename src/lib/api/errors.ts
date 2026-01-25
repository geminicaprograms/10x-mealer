import { NextResponse } from "next/server";
import type { ErrorCode, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * Creates a standardized error response for API endpoints.
 *
 * @param code - Error code from the predefined ErrorCode type
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional validation error details
 * @returns NextResponse with ErrorResponseDTO body
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: ValidationErrorDetailDTO[]
): NextResponse<ErrorResponseDTO> {
  const errorBody: ErrorResponseDTO = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return NextResponse.json(errorBody, { status });
}

/**
 * Returns a 401 Unauthorized error response.
 * Used when authentication is required but not provided or invalid.
 *
 * @param message - Optional custom message (defaults to "Authentication required")
 */
export function unauthorizedError(message = "Authentication required"): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("UNAUTHORIZED", message, 401);
}

/**
 * Returns a 403 Forbidden error response.
 * Used when the user is authenticated but lacks permission for the requested resource.
 *
 * @param message - Optional custom message (defaults to "Access denied")
 */
export function forbiddenError(message = "Access denied"): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("FORBIDDEN", message, 403);
}

/**
 * Returns a 404 Not Found error response.
 * Used when the requested resource does not exist.
 *
 * @param message - Descriptive message about what was not found
 */
export function notFoundError(message: string): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("NOT_FOUND", message, 404);
}

/**
 * Returns a 400 Bad Request error response for validation errors.
 * Used when request payload or parameters fail validation.
 *
 * @param message - Error message describing the validation failure
 * @param details - Optional array of field-level validation errors
 */
export function validationError(
  message = "Validation failed",
  details?: ValidationErrorDetailDTO[]
): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("VALIDATION_ERROR", message, 400, details);
}

/**
 * Returns a 422 Unprocessable Entity error response.
 * Used when request is syntactically valid but contains semantically invalid values.
 * For example, when array values don't match supported system configuration.
 *
 * @param message - Error message describing the issue
 * @param details - Optional array of field-level validation errors
 */
export function unprocessableEntityError(
  message = "Invalid values provided",
  details?: ValidationErrorDetailDTO[]
): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("VALIDATION_ERROR", message, 422, details);
}

/**
 * Returns a 429 Too Many Requests error response.
 * Used when the user has exceeded rate limits.
 *
 * @param message - Optional custom message (defaults to "Rate limit exceeded")
 */
export function rateLimitedError(message = "Rate limit exceeded"): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("RATE_LIMITED", message, 429);
}

/**
 * Returns a 500 Internal Server Error response.
 * Used for unexpected server-side errors.
 *
 * @param message - Optional custom message (defaults to "An unexpected error occurred")
 */
export function internalError(message = "An unexpected error occurred"): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("INTERNAL_ERROR", message, 500);
}

/**
 * Returns a 502 Bad Gateway error response for external service failures.
 * Used when an external service (e.g., AI provider) fails.
 *
 * @param message - Optional custom message (defaults to "External service error")
 */
export function externalServiceError(message = "External service error"): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("EXTERNAL_SERVICE_ERROR", message, 502);
}
