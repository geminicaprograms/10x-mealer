# View Implementation Plan: Onboarding Wizard

## 1. Overview

The Onboarding Wizard is a mandatory, multi-step form presented to new users immediately after registration. Its purpose is to collect essential user preferences (allergies, diets, kitchen equipment) before allowing access to AI-powered features. The wizard ensures that all AI suggestions (recipe substitutions, ingredient matching) are personalized and relevant to the user's dietary restrictions and available cooking tools.

The view consists of 4 sequential steps:

1. **Allergies Selection** - Multi-select from supported allergies or "Brak alergii" (No allergies)
2. **Diets Selection** - Multi-select from supported diets or "Brak diety" (No diet)
3. **Equipment Selection** - Multi-select kitchen equipment the user owns
4. **Staples Initialization** - Confirm initialization of default staple items (salt, pepper, oil, etc.)

The wizard cannot be skipped, and the user must complete all steps to access the main application.

## 2. View Routing

**Path:** `/onboarding`

**Route Protection:**

- Redirect to `/login` if user is not authenticated
- Redirect to `/inventory` if user has already completed onboarding (`onboarding_status === "completed"`)
- On successful completion, redirect to `/inventory`

**Middleware Logic:**

```typescript
// In middleware.ts or route guard
if (!session) {
  redirect("/login");
}
if (profile?.onboarding_status === "completed") {
  redirect("/inventory");
}
```

## 3. Component Structure

```
src/app/onboarding/
├── page.tsx                    # Server component - route handler
└── components/
    ├── OnboardingWizard.tsx    # Client component - main wizard container
    ├── OnboardingProgressBar.tsx
    ├── OnboardingStepAllergies.tsx
    ├── OnboardingStepDiets.tsx
    ├── OnboardingStepEquipment.tsx
    ├── OnboardingStepStaples.tsx
    └── CheckboxGroupField.tsx  # Reusable checkbox group with "None" option
```

**Component Hierarchy:**

```
OnboardingPage (Server Component)
└── OnboardingWizard (Client Component)
    ├── OnboardingProgressBar
    └── Card
        ├── OnboardingStepAllergies | OnboardingStepDiets |
        │   OnboardingStepEquipment | OnboardingStepStaples
        │   └── CheckboxGroupField (for steps 1-3)
        │       └── Checkbox (shadcn/ui)
        └── Navigation Buttons
            └── Button (shadcn/ui)
```

## 4. Component Details

### 4.1 OnboardingPage (`page.tsx`)

- **Description:** Server component that acts as the route entry point. Handles initial authentication check and renders the client wizard component.
- **Main elements:**
  - Server-side auth check via Supabase server client
  - Redirect logic for unauthenticated users
  - Renders `OnboardingWizard` client component
- **Handled interactions:** None (server component)
- **Handled validation:** Authentication status check
- **Types:** None
- **Props:** None (Next.js page component)

### 4.2 OnboardingWizard

- **Description:** Main wizard container managing step state, form data, API calls, and navigation. Fetches system config on mount and orchestrates the entire onboarding flow.
- **Main elements:**
  - `OnboardingProgressBar` showing current step
  - `Card` (shadcn/ui) wrapping step content
  - Conditional rendering of step components based on `currentStep`
  - Navigation buttons: "Wstecz" (Back) and "Dalej" (Next) / "Rozpocznij" (Start - final step)
- **Handled interactions:**
  - `onNext()` - Advance to next step (with validation)
  - `onBack()` - Return to previous step
  - `onComplete()` - Final submission (save profile + init staples)
- **Handled validation:**
  - Steps 1-3: At least one selection required OR "None" option selected
  - Step 4: No validation needed (confirmation only)
- **Types:**
  - `OnboardingFormData` (ViewModel)
  - `SystemConfigDTO` (API response)
  - `ProfileUpdateCommand` (API request)
  - `StaplesInitCommand` (API request)
- **Props:** None (root client component)

### 4.3 OnboardingProgressBar

- **Description:** Visual progress indicator showing current step (1-4) with accessible ARIA attributes.
- **Main elements:**
  - Progress bar container with `role="progressbar"`
  - 4 step indicators (circles or segments)
  - Current step highlight with primary color
  - Step labels in Polish
