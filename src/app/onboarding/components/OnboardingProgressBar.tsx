"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS } from "../types";

interface OnboardingProgressBarProps {
  /** Current step number (1-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps?: number;
  /** Additional class name */
  className?: string;
}

/**
 * Visual progress indicator for the onboarding wizard.
 * Shows current step with accessible ARIA attributes.
 */
export function OnboardingProgressBar({ currentStep, totalSteps = 4, className }: OnboardingProgressBarProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className={cn("w-full", className)}>
      {/* Step indicators */}
      <div className="mb-2 flex items-center justify-between" role="tablist" aria-label="Postęp konfiguracji">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const stepLabel = ONBOARDING_STEPS[index]?.title || `Krok ${stepNumber}`;

          return (
            <div
              key={stepNumber}
              className="flex flex-1 flex-col items-center"
              role="tab"
              aria-selected={isActive}
              aria-label={`${stepLabel} - ${isCompleted ? "ukończony" : isActive ? "aktualny" : "oczekujący"}`}
            >
              {/* Step circle */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground ring-primary ring-2 ring-offset-2",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>

              {/* Step label - visible on larger screens */}
              <span
                className={cn(
                  "mt-2 hidden max-w-[80px] truncate text-center text-xs sm:block",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {stepLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Connecting lines between steps */}
      <div className="bg-muted relative h-1 overflow-hidden rounded-full">
        <div
          className="bg-primary absolute inset-y-0 left-0 transition-all duration-300 ease-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>

      {/* Progress bar with ARIA attributes */}
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Krok ${currentStep} z ${totalSteps}`}
        className="sr-only"
      >
        Krok {currentStep} z {totalSteps}: {progressPercentage.toFixed(0)}% ukończone
      </div>
    </div>
  );
}
