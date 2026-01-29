"use client";

/**
 * useRecipeParse Hook
 *
 * Manages recipe parsing API calls and state.
 * Handles both URL and text parsing methods.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { RecipeParseResponseDTO, RecipeParseTextResponseDTO } from "@/types";
import { recipeApi, RecipeApiError } from "@/lib/services/recipe-api";
import { RECIPES_STRINGS, isValidUrl, isHttpsUrl, validateTextInput } from "../types";

// =============================================================================
// Types
// =============================================================================

interface UseRecipeParseReturn {
  /** Parse recipe from URL */
  parseUrl: (url: string) => Promise<RecipeParseResponseDTO | null>;
  /** Parse recipe from raw text */
  parseText: (text: string) => Promise<RecipeParseTextResponseDTO | null>;
  /** Loading state during parsing */
  isLoading: boolean;
  /** Error message if parsing failed */
  error: string | null;
  /** Reset error state */
  reset: () => void;
}

// =============================================================================
// Error Mapping
// =============================================================================

/**
 * Maps API errors to Polish error messages
 */
function mapApiErrorToMessage(err: RecipeApiError): string {
  if (err.isDomainNotSupported()) {
    return RECIPES_STRINGS.errors.domainNotSupported;
  }

  if (err.isNotFound()) {
    return RECIPES_STRINGS.errors.fetchFailed;
  }

  if (err.isExternalServiceError()) {
    return RECIPES_STRINGS.errors.fetchFailed;
  }

  if (err.isValidationError()) {
    return RECIPES_STRINGS.errors.parseFailed;
  }

  if (err.isServerError()) {
    return RECIPES_STRINGS.errors.serverError;
  }

  // Use error message from API if available
  return err.message;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useRecipeParse(): UseRecipeParseReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parse recipe from URL
   */
  const parseUrl = useCallback(
    async (url: string): Promise<RecipeParseResponseDTO | null> => {
      // Client-side validation
      const trimmedUrl = url.trim();

      if (!trimmedUrl) {
        setError(RECIPES_STRINGS.errors.invalidUrl);
        return null;
      }

      if (!isHttpsUrl(trimmedUrl)) {
        setError(RECIPES_STRINGS.errors.httpsRequired);
        return null;
      }

      if (!isValidUrl(trimmedUrl)) {
        setError(RECIPES_STRINGS.errors.invalidUrl);
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await recipeApi.parseUrl(trimmedUrl);

        // Check if we got any ingredients
        if (response.ingredients.length === 0) {
          setError(RECIPES_STRINGS.errors.noIngredients);
          return null;
        }

        return response;
      } catch (err) {
        console.error("Recipe URL parsing failed:", err);

        // Handle network errors
        if (err instanceof TypeError && err.message.includes("fetch")) {
          setError(RECIPES_STRINGS.errors.networkError);
          return null;
        }

        // Handle API errors
        if (err instanceof RecipeApiError) {
          // Redirect to login on 401
          if (err.isUnauthorized()) {
            router.push("/login");
            return null;
          }

          setError(mapApiErrorToMessage(err));
          return null;
        }

        // Unknown error
        setError(RECIPES_STRINGS.errors.serverError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  /**
   * Parse recipe from raw text
   */
  const parseText = useCallback(
    async (text: string): Promise<RecipeParseTextResponseDTO | null> => {
      // Client-side validation
      const validation = validateTextInput(text);

      if (!validation.isValid) {
        setError(validation.error);
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await recipeApi.parseText(text.trim());

        // Check if we got any ingredients
        if (response.ingredients.length === 0) {
          setError(RECIPES_STRINGS.errors.noIngredients);
          return null;
        }

        return response;
      } catch (err) {
        console.error("Recipe text parsing failed:", err);

        // Handle network errors
        if (err instanceof TypeError && err.message.includes("fetch")) {
          setError(RECIPES_STRINGS.errors.networkError);
          return null;
        }

        // Handle API errors
        if (err instanceof RecipeApiError) {
          // Redirect to login on 401
          if (err.isUnauthorized()) {
            router.push("/login");
            return null;
          }

          setError(mapApiErrorToMessage(err));
          return null;
        }

        // Unknown error
        setError(RECIPES_STRINGS.errors.serverError);
        return null;
      } finally {
        setIsLoading(false);
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
    parseUrl,
    parseText,
    isLoading,
    error,
    reset,
  };
}