- **Handled interactions:** None (display only)
- **Handled validation:** None
- **Types:** None
- **Props:**
  - `currentStep: number` (1-4)
  - `totalSteps: number` (default: 4)

### 4.4 OnboardingStepAllergies

- **Description:** Step 1 - Allergies multi-select. Displays list of supported allergies from system config with a "Brak alergii" (No allergies) exclusive option.
- **Main elements:**
  - Step title: "Wybierz alergie" (Select allergies)
  - Step description explaining purpose
  - `CheckboxGroupField` with allergy options
  - "Brak alergii" checkbox that clears other selections when checked
- **Handled interactions:**
  - `onChange(allergies: string[])` - Update selected allergies
  - "Brak alergii" toggle - Exclusive selection behavior
- **Handled validation:**
  - At least one option must be selected (allergy or "Brak alergii")
  - Values must exist in `supportedAllergies` array
- **Types:**
  - `string[]` for selected values
- **Props:**
  - `options: string[]` - Available allergies from config
  - `value: string[]` - Currently selected allergies
  - `onChange: (value: string[]) => void`
  - `error?: string` - Validation error message

### 4.5 OnboardingStepDiets

- **Description:** Step 2 - Diets multi-select. Displays list of supported diets from system config with a "Brak diety" (No diet) exclusive option.
- **Main elements:**
  - Step title: "Wybierz diety" (Select diets)
  - Step description explaining purpose
  - `CheckboxGroupField` with diet options
  - "Brak diety" checkbox that clears other selections when checked
- **Handled interactions:**
  - `onChange(diets: string[])` - Update selected diets
  - "Brak diety" toggle - Exclusive selection behavior
- **Handled validation:**
  - At least one option must be selected (diet or "Brak diety")
  - Values must exist in `supportedDiets` array
- **Types:**
  - `string[]` for selected values
- **Props:**
  - `options: string[]` - Available diets from config
  - `value: string[]` - Currently selected diets
  - `onChange: (value: string[]) => void`
  - `error?: string` - Validation error message

### 4.6 OnboardingStepEquipment

- **Description:** Step 3 - Equipment multi-select. Displays list of kitchen equipment the user owns. No "None" option - users can have no equipment selected.
- **Main elements:**
  - Step title: "Wybierz sprzęt kuchenny" (Select kitchen equipment)
  - Step description explaining purpose
  - `CheckboxGroupField` with equipment options
- **Handled interactions:**
  - `onChange(equipment: string[])` - Update selected equipment
- **Handled validation:**
  - Empty selection is allowed (user may have no special equipment)
  - Values must exist in `supportedEquipment` array
- **Types:**
  - `string[]` for selected values
- **Props:**
  - `options: string[]` - Available equipment from config
  - `value: string[]` - Currently selected equipment
  - `onChange: (value: string[]) => void`
  - `error?: string` - Validation error message

### 4.7 OnboardingStepStaples

- **Description:** Step 4 - Staples initialization confirmation. Explains what staples are and asks user to confirm initialization.
- **Main elements:**
  - Step title: "Podstawowe produkty" (Basic products)
  - Description explaining staples concept (salt, pepper, oil, etc.)
  - List of what will be initialized (informational)
  - "Rozpocznij" (Start) button to complete onboarding
- **Handled interactions:**
  - Confirmation is handled by parent's `onComplete()`
- **Handled validation:** None (confirmation step)
- **Types:** None
- **Props:**
  - `isLoading: boolean` - Show loading state during submission

### 4.8 CheckboxGroupField

- **Description:** Reusable checkbox group component with fieldset/legend for accessibility and optional "None" exclusive option.
- **Main elements:**
  - `<fieldset>` wrapper for accessibility
  - `<legend>` with group label (visually hidden if using step title)
  - List of `Checkbox` (shadcn/ui) components
  - Optional "None" checkbox with exclusive behavior
  - Error message display
- **Handled interactions:**
  - `onItemChange(item: string, checked: boolean)` - Individual checkbox toggle
  - `onNoneChange(checked: boolean)` - "None" option exclusive toggle
- **Handled validation:**
  - Displays error message from parent
- **Types:** None
- **Props:**
  - `label: string` - Group label (for screen readers)
  - `options: string[]` - Available options
  - `value: string[]` - Selected values
  - `onChange: (value: string[]) => void`
  - `noneOption?: { label: string; value: string }` - Optional "None" config
  - `error?: string` - Error message
  - `disabled?: boolean` - Disable all checkboxes

