"use client";

/**
 * RecipeHeader Component
 *
 * Displays the recipe title and source link at the top of the detail page.
 * Provides context about where the recipe came from.
 */

import { ExternalLink } from "lucide-react";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface RecipeHeaderProps {
  /** Recipe title */
  title: string;
  /** Original source URL */
  sourceUrl: string;
  /** Domain extracted from URL for display */
  sourceDomain: string;
}

// =============================================================================
// Component
// =============================================================================

export function RecipeHeader({ title, sourceUrl, sourceDomain }: RecipeHeaderProps) {
  // Check if it's a text-pasted recipe (no real URL)
  const isTextRecipe = sourceUrl.startsWith("text://");

  return (
    <header className="space-y-2">
      <h2 className="text-xl leading-tight font-semibold">{title}</h2>

      {!isTextRecipe && sourceUrl && (
        <div className="flex items-center gap-2">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
            aria-label={`${RECIPE_DETAIL_STRINGS.header.openInNewTab}: ${sourceDomain}`}
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="max-w-[250px] truncate">{sourceDomain}</span>
          </a>
        </div>
      )}

      {isTextRecipe && <p className="text-muted-foreground text-sm">Przepis z tekstu</p>}
    </header>
  );
}
