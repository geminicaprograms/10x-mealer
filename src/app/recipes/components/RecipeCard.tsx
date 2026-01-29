"use client";

/**
 * RecipeCard Component
 *
 * Individual card component displaying a recipe summary including
 * title, source domain, ingredient count, and timestamp.
 */

import { Trash2, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type RecentRecipe, RECIPES_STRINGS, formatRelativeTime } from "../types";

// =============================================================================
// Types
// =============================================================================

interface RecipeCardProps {
  /** Recipe data to display */
  recipe: RecentRecipe;
  /** Handler called when card is clicked */
  onClick: () => void;
  /** Handler called when delete button is clicked */
  onDelete: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function RecipeCard({ recipe, onClick, onDelete }: RecipeCardProps) {
  const { title, source_domain, source_url, ingredients, created_at } = recipe;

  /**
   * Handle delete button click - stop propagation to prevent card click
   */
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  /**
   * Handle source link click - open in new tab, stop propagation
   */
  const handleSourceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(source_url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card
      className={cn(
        "hover:bg-accent/50 cursor-pointer transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Otwórz przepis: ${title}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 flex-1 text-base leading-tight font-medium">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive -mt-1 -mr-2 h-8 w-8 shrink-0"
            onClick={handleDeleteClick}
            aria-label={`Usuń przepis: ${title}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {/* Source domain badge */}
          <Badge
            variant="secondary"
            className="hover:bg-secondary/80 cursor-pointer gap-1"
            onClick={handleSourceClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSourceClick(e as unknown as React.MouseEvent);
              }
            }}
            tabIndex={0}
            role="link"
            aria-label={`Otwórz źródło: ${source_domain}`}
          >
            {source_domain}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Badge>

          {/* Ingredient count */}
          <span className="text-muted-foreground">
            {RECIPES_STRINGS.recentRecipes.ingredientCount(ingredients.length)}
          </span>

          {/* Separator */}
          <span className="text-muted-foreground/50">•</span>

          {/* Relative time */}
          <span className="text-muted-foreground">{formatRelativeTime(created_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