## 5. Types

### 5.1 View Model Types (new types for this view)

```typescript
// src/app/onboarding/types.ts

/**
 * Form data structure for the onboarding wizard
 * Tracks user selections across all steps
 */
export interface OnboardingFormData {
  allergies: string[]; // Selected allergies or empty if "Brak alergii"
  diets: string[]; // Selected diets or empty if "Brak diety"
  equipment: string[]; // Selected kitchen equipment
}

/**
 * Onboarding step configuration
 */
export interface OnboardingStep {
  id: number;
  title: string; // Polish title
  description: string; // Polish description
}

/**
 * Validation result for step validation
 */
export interface StepValidationResult {
  isValid: boolean;
  error?: string; // Polish error message
}

/**
 * "None" option configuration for checkbox groups
 */
export interface NoneOptionConfig {
  label: string; // e.g., "Brak alergii"
  value: string; // Special value to track "none" selection
}
```

### 5.2 Existing Types from `src/types.ts` (used by API integration)

```typescript
// System Config (GET /api/config response)
interface SystemConfigDTO {
  supported_allergies: string[]; // ["gluten", "laktoza", "orzechy", ...]
  supported_diets: string[]; // ["wegetariańska", "wegańska", ...]
  supported_equipment: string[]; // ["piekarnik", "blender", ...]
  rate_limits: RateLimitsConfigDTO;
}

// Profile Update (PUT /api/profile request)
interface ProfileUpdateCommand {
  allergies?: string[];
  diets?: string[];
  equipment?: string[];
  onboarding_status?: OnboardingStatus; // "pending" | "completed"
}

// Profile (PUT /api/profile response)
interface ProfileDTO {
  id: string;
  allergies: string[];
  diets: string[];
  equipment: string[];
  onboarding_status: OnboardingStatus;
  created_at: string;
  updated_at: string;
}

// Staples Init (POST /api/inventory/staples/init request)
interface StaplesInitCommand {
  overwrite?: boolean;
}

// Staples Init (POST /api/inventory/staples/init response)
interface StaplesInitResponseDTO {
  created: number;
  skipped: number;
  staples: InventoryStapleItemDTO[];
}

// Error Response
interface ErrorResponseDTO {
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetailDTO[];
  };
}
```

## 6. State Management

### 6.1 Component State (OnboardingWizard)

```typescript
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
```

### 6.2 Custom Hook (Recommended)

Create a custom hook `useOnboarding` to encapsulate:

- Config fetching
- Form state management
- Step navigation logic
- Validation logic
- API submission

```typescript
// src/app/onboarding/hooks/useOnboarding.ts

export function useOnboarding() {
  // All state as above

  // Fetch config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    /* ... */
  };

  const validateStep = (step: number): StepValidationResult => {
    /* ... */
  };

  const goToNextStep = () => {
    /* ... */
  };

  const goToPreviousStep = () => {
    /* ... */
  };

  const submitOnboarding = async () => {
    /* ... */
  };

  return {
    currentStep,
    formData,
    config,
    isLoadingConfig,
    isSubmitting,
    errors: { config: configError, step: stepErrors, submit: submitError },
    hasNoAllergies,
    hasNoDiets,
    setFormData,
    setHasNoAllergies,
    setHasNoDiets,
    goToNextStep,
    goToPreviousStep,
    submitOnboarding,
  };
}
```

## 7. API Integration

### 7.1 GET /api/config (Fetch System Configuration)

**When:** On wizard mount (useEffect)

**Request:**

```typescript
const response = await fetch("/api/config", {
  method: "GET",
  credentials: "include",
});
```

**Response Type:** `SystemConfigDTO`

**Response Handling:**

```typescript
if (response.ok) {
  const data: SystemConfigDTO = await response.json();
  setConfig(data);
} else if (response.status === 401) {
  // Redirect to login
  router.push("/login");
} else {
  const error: ErrorResponseDTO = await response.json();
  setConfigError(error.error.message);
}
```

### 7.2 PUT /api/profile (Save User Preferences)

**When:** On final step submission (after staples init)

**Request:**

