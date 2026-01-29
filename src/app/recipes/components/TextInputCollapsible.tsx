"use client";

/**
 * TextInputCollapsible Component
 *
 * Collapsible section containing a textarea for pasting raw recipe text.
 * Serves as a fallback when URL parsing is unavailable or fails.
 */

import { useState, useCallback, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RECIPES_STRINGS, TEXT_INPUT_CONSTRAINTS, validateTextInput } from "../types";

// =============================================================================
// Types
// =============================================================================

interface TextInputCollapsibleProps {
  /** Handler called when form is submitted with valid text */
  onSubmit: (text: string) => Promise<void>;
  /** Whether the form is currently loading */
  isLoading: boolean;
  /** Error message to display (from API) */
  error: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function TextInputCollapsible({ onSubmit, isLoading, error }: TextInputCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Use API error if present, otherwise local validation error
  const displayError = error ?? localError;

  /**
   * Handle text change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;

    // Don't allow more than max length
    if (newText.length > TEXT_INPUT_CONSTRAINTS.maxLength) {
      return;
    }

    setText(newText);
    setLocalError(null);
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const validation = validateTextInput(text);

      if (!validation.isValid) {
        setLocalError(validation.error);
        return;
      }

      setLocalError(null);
      await onSubmit(text.trim());
    },
    [text, onSubmit]
  );

  const isDisabled = !text.trim() || isLoading;
  const charCount = text.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground w-full justify-between px-0"
          aria-expanded={isOpen}
        >
          <span>{RECIPES_STRINGS.textInput.trigger}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="recipe-text" className="text-sm font-medium">
                {RECIPES_STRINGS.textInput.label}
              </Label>
              <span
                className={cn(
                  "text-xs",
                  charCount > TEXT_INPUT_CONSTRAINTS.maxLength * 0.9 ? "text-destructive" : "text-muted-foreground"
                )}
                aria-live="polite"
              >
                {RECIPES_STRINGS.textInput.charCount(charCount, TEXT_INPUT_CONSTRAINTS.maxLength)}
              </span>
            </div>

            <textarea
              id="recipe-text"
              value={text}
              onChange={handleChange}
              placeholder={RECIPES_STRINGS.textInput.placeholder}
              disabled={isLoading}
              rows={6}
              aria-describedby={displayError ? "text-error" : undefined}
              aria-invalid={!!displayError}
              className={cn(
                "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                displayError && "border-destructive focus-visible:ring-destructive"
              )}
            />

            {displayError && (
              <p id="text-error" className="text-destructive text-sm" role="alert">
                {displayError}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isDisabled} variant="secondary" className="w-full">
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {RECIPES_STRINGS.loading.parsingText}
              </>
            ) : (
              RECIPES_STRINGS.textInput.button
            )}
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
