"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SystemConfigDTO, ProfileUpdateCommand, StaplesInitCommand, ErrorResponseDTO } from "@/types";
import type { OnboardingFormData, StepValidationResult } from "../types";
import { TOTAL_STEPS } from "../types";

interface UseOnboardingReturn {
  /** Current step number (1-4) */
  currentStep: number;
  /** Form data with user selections */
  formData: OnboardingFormData;
  /** System configuration from API */
  config: SystemConfigDTO | null;
  /** Whether config is being loaded */
  isLoadingConfig: boolean;
  /** Whether the wizard is submitting */
  isSubmitting: boolean;
  /** Error states */
  errors: {
    config: string | null;
    step: Record<number, string>;
    submit: string | null;
  };
  /** Whether "No allergies" is selected */
  hasNoAllergies: boolean;
  /** Whether "No diet" is selected */
  hasNoDiets: boolean;
  /** Update form data */
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  /** Set "No allergies" state */
  setHasNoAllergies: (value: boolean) => void;
  /** Set "No diet" state */
  setHasNoDiets: (value: boolean) => void;
  /** Navigate to next step */
  goToNextStep: () => boolean;
  /** Navigate to previous step */
  goToPreviousStep: () => void;
  /** Submit the onboarding wizard */
  submitOnboarding: () => Promise<void>;
  /** Clear step error */
  clearStepError: (step: number) => void;
  /** Retry loading config */
  retryLoadConfig: () => void;
}

/**
 * Custom hook for managing the onboarding wizard state.
 * Handles config fetching, form state, validation, and API submission.
 */
export function useOnboarding(): UseOnboardingReturn {
  const router = useRouter();

  // Step management
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form data
  const [formData, setFormData] = useState<OnboardingFormData>({
    allergies: [],
    diets: [],
    equipment: [],
  });

  // Special tracking for "None" selections
  const [hasNoAllergies, setHasNoAllergies] = useState<boolean>(false);
  const [hasNoDiets, setHasNoDiets] = useState<boolean>(false);

  // API data
  const [config, setConfig] = useState<SystemConfigDTO | null>(null);

  // Loading states
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Error states
  const [configError, setConfigError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch system configuration
  const fetchConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setConfigError(null);

    try {
      const response = await fetch("/api/config", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data: SystemConfigDTO = await response.json();
        setConfig(data);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        const error: ErrorResponseDTO = await response.json();
        setConfigError(error.error?.message || "Nie udało się załadować konfiguracji. Spróbuj odświeżyć stronę.");
      }
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        const message = "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.";
        setConfigError(message);
        toast.error(message);
      } else {
        const message = "Nie udało się załadować konfiguracji. Spróbuj odświeżyć stronę.";
        setConfigError(message);
        toast.error(message);
      }
    } finally {
      setIsLoadingConfig(false);
    }
  }, [router]);

  // Fetch config on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Validate step
  const validateStep = useCallback(
    (step: number): StepValidationResult => {
      switch (step) {
        case 1: {
          // Allergies validation
          if (formData.allergies.length === 0 && !hasNoAllergies) {
            return {
              isValid: false,
              error: "Wybierz przynajmniej jedną alergię lub zaznacz 'Brak alergii'",
            };
          }

          // Validate values exist in config
          if (config) {
            const invalidAllergies = formData.allergies.filter((a) => !config.supported_allergies.includes(a));
            if (invalidAllergies.length > 0) {
              return {
                isValid: false,
                error: "Nieprawidłowe wartości alergii",
              };
            }
          }

          return { isValid: true };
        }

        case 2: {
          // Diets validation
          if (formData.diets.length === 0 && !hasNoDiets) {
            return {
              isValid: false,
              error: "Wybierz przynajmniej jedną dietę lub zaznacz 'Brak diety'",
            };
          }

          // Validate values exist in config
          if (config) {
            const invalidDiets = formData.diets.filter((d) => !config.supported_diets.includes(d));
            if (invalidDiets.length > 0) {
              return {
                isValid: false,
                error: "Nieprawidłowe wartości diet",
              };
            }
          }

          return { isValid: true };
        }

        case 3: {
          // Equipment validation - empty selection is allowed
          if (config) {
            const invalidEquipment = formData.equipment.filter((e) => !config.supported_equipment.includes(e));
            if (invalidEquipment.length > 0) {
              return {
                isValid: false,
                error: "Nieprawidłowe wartości sprzętu",
              };
            }
          }

          return { isValid: true };
        }

        case 4:
          // Staples confirmation - no validation needed
          return { isValid: true };

        default:
          return { isValid: true };
      }
    },
    [formData, hasNoAllergies, hasNoDiets, config]
  );

  // Go to next step
  const goToNextStep = useCallback((): boolean => {
    const validation = validateStep(currentStep);

    if (!validation.isValid) {
      setStepErrors((prev) => ({
        ...prev,
        [currentStep]: validation.error || "Błąd walidacji",
      }));
      return false;
    }

    // Clear any previous error for this step
    setStepErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[currentStep];
      return newErrors;
    });

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }

    return true;
  }, [currentStep, validateStep]);

  // Go to previous step
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Clear step error
  const clearStepError = useCallback((step: number) => {
    setStepErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[step];
      return newErrors;
    });
  }, []);

  // Submit onboarding
  const submitOnboarding = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Initialize staples
      const staplesPayload: StaplesInitCommand = {
        overwrite: false,
      };

      const staplesResponse = await fetch("/api/inventory/staples/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(staplesPayload),
      });

      if (!staplesResponse.ok) {
        if (staplesResponse.status === 401) {
          toast.error("Sesja wygasła. Zaloguj się ponownie.");
          router.push("/login");
          return;
        }
        throw new Error("Nie udało się zainicjalizować produktów podstawowych");
      }

      // 2. Update profile with selections and mark onboarding complete
      const profilePayload: ProfileUpdateCommand = {
        allergies: formData.allergies,
        diets: formData.diets,
        equipment: formData.equipment,
        onboarding_status: "completed",
      };

      const profileResponse = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profilePayload),
      });

      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          toast.error("Sesja wygasła. Zaloguj się ponownie.");
          router.push("/login");
          return;
        }
        const error: ErrorResponseDTO = await profileResponse.json();
        throw new Error(error.error?.message || "Nie udało się zapisać profilu");
      }

      // 3. Redirect to inventory on success
      router.push("/inventory");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, router]);

  // Retry loading config
  const retryLoadConfig = useCallback(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    currentStep,
    formData,
    config,
    isLoadingConfig,
    isSubmitting,
    errors: {
      config: configError,
      step: stepErrors,
      submit: submitError,
    },
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
  };
}
