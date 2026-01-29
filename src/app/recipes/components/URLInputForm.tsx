"use client";

/**
 * URLInputForm Component
 *
 * Primary input form for pasting recipe URLs.
 * Includes URL validation, hint text about supported domains, and submit button.
 */

import { useState, useCallback, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RECIPES_STRINGS, isValidUrl, isHttpsUrl } from "../types";

// =============================================================================
// Types
// =============================================================================

interface URLInputFormProps {
  /** Handler called when form is submitted with valid URL */
  onSubmit: (url: string) => Promise<void>;
  /** Whether the form is currently loading */
  isLoading: boolean;
  /** Error message to display (from API) */
  error: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function URLInputForm({ onSubmit, isLoading, error }: URLInputFormProps) {
  const [url, setUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Use API error if present, otherwise local validation error
  const displayError = error ?? localError;

  /**
   * Validate URL on blur
   */
  const handleBlur = useCallback(() => {
    if (!url.trim()) {
      setLocalError(null);
      return;
    }

    if (!isHttpsUrl(url)) {
      setLocalError(RECIPES_STRINGS.errors.httpsRequired);
      return;
    }

    if (!isValidUrl(url)) {
      setLocalError(RECIPES_STRINGS.errors.invalidUrl);
      return;
    }

    setLocalError(null);
  }, [url]);

  /**
   * Handle URL input change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Clear local error on change
    setLocalError(null);
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const trimmedUrl = url.trim();

      // Client-side validation
      if (!trimmedUrl) {
        return;
      }

      if (!isHttpsUrl(trimmedUrl)) {
        setLocalError(RECIPES_STRINGS.errors.httpsRequired);
        return;
      }

      if (!isValidUrl(trimmedUrl)) {
        setLocalError(RECIPES_STRINGS.errors.invalidUrl);
        return;
      }

      setLocalError(null);
      await onSubmit(trimmedUrl);
    },
    [url, onSubmit]
  );

  const isDisabled = !url.trim() || isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="recipe-url" className="text-sm font-medium">
          {RECIPES_STRINGS.urlInput.label}
        </Label>
        <Input
          id="recipe-url"
          type="url"
          value={url}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={RECIPES_STRINGS.urlInput.placeholder}
          disabled={isLoading}
          aria-describedby={displayError ? "url-error" : "url-hint"}
          aria-invalid={!!displayError}
          className={cn(displayError && "border-destructive focus-visible:ring-destructive")}
        />
        {displayError ? (
          <p id="url-error" className="text-destructive text-sm" role="alert">
            {displayError}
          </p>
        ) : (
          <p id="url-hint" className="text-muted-foreground text-sm">
            {RECIPES_STRINGS.urlInput.hint}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isDisabled} className="w-full">
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {RECIPES_STRINGS.loading.parsingUrl}
          </>
        ) : (
          RECIPES_STRINGS.urlInput.button
        )}
      </Button>
    </form>
  );
}
