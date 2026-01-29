"use client";

/**
 * PreferencesSection Component
 *
 * Displays user's current preferences (allergies, diets, equipment) in a read-only card
 * with an edit button that opens the edit sheet.
 */

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil } from "lucide-react";

import type { ProfileDTO } from "@/types";
import { SETTINGS_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface PreferencesSectionProps {
  profile: ProfileDTO | null;
  isLoading: boolean;
  isConfigLoaded: boolean;
  onEditClick: () => void;
}

// =============================================================================
// Sub-components
// =============================================================================

interface PreferenceGroupProps {
  label: string;
  items: string[];
  emptyText: string;
}

function PreferenceGroup({ label, items, emptyText }: PreferenceGroupProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-sm font-medium">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-sm italic">{emptyText}</span>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Allergies */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      {/* Diets */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
      {/* Equipment */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PreferencesSection({ profile, isLoading, isConfigLoaded, onEditClick }: PreferencesSectionProps) {
  const canEdit = !isLoading && isConfigLoaded && profile !== null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h2 className="text-lg leading-none font-semibold">{SETTINGS_STRINGS.preferences.title}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditClick}
          disabled={!canEdit}
          aria-label={SETTINGS_STRINGS.preferences.editButton}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{SETTINGS_STRINGS.preferences.editButton}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : profile ? (
          <div className="space-y-4">
            <PreferenceGroup
              label={SETTINGS_STRINGS.preferences.allergies}
              items={profile.allergies}
              emptyText={SETTINGS_STRINGS.preferences.noAllergies}
            />
            <PreferenceGroup
              label={SETTINGS_STRINGS.preferences.diets}
              items={profile.diets}
              emptyText={SETTINGS_STRINGS.preferences.noDiets}
            />
            <PreferenceGroup
              label={SETTINGS_STRINGS.preferences.equipment}
              items={profile.equipment}
              emptyText={SETTINGS_STRINGS.preferences.empty}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
