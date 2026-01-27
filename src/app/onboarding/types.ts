/**
 * Type definitions for the Onboarding Wizard view
 *
 * These types are specific to the onboarding flow and define
 * form data structure, step configuration, and validation results.
 */

/**
 * Form data structure for the onboarding wizard
 * Tracks user selections across all steps
 */
export interface OnboardingFormData {
  /** Selected allergies or empty if "Brak alergii" */
  allergies: string[];
  /** Selected diets or empty if "Brak diety" */
  diets: string[];
  /** Selected kitchen equipment */
  equipment: string[];
}

/**
 * Onboarding step configuration
 */
export interface OnboardingStep {
  /** Step number (1-4) */
  id: number;
  /** Polish title displayed at the top of the step */
  title: string;
  /** Polish description explaining the step purpose */
  description: string;
}

/**
 * Validation result for step validation
 */
export interface StepValidationResult {
  /** Whether the step data is valid */
  isValid: boolean;
  /** Polish error message if validation failed */
  error?: string;
}

/**
 * "None" option configuration for checkbox groups
 * Used for "Brak alergii" and "Brak diety" options
 */
export interface NoneOptionConfig {
  /** Display label (e.g., "Brak alergii") */
  label: string;
  /** Special value to track "none" selection */
  value: string;
}

/**
 * Step definitions with Polish labels
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Wybierz alergie",
    description:
      "Zaznacz alergie pokarmowe, które posiadasz. Dzięki temu będziemy mogli dostosować propozycje przepisów do Twoich potrzeb.",
  },
  {
    id: 2,
    title: "Wybierz diety",
    description: "Zaznacz diety, których przestrzegasz. Pomoże nam to proponować odpowiednie zamienniki składników.",
  },
  {
    id: 3,
    title: "Wybierz sprzęt kuchenny",
    description:
      "Zaznacz sprzęt kuchenny, który posiadasz. Dzięki temu będziemy wiedzieć, jakie przepisy możesz przygotować.",
  },
  {
    id: 4,
    title: "Podstawowe produkty",
    description:
      "Na koniec zainicjalizujemy podstawowe produkty w Twojej spiżarni - sól, pieprz, olej i inne niezbędne składniki.",
  },
];

/**
 * Total number of steps in the onboarding wizard
 */
export const TOTAL_STEPS = 4;
