"use client";

/**
 * StaplesSection Component
 *
 * Simple card with a link to the staples tab in inventory.
 * Provides quick access to staples management.
 */

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Package } from "lucide-react";

import { SETTINGS_STRINGS } from "../types";

// =============================================================================
// Component
// =============================================================================

export function StaplesSection() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg leading-none font-semibold">{SETTINGS_STRINGS.staples.title}</h2>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">{SETTINGS_STRINGS.staples.description}</p>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href="/inventory?tab=staples">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" aria-hidden="true" />
              {SETTINGS_STRINGS.staples.linkText}
            </span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