```typescript
const payload: ProfileUpdateCommand = {
  allergies: formData.allergies,
  diets: formData.diets,
  equipment: formData.equipment,
  onboarding_status: "completed",
};

const response = await fetch("/api/profile", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(payload),
});
```

**Response Type:** `ProfileDTO`

**Error Handling:**

- `400` - Validation error (show inline errors)
- `401` - Unauthorized (redirect to login)
- `422` - Invalid values (show toast with message)
- `500` - Server error (show generic error toast)

### 7.3 POST /api/inventory/staples/init (Initialize Staples)

**When:** On final step submission (before profile update)

**Request:**

```typescript
const payload: StaplesInitCommand = {
  overwrite: false,
};

const response = await fetch("/api/inventory/staples/init", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(payload),
});
```

**Response Type:** `StaplesInitResponseDTO`

**Note:** Called before profile update. If staples init fails, do not proceed with profile update.

### 7.4 Submission Flow

```typescript
const submitOnboarding = async () => {
  setIsSubmitting(true);
  setSubmitError(null);

  try {
    // 1. Initialize staples
    const staplesResponse = await fetch("/api/inventory/staples/init", {
      /* ... */
    });
    if (!staplesResponse.ok) {
      throw new Error("Nie udało się zainicjalizować produktów podstawowych");
    }

    // 2. Update profile with selections and mark onboarding complete
    const profileResponse = await fetch("/api/profile", {
      /* ... */
    });
    if (!profileResponse.ok) {
      const error = await profileResponse.json();
      throw new Error(error.error?.message || "Nie udało się zapisać profilu");
    }

    // 3. Redirect to inventory on success
    router.push("/inventory");
  } catch (error) {
    setSubmitError(error instanceof Error ? error.message : "Wystąpił błąd");
  } finally {
    setIsSubmitting(false);
  }
};
```

## 8. User Interactions

### 8.1 Step 1: Allergies Selection

| Interaction              | Handler               | Outcome                                                 |
| ------------------------ | --------------------- | ------------------------------------------------------- |
| Check allergy checkbox   | `onChange(allergies)` | Add allergy to `formData.allergies`                     |
| Uncheck allergy checkbox | `onChange(allergies)` | Remove allergy from `formData.allergies`                |
| Check "Brak alergii"     | `onNoneChange(true)`  | Clear `formData.allergies`, set `hasNoAllergies = true` |
| Uncheck "Brak alergii"   | `onNoneChange(false)` | Set `hasNoAllergies = false`                            |
| Click "Dalej"            | `goToNextStep()`      | Validate and advance to step 2                          |

### 8.2 Step 2: Diets Selection

| Interaction           | Handler               | Outcome                                         |
| --------------------- | --------------------- | ----------------------------------------------- |
| Check diet checkbox   | `onChange(diets)`     | Add diet to `formData.diets`                    |
| Uncheck diet checkbox | `onChange(diets)`     | Remove diet from `formData.diets`               |
| Check "Brak diety"    | `onNoneChange(true)`  | Clear `formData.diets`, set `hasNoDiets = true` |
| Uncheck "Brak diety"  | `onNoneChange(false)` | Set `hasNoDiets = false`                        |
| Click "Wstecz"        | `goToPreviousStep()`  | Return to step 1                                |
| Click "Dalej"         | `goToNextStep()`      | Validate and advance to step 3                  |

### 8.3 Step 3: Equipment Selection

| Interaction                | Handler               | Outcome                                    |
| -------------------------- | --------------------- | ------------------------------------------ |
| Check equipment checkbox   | `onChange(equipment)` | Add to `formData.equipment`                |
| Uncheck equipment checkbox | `onChange(equipment)` | Remove from `formData.equipment`           |
| Click "Wstecz"             | `goToPreviousStep()`  | Return to step 2                           |
| Click "Dalej"              | `goToNextStep()`      | Advance to step 4 (no validation required) |

### 8.4 Step 4: Staples Confirmation

| Interaction        | Handler              | Outcome                              |
| ------------------ | -------------------- | ------------------------------------ |
| Click "Wstecz"     | `goToPreviousStep()` | Return to step 3                     |
| Click "Rozpocznij" | `submitOnboarding()` | Init staples, save profile, redirect |

## 9. Conditions and Validation

### 9.1 Step 1 Validation (Allergies)

