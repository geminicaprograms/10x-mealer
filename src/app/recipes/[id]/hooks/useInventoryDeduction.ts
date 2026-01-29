"use client";

/**
 * useInventoryDeduction Hook
 *
 * Manages inventory deduction API calls for the "Cooked This" feature.
 * Handles the POST /api/inventory/deduct endpoint.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  InventoryDeductCommand,
  InventoryDeductionItemCommand,
  InventoryDeductResponseDTO,
  ErrorCode,
} from "@/types";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface UseInventoryDeductionReturn {
  /** Deduct items from inventory */
  deductInventory: (deductions: InventoryDeductionItemCommand[]) => Promise<InventoryDeductResponseDTO | null>;
  /** Whether deduction is in progress */
  isDeducting: boolean;
  /** Error message if deduction failed */
  error: string | null;
  /** Reset error state */
  reset: () => void;
}

// =============================================================================
// API Error Class
// =============================================================================

class DeductionApiError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode | string,
    public readonly status: number
  ) {
    super(message);
    this.name = "DeductionApiError";
  }

  isUnauthorized(): boolean {
    return this.status === 401 || this.code === "UNAUTHORIZED";
  }

  isNotFound(): boolean {
    return this.status === 404 || this.code === "NOT_FOUND";
  }

  isValidationError(): boolean {
    return this.status === 400 || this.status === 422 || this.code === "VALIDATION_ERROR";
  }

  isServerError(): boolean {
    return this.status >= 500 || this.code === "INTERNAL_ERROR";
  }
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Call inventory deduction API
 */
async function fetchDeductInventory(deductions: InventoryDeductionItemCommand[]): Promise<InventoryDeductResponseDTO> {
  const command: InventoryDeductCommand = { deductions };

  const response = await fetch("/api/inventory/deduct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    credentials: "include",
  });

  // Handle partial success (207) as success
  if (response.status === 207 || response.ok) {
    return response.json();
  }

  // Handle errors
  let errorData: { error?: { code?: string; message?: string } } | null = null;

  try {
    errorData = await response.json();
  } catch {
    // JSON parsing failed
  }

  const code = errorData?.error?.code ?? "UNKNOWN_ERROR";
  const message = errorData?.error?.message ?? getDefaultErrorMessage(response.status);

  throw new DeductionApiError(message, code, response.status);
}

/**
 * Returns a default Polish error message based on HTTP status code
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Sesja wygasła. Zaloguj się ponownie.";
    case 404:
      return "Nie znaleziono niektórych składników w spiżarni";
    case 400:
    case 422:
      return "Nieprawidłowe dane";
    case 500:
    case 503:
      return RECIPE_DETAIL_STRINGS.errors.serverError;
    default:
      return RECIPE_DETAIL_STRINGS.cookedThis.errorToast;
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useInventoryDeduction(): UseInventoryDeductionReturn {
  const router = useRouter();

  const [isDeducting, setIsDeducting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Deduct items from inventory
   */
  const deductInventory = useCallback(
    async (deductions: InventoryDeductionItemCommand[]): Promise<InventoryDeductResponseDTO | null> => {
      // Don't proceed if no deductions
      if (deductions.length === 0) {
        return null;
      }

      setIsDeducting(true);
      setError(null);

      try {
        const response = await fetchDeductInventory(deductions);

        // Check for partial failures
        if (response.errors && response.errors.length > 0) {
          console.warn("Some deductions failed:", response.errors);
        }

        return response;
      } catch (err) {
        console.error("Inventory deduction failed:", err);

        // Handle network errors
        if (err instanceof TypeError && err.message.includes("fetch")) {
          setError(RECIPE_DETAIL_STRINGS.errors.networkError);
          return null;
        }

        // Handle API errors
        if (err instanceof DeductionApiError) {
          // Redirect to login on 401
          if (err.isUnauthorized()) {
            router.push("/login");
            return null;
          }

          setError(err.message);
          return null;
        }

        // Unknown error
        setError(RECIPE_DETAIL_STRINGS.cookedThis.errorToast);
        return null;
      } finally {
        setIsDeducting(false);
      }
    },
    [router]
  );

  /**
   * Reset error state
   */
  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    deductInventory,
    isDeducting,
    error,
    reset,
  };
}
