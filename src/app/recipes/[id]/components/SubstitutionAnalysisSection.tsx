"use client";

/**
 * SubstitutionAnalysisSection Component
 *
 * Container section that holds the ingredient analysis results, warnings,
 * and empty inventory messaging. Manages the presentation of AI-generated content.
 */

import { RefreshCw, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AIUsageIndicator } from "../../components";
import { AllergyWarningAlert } from "./AllergyWarningAlert";
import { EmptyInventoryMessage } from "./EmptyInventoryMessage";
import { IngredientsList } from "./IngredientsList";
import type { SubstitutionAnalysisViewModel } from "../types";
import type { SubstitutionWarningDTO } from "@/types";
import type { RecipesAIUsageState } from "../../types";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface SubstitutionAnalysisSectionProps {
  /** Analysis result from AI */
  analysis: SubstitutionAnalysisViewModel | null;
  /** Global warnings from analysis */
  warnings: SubstitutionWarningDTO[];
  /** AI usage state for indicator */
  aiUsage: RecipesAIUsageState;
  /** Whether analysis is loading */
  isLoading: boolean;
  /** Error message if analysis failed */
  error: string | null;
  /** Whether user has empty inventory */
  isEmptyInventory: boolean;
  /** Whether user can use AI features */
  canUseAI: boolean;
  /** Whether rate limit is exceeded */
  isRateLimited: boolean;
  /** Callback to retry analysis */
  onRetry: () => void;
  /** Callback to navigate to inventory */
  onAddProducts: () => void;
  /** Callback when substitution is toggled */
  onToggleSubstitution: (index: number) => void;
  /** Set of expanded substitution indices */
  expandedIndices: Set<number>;
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Loading skeleton for analysis section with screen reader announcement
 */
function AnalysisSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label={RECIPE_DETAIL_STRINGS.analysis.loading}>
      {/* Screen reader announcement */}
      <span className="sr-only">{RECIPE_DETAIL_STRINGS.analysis.loading}</span>

      {/* Skeleton ingredients */}
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="border-border/50 flex items-center gap-3 border-b py-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-1 h-4 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error state with retry button
 */
function AnalysisError({
  error,
  onRetry,
  isRateLimited,
}: {
  error: string;
  onRetry: () => void;
  isRateLimited: boolean;
}) {
  return (
    <Alert variant="destructive" className="border-destructive/50" role="alert">
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>
        {isRateLimited ? RECIPE_DETAIL_STRINGS.rateLimited.title : RECIPE_DETAIL_STRINGS.errors.analysisFailedGeneric}
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3">{error}</p>
        {!isRateLimited && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {RECIPE_DETAIL_STRINGS.analysis.retryButton}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Rate limit exceeded message
 */
function RateLimitMessage() {
  return (
    <Alert variant="default" className="bg-muted/50 border-yellow-500/50" role="status">
      <Clock className="h-4 w-4 text-yellow-600" aria-hidden="true" />
      <AlertTitle className="text-yellow-700 dark:text-yellow-500">
        {RECIPE_DETAIL_STRINGS.rateLimited.title}
      </AlertTitle>
      <AlertDescription>{RECIPE_DETAIL_STRINGS.rateLimited.description}</AlertDescription>
    </Alert>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SubstitutionAnalysisSection({
  analysis,
  warnings,
  aiUsage,
  isLoading,
  error,
  isEmptyInventory,
  canUseAI,
  isRateLimited,
  onRetry,
  onAddProducts,
  onToggleSubstitution,
  expandedIndices,
}: SubstitutionAnalysisSectionProps) {
  // Determine if we should show rate limit message (no analysis yet and rate limited)
  const showRateLimitMessage = !analysis && !isLoading && !error && isRateLimited;

  return (
    <section aria-label={RECIPE_DETAIL_STRINGS.analysis.sectionTitle} aria-busy={isLoading} className="space-y-4">
      {/* Section Header with AI Usage */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium" id="ingredients-heading">
          {RECIPE_DETAIL_STRINGS.ingredients.listTitle}
        </h2>
        <AIUsageIndicator usage={aiUsage} />
      </div>

      {/* Rate Limit Message (when no analysis and rate limited) */}
      {showRateLimitMessage && <RateLimitMessage />}

      {/* Empty Inventory Message */}
      {isEmptyInventory && !isLoading && !showRateLimitMessage && (
        <EmptyInventoryMessage onAddProducts={onAddProducts} />
      )}

      {/* Error State */}
      {error && !isLoading && <AnalysisError error={error} onRetry={onRetry} isRateLimited={isRateLimited} />}

      {/* Allergy Warnings */}
      {warnings.length > 0 && !isLoading && (
        <div className="space-y-2" role="alert" aria-live="polite">
          {warnings.map((warning, index) => (
            <AllergyWarningAlert key={`${warning.type}-${index}`} warning={warning} />
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div aria-live="polite">
          <AnalysisSkeleton />
        </div>
      )}

      {/* Ingredients List */}
      {analysis && !isLoading && !error && (
        <div aria-live="polite">
          <IngredientsList
            ingredients={analysis.ingredients}
            onToggleSubstitution={onToggleSubstitution}
            expandedIndices={expandedIndices}
          />
        </div>
      )}

      {/* No Analysis Available (not loading, no error, can use AI, not rate limited) */}
      {!analysis && !isLoading && !error && !isEmptyInventory && canUseAI && !isRateLimited && (
        <div className="py-8 text-center" role="status">
          <p className="text-muted-foreground mb-3 text-sm">Kliknij przycisk, aby przeanalizować składniki</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Analizuj składniki
          </Button>
        </div>
      )}
    </section>
  );
}