**Condition:** User must either:

- Select at least one allergy from the list, OR
- Check "Brak alergii" (No allergies)

**Implementation:**

```typescript
const validateAllergiesStep = (): StepValidationResult => {
  if (formData.allergies.length === 0 && !hasNoAllergies) {
    return {
      isValid: false,
      error: "Wybierz przynajmniej jedną alergię lub zaznacz 'Brak alergii'",
    };
  }

  // Validate values exist in config
  const invalidAllergies = formData.allergies.filter((a) => !config?.supported_allergies.includes(a));
  if (invalidAllergies.length > 0) {
    return {
      isValid: false,
      error: "Nieprawidłowe wartości alergii",
    };
  }

  return { isValid: true };
};
```

**UI Impact:**

- "Dalej" button disabled if validation fails
- Error message displayed below checkbox group
- Error clears when valid selection is made

### 9.2 Step 2 Validation (Diets)

**Condition:** User must either:

- Select at least one diet from the list, OR
- Check "Brak diety" (No diet)

**Implementation:** Similar to allergies validation

**UI Impact:** Same as step 1

### 9.3 Step 3 Validation (Equipment)

**Condition:** No validation required - empty selection is allowed.

**API Validation:** Values must exist in `config.supported_equipment` (validated server-side)

### 9.4 "None" Option Exclusivity

**Condition:** When "Brak alergii" or "Brak diety" is checked:

- Clear all other selections in that group
- Disable other checkboxes (visual feedback)

**Implementation:**

```typescript
const handleNoneChange = (checked: boolean) => {
  if (checked) {
    setFormData((prev) => ({ ...prev, allergies: [] }));
  }
  setHasNoAllergies(checked);
};

const handleAllergyChange = (allergy: string, checked: boolean) => {
  // If selecting an allergy, clear "None" option
  if (checked && hasNoAllergies) {
    setHasNoAllergies(false);
  }

  setFormData((prev) => ({
    ...prev,
    allergies: checked ? [...prev.allergies, allergy] : prev.allergies.filter((a) => a !== allergy),
  }));
};
```

### 9.5 Navigation Validation

| Step | "Wstecz" Available | "Dalej" Validation      |
| ---- | ------------------ | ----------------------- |
| 1    | No                 | Allergies validation    |
| 2    | Yes                | Diets validation        |
| 3    | Yes                | None (proceed freely)   |
| 4    | Yes                | N/A (uses "Rozpocznij") |

## 10. Error Handling

### 10.1 Configuration Loading Error

**Scenario:** GET /api/config fails

**Handling:**

```typescript
if (response.status === 401) {
  // Session expired or unauthenticated
  toast.error("Sesja wygasła. Zaloguj się ponownie.");
  router.push("/login");
} else {
  // Server error or network issue
  setConfigError("Nie udało się załadować konfiguracji. Spróbuj odświeżyć stronę.");
}
```

**UI:**

- Display error message with retry button
- Hide wizard content until config loads successfully

### 10.2 Profile Update Error

**Scenario:** PUT /api/profile fails

| Status | Message (Polish)                    | Action                                  |
| ------ | ----------------------------------- | --------------------------------------- |
| 400    | "Nieprawidłowe dane"                | Display inline field errors             |
| 401    | "Sesja wygasła"                     | Redirect to `/login`                    |
| 422    | "Nieprawidłowe wartości: {details}" | Show toast with specific invalid values |
| 500    | "Wystąpił błąd serwera"             | Show toast, allow retry                 |

### 10.3 Staples Initialization Error

**Scenario:** POST /api/inventory/staples/init fails

**Handling:**

- Show toast: "Nie udało się zainicjalizować produktów podstawowych"
- Do NOT proceed to profile update
- Allow user to retry

### 10.4 Network Error

**Scenario:** Fetch fails due to network issues

**Handling:**

```typescript
try {
  const response = await fetch(/* ... */);
} catch (error) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    toast.error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.");
  }
}
```

### 10.5 Error Message Component

```typescript
// Inline error display
{error && (
  <p className="text-sm text-destructive mt-2" role="alert">
    {error}
  </p>
)}

// Toast notifications using sonner
toast.error("Error message", {
  duration: Infinity, // Manual dismiss for errors
  action: {
    label: "Spróbuj ponownie",
    onClick: () => retry(),
  },
});
```

