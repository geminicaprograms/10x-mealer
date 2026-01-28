"use client";

import * as React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  /** Current password value to evaluate */
  password: string;
  /** Additional className for the container */
  className?: string;
}

type StrengthLevel = "none" | "weak" | "medium" | "strong";

interface StrengthConfig {
  label: string;
  color: string;
  barColor: string;
  segments: number;
}

const STRENGTH_CONFIG: Record<StrengthLevel, StrengthConfig> = {
  none: {
    label: "",
    color: "text-muted-foreground",
    barColor: "bg-muted",
    segments: 0,
  },
  weak: {
    label: "Słabe",
    color: "text-destructive",
    barColor: "bg-destructive",
    segments: 1,
  },
  medium: {
    label: "Średnie",
    color: "text-yellow-600 dark:text-yellow-500",
    barColor: "bg-yellow-500",
    segments: 2,
  },
  strong: {
    label: "Silne",
    color: "text-green-600 dark:text-green-500",
    barColor: "bg-green-500",
    segments: 3,
  },
};

/**
 * Calculates password strength based on criteria.
 * - Weak: < 8 chars or missing criteria
 * - Medium: 8+ chars, 2/3 criteria (uppercase, lowercase, number)
 * - Strong: 8+ chars, all 3 criteria
 */
function calculateStrength(password: string): StrengthLevel {
  if (!password) return "none";

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const criteriaCount = [hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;

  if (!hasMinLength) return "weak";
  if (criteriaCount === 3) return "strong";
  if (criteriaCount >= 2) return "medium";
  return "weak";
}

/**
 * Visual password strength feedback component.
 * Displays strength level with colored bar segments and label.
 */
export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);
  const config = STRENGTH_CONFIG[strength];

  if (strength === "none") return null;

  return (
    <div className={cn("space-y-1.5", className)} aria-live="polite">
      {/* Strength bar */}
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={config.segments}
        aria-valuemin={0}
        aria-valuemax={3}
      >
        {[1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              segment <= config.segments ? config.barColor : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Strength label */}
      <p className={cn("text-xs font-medium", config.color)}>Siła hasła: {config.label}</p>
    </div>
  );
}
