"use client";

/**
 * useSubstitutionAnalysis Hook
 *
 * Manages AI-powered ingredient substitution analysis.
 * Calls the /api/ai/substitutions endpoint and handles all error cases.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SubstitutionsCommand, SubstitutionsResponseDTO, ParsedIngredientDTO, ErrorCode } from "@/types";
import { type SubstitutionAnalysisViewModel, mapAnalysisToViewModel, RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface UseSubstitutionAnalysisReturn {
  /** Fetch substitution analysis for recipe ingredients */
  analyzeIngredients: (ingredients: ParsedIngredientDTO[]) => Promise<SubstitutionAnalysisViewModel | null>;
  /** Analysis result */
  analysis: SubstitutionAnalysisViewModel | null;
  /** Whether analysis is in progress */
  isAnalyzing: boolean;
  /** Error message if analysis failed */
  error: string | null;
  /** Error code for specific handling */
  errorCode: ErrorCode | string | null;
  /** Whether rate limit has been exceeded */
  isRateLimited: boolean;
  /** Whether onboarding is required */
  requiresOnboarding: boolean;
  /** Reset error state */
  reset: () => void;
}

// =============================================================================
// API Error Class
// =============================================================================

class SubstitutionApiError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode | string,
    public readonly status: number
  ) {
    super(message);
    this.name = "SubstitutionApiError";
  }

  isUnauthorized(): boolean {
    return this.status === 401 || this.code === "UNAUTHORIZED";
  }

  isForbidden(): boolean {
    return this.status === 403 || this.code === "FORBIDDEN";
  }

  isRateLimited(): boolean {
    return this.status === 429 || this.code === "RATE_LIMITED";
  }

  isServerError(): boolean {
    return this.status >= 500 || this.code === "INTERNAL_ERROR";
  }

  isExternalServiceError(): boolean {
    return this.status === 502 || this.code === "EXTERNAL_SERVICE_ERROR";
  }
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch substitution analysis from API
 */
async function fetchSubstitutionAnalysis(ingredients: ParsedIngredientDTO[]): Promise<SubstitutionsResponseDTO> {
  const command: SubstitutionsCommand = {
    recipe_ingredients: ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
    })),
  };

  const response = await fetch("/api/ai/substitutions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    credentials: "include",
  });

  if (!response.ok) {
    let errorData: { error?: { code?: string; message?: string } } | null = null;

    try {
      errorData = await response.json();
    } catch {
      // JSON parsing failed
    }

    const code = errorData?.error?.code ?? "UNKNOWN_ERROR";
    const message = errorData?.error?.message ?? getDefaultErrorMessage(response.status);

    throw new SubstitutionApiError(message, code, response.status);
  }

  return response.json();
}

/**
 * Returns a default Polish error message based on HTTP status code
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Sesja wygasła. Zaloguj się ponownie.";
    case 403:
      return RECIPE_DETAIL_STRINGS.errors.onboardingRequired;
    case 429:
      return RECIPE_DETAIL_STRINGS.rateLimited.description;
    case 500:
    case 503:
      return RECIPE_DETAIL_STRINGS.errors.serverError;
    case 502:
      return RECIPE_DETAIL_STRINGS.errors.serverError;
    default:
      return RECIPE_DETAIL_STRINGS.errors.analysisFailedGeneric;
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSubstitutionAnalysis(): UseSubstitutionAnalysisReturn {
  const router = useRouter();

  const [analysis, setAnalysis] = useState<SubstitutionAnalysisViewModel | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);

  /**
   * Analyze recipe ingredients for substitutions
   */
  const analyzeIngredients = useCallback(
    async (ingredients: ParsedIngredientDTO[]): Promise<SubstitutionAnalysisViewModel | null> => {
      // Don't analyze if no ingredients
      if (ingredients.length === 0) {
        return null;
      }

      setIsAnalyzing(true);
      setError(null);
      setErrorCode(null);
      setIsRateLimited(false);
      setRequiresOnboarding(false);

      try {
        const response = await fetchSubstitutionAnalysis(ingredients);

        // Map API response to view model
        const viewModel = mapAnalysisToViewModel(ingredients, response);

        setAnalysis(viewModel);

        // Check if rate limit is now exceeded for future requests
        if (response.usage.substitutions_remaining === 0) {
          setIsRateLimited(true);
        }

        return viewModel;
      } catch (err) {
        console.error("Substitution analysis failed:", err);

        // Handle network errors
        if (err instanceof TypeError && err.message.includes("fetch")) {
          setError(RECIPE_DETAIL_STRINGS.errors.networkError);
          setErrorCode("NETWORK_ERROR");
          return null;
        }

        // Handle API errors
        if (err instanceof SubstitutionApiError) {
          setErrorCode(err.code);

          // Redirect to login on 401
          if (err.isUnauthorized()) {
            router.push("/login");
            return null;
          }

          // Handle 403 - onboarding required
          if (err.isForbidden()) {
            setRequiresOnboarding(true);
            setError(RECIPE_DETAIL_STRINGS.errors.onboardingRequired);
            return null;
          }

          // Handle 429 - rate limited
          if (err.isRateLimited()) {
            setIsRateLimited(true);
            setError(RECIPE_DETAIL_STRINGS.rateLimited.description);
            return null;
          }

          // Handle server errors
          if (err.isServerError() || err.isExternalServiceError()) {
            setError(RECIPE_DETAIL_STRINGS.errors.serverError);
            return null;
          }

          // Other errors
          setError(err.message);
          return null;
        }

        // Unknown error
        setError(RECIPE_DETAIL_STRINGS.errors.analysisFailedGeneric);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [router]
  );

  /**
   * Reset error state
   */
  const reset = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  return {
    analyzeIngredients,
    analysis,
    isAnalyzing,
    error,
    errorCode,
    isRateLimited,
    requiresOnboarding,
    reset,
  };
}