## 11. Implementation Steps

### Step 1: Create Directory Structure

```bash
mkdir -p src/app/onboarding/components
mkdir -p src/app/onboarding/hooks
touch src/app/onboarding/page.tsx
touch src/app/onboarding/types.ts
touch src/app/onboarding/hooks/useOnboarding.ts
touch src/app/onboarding/components/OnboardingWizard.tsx
touch src/app/onboarding/components/OnboardingProgressBar.tsx
touch src/app/onboarding/components/OnboardingStepAllergies.tsx
touch src/app/onboarding/components/OnboardingStepDiets.tsx
touch src/app/onboarding/components/OnboardingStepEquipment.tsx
touch src/app/onboarding/components/OnboardingStepStaples.tsx
touch src/app/onboarding/components/CheckboxGroupField.tsx
```

### Step 2: Define View Types

Create `src/app/onboarding/types.ts` with:

- `OnboardingFormData` interface
- `OnboardingStep` interface
- `StepValidationResult` interface
- `NoneOptionConfig` interface

### Step 3: Install/Verify shadcn/ui Components

Ensure required shadcn/ui components are installed:

```bash
npx shadcn@latest add card checkbox progress
```

### Step 4: Implement CheckboxGroupField Component

Build reusable checkbox group with:

- Fieldset/legend for accessibility
- Individual checkbox items from options array
- Optional "None" exclusive option
- Error message display
- Disabled state handling

### Step 5: Implement OnboardingProgressBar

Create accessible progress indicator:

- ARIA progressbar role with valuenow, valuemin, valuemax
- Visual step indicators (4 circles/segments)
- Polish step labels
- Tailwind styling for active/inactive states

### Step 6: Implement useOnboarding Hook

Build custom hook with:

- State for currentStep, formData, config, loading, errors
- `fetchConfig()` - GET /api/config
- `validateStep(step)` - Step-specific validation
- `goToNextStep()` - Validate and advance
- `goToPreviousStep()` - Navigate back
- `submitOnboarding()` - Call APIs and redirect

### Step 7: Implement Step Components

For each step component (Allergies, Diets, Equipment, Staples):

- Define props interface
- Render step title and description (Polish)
- Use CheckboxGroupField for steps 1-3
- Handle "None" option for steps 1-2
- Display loading state for step 4

### Step 8: Implement OnboardingWizard

Assemble main wizard component:

- Use `useOnboarding` hook
- Conditional rendering based on config loading state
- Switch/conditional for step components
- Navigation button row with proper labels
- Error boundary for graceful error handling

### Step 9: Implement Page Component

Create server component page:

- Server-side auth check with Supabase server client
- Check profile onboarding_status for redirect
- Render OnboardingWizard client component

### Step 10: Update Middleware

Add onboarding route protection in `src/middleware.ts`:

- Redirect unauthenticated users to `/login`
- Allow access to `/onboarding` for pending users
- Block access to AI features for users with `onboarding_status === "pending"`

### Step 11: Add Toast Provider

Ensure sonner toast provider is set up in root layout for error notifications.

### Step 12: Test Scenarios

Manual testing checklist:

- [ ] Unauthenticated access redirects to login
- [ ] Completed onboarding redirects to inventory
- [ ] All allergies display from config
- [ ] All diets display from config
- [ ] All equipment displays from config
- [ ] "Brak alergii" clears and disables other allergies
- [ ] "Brak diety" clears and disables other diets
- [ ] Cannot proceed from step 1 without selection
- [ ] Cannot proceed from step 2 without selection
- [ ] Can proceed from step 3 with empty selection
- [ ] Back navigation works on steps 2-4
- [ ] Final submission creates staples
- [ ] Final submission updates profile with selections
- [ ] Final submission sets onboarding_status to "completed"
- [ ] Success redirects to /inventory
- [ ] 401 errors redirect to login
- [ ] Network errors show appropriate toast
- [ ] Validation errors show inline messages

### Step 13: Accessibility Audit

- [ ] Keyboard navigation through all checkboxes
- [ ] Focus visible on all interactive elements
- [ ] Screen reader announces step changes
- [ ] Progress bar has proper ARIA attributes
- [ ] Error messages associated with form fields
- [ ] Fieldset/legend for checkbox groups
