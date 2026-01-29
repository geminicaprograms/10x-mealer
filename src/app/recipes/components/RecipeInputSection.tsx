"use client";

/**
 * RecipeInputSection Component
 *
 * Container component that holds both URL and text input methods.
 * The URL input is always visible as the primary method,
 * while text input is in a collapsible section as fallback.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { URLInputForm } from "./URLInputForm";
import { TextInputCollapsible } from "./TextInputCollapsible";

// =============================================================================
// Types
// =============================================================================

interface RecipeInputSectionProps {
  /** Handler for URL parsing */
  onParseUrl: (url: string) => Promise<void>;
  /** Handler for text parsing */
  onParseText: (text: string) => Promise<void>;
  /** Whether URL parsing is in progress */
  isLoadingUrl: boolean;
  /** Whether text parsing is in progress */
  isLoadingText: boolean;
  /** Error message for URL input */
  urlError: string | null;
  /** Error message for text input */
  textError: string | null;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function RecipeInputSection({
  onParseUrl,
  onParseText,
  isLoadingUrl,
  isLoadingText,
  urlError,
  textError,
  className,
}: RecipeInputSectionProps) {
  // Disable other input while one is loading
  const isAnyLoading = isLoadingUrl || isLoadingText;

  return (
    <Card className={cn(className)}>
      <CardContent className="space-y-4 pt-6">
        {/* Primary: URL Input */}
        <URLInputForm onSubmit={onParseUrl} isLoading={isLoadingUrl || isLoadingText} error={urlError} />

        {/* Separator */}
        <div className="relative">
          <Separator />
          <span className="bg-card text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs">
            lub
          </span>
        </div>

        {/* Secondary: Text Input (Collapsible) */}
        <TextInputCollapsible onSubmit={onParseText} isLoading={isAnyLoading} error={textError} />
      </CardContent>
    </Card>
  );
}
