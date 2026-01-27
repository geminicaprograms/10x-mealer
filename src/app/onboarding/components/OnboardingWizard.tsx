"use client";

import * as React from "react";
import { useCallback } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "../hooks/useOnboarding";
import { OnboardingProgressBar } from "./OnboardingProgressBar";
import { OnboardingStepAllergies } from "./OnboardingStepAllergies";
import { OnboardingStepDiets } from "./OnboardingStepDiets";
import { OnboardingStepEquipment } from "./OnboardingStepEquipment";
import { OnboardingStepStaples } from "./OnboardingStepStaples";
import { TOTAL_STEPS } from "../types";

/**
 * Main wizard container managing step state, form data, API calls, and navigation.
 * Fetches system config on mount and orchestrates the entire onboarding flow.
 */
export function OnboardingWizard() {
  const {
    currentStep,
    formData,
    config,
    isLoadingConfig,
    isSubmitting,
    errors,
    hasNoAllergies,
    hasNoDiets,
    setFormData,
    setHasNoAllergies,
    setHasNoDiets,
    goToNextStep,
    goToPreviousStep,
    submitOnboarding,
    clearStepError,
    retryLoadConfig,
  } = useOnboarding();

  // Handle allergies change
  const handleAllergiesChange = useCallback(
    (allergies: string[]) => {
      setFormData((prev) => ({ ...prev, allergies }));
      clearStepError(1);
    },
    [setFormData, clearStepError]
  );

  // Handle diets change
  const handleDietsChange = useCallback(
    (diets: string[]) => {
      setFormData((prev) => ({ ...prev, diets }));
      clearStepError(2);
    },
    [setFormData, clearStepError]
  );

  // Handle equipment change
  const handleEquipmentChange = useCallback(
    (equipment: string[]) => {
      setFormData((prev) => ({ ...prev, equipment }));
      clearStepError(3);
    },
    [setFormData, clearStepError]
  );

  // Handle "No allergies" change
  const handleNoAllergiesChange = useCallback(
    (checked: boolean) => {
      setHasNoAllergies(checked);
      if (checked) {
        setFormData((prev) => ({ ...prev, allergies: [] }));
      }
      clearStepError(1);
    },
    [setHasNoAllergies, setFormData, clearStepError]
  );

  // Handle "No diets" change
  const handleNoDietsChange = useCallback(
    (checked: boolean) => {
      setHasNoDiets(checked);
      if (checked) {
        setFormData((prev) => ({ ...prev, diets: [] }));
      }
      clearStepError(2);
    },
    [setHasNoDiets, setFormData, clearStepError]
  );

  // Handle next button click
  const handleNext = useCallback(() => {
    if (currentStep === TOTAL_STEPS) {
      submitOnboarding();
    } else {
      goToNextStep();
    }
  }, [currentStep, goToNextStep, submitOnboarding]);

  // Loading state
  if (isLoadingConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <svg
                className="text-primary h-8 w-8 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-muted-foreground">Ładowanie konfiguracji...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Config error state
  if (errors.config) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="bg-destructive/10 rounded-full p-3">
                <svg
                  className="text-destructive h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-destructive" role="alert">
                {errors.config}
              </p>
              <Button onClick={retryLoadConfig} variant="outline">
                Spróbuj ponownie
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Config not loaded
  if (!config) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <OnboardingProgressBar currentStep={currentStep} />
        </CardHeader>

        <CardContent>
          {/* Step 1: Allergies */}
          {currentStep === 1 && (
            <OnboardingStepAllergies
              options={config.supported_allergies}
              value={formData.allergies}
              onChange={handleAllergiesChange}
              hasNoAllergies={hasNoAllergies}
              onNoAllergiesChange={handleNoAllergiesChange}
              error={errors.step[1]}
            />
          )}

          {/* Step 2: Diets */}
          {currentStep === 2 && (
            <OnboardingStepDiets
              options={config.supported_diets}
              value={formData.diets}
              onChange={handleDietsChange}
              hasNoDiets={hasNoDiets}
              onNoDietsChange={handleNoDietsChange}
              error={errors.step[2]}
            />
          )}

          {/* Step 3: Equipment */}
          {currentStep === 3 && (
            <OnboardingStepEquipment
              options={config.supported_equipment}
              value={formData.equipment}
              onChange={handleEquipmentChange}
              error={errors.step[3]}
            />
          )}

          {/* Step 4: Staples */}
          {currentStep === 4 && <OnboardingStepStaples isLoading={isSubmitting} />}

          {/* Submit error */}
          {errors.submit && (
            <div className="bg-destructive/10 text-destructive mt-4 rounded-lg p-4 text-sm" role="alert">
              {errors.submit}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-4">
          {/* Back button */}
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 1 || isSubmitting}
            className={currentStep === 1 ? "invisible" : ""}
          >
            Wstecz
          </Button>

          {/* Next / Submit button */}
          <Button type="button" onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Zapisywanie...</span>
              </>
            ) : currentStep === TOTAL_STEPS ? (
              "Rozpocznij"
            ) : (
              "Dalej"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
