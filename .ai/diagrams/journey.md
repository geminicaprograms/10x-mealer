# User Journey Diagram - Mealer

## Analysis

<user_journey_analysis>

### 1. User paths mentioned in the specification

Based on PRD and user stories (US-001 to US-018):

1. **US-001 - Registration**: New user creates account
2. **US-002 - Login**: Returning user logs in
3. **US-003 - Password Reset**: User recovers account access
4. **US-004 - Logout**: User ends session
5. **US-005 - Profile Setup**: Mandatory onboarding (allergies, diets, equipment)
6. **US-006 to US-010 - Inventory Management**: Scanning, verification, viewing, staples
7. **US-011 to US-013 - Recipes**: Import, analysis, cooking
8. **US-018 - Account Deletion**: Permanent data removal

### 2. Main journeys and their states

**New user journey:**

```
Landing page → Registration → Onboarding (4 steps) → Inventory
```

**Returning user journey:**

```
Landing page → Login → Inventory
```

**Password recovery journey:**

```
Login → Reset password → Email → Callback → New password → Login
```

**Main app journey:**

```
Inventory ↔ Recipes ↔ Settings
```

**Account deletion journey:**

```
Settings → Deletion modal → Confirmation → Logout
```

### 3. Decision points and alternative paths

| Decision Point   | Conditions              | Paths                                       |
| ---------------- | ----------------------- | ------------------------------------------- |
| After login      | onboarding_status       | pending → Onboarding, completed → Inventory |
| Login form       | result                  | success → continue, error → retry           |
| Receipt scanning | image quality           | OK → verification, error → retake photo     |
| Recipe analysis  | ingredient availability | all → cook, missing → substitutions         |
| AI limit         | daily limit             | OK → AI feature, exceeded → limitations     |
| Account deletion | confirmation            | correct → delete, incorrect → cancel        |

### 4. Purpose of each state

| State          | Business Purpose                           |
| -------------- | ------------------------------------------ |
| Landing page   | Welcome, encourage registration/login      |
| Registration   | Create user account                        |
| Login          | Access existing account                    |
| Password reset | Recover account access                     |
| Onboarding     | Collect preferences for AI personalization |
| Inventory      | Manage available products                  |
| Scanning       | Quick product addition from receipt        |
| Verification   | Correct AI errors before saving            |
| Recipes        | Import and analyze recipes                 |
| Substitutions  | Suggest replacements based on inventory    |
| Cooking        | Confirm ingredient usage                   |
| Settings       | Manage account and preferences             |

</user_journey_analysis>

## Main Diagram

<mermaid_diagram>

```mermaid
stateDiagram-v2
    [*] --> LandingPage

    state "Landing Page" as LandingPage {
        [*] --> Welcome
        Welcome: Mealer app presentation
        Welcome: Login and Register buttons
    }

    state "Authentication" as Authentication {
        state "Login" as Login {
            [*] --> LoginForm
            LoginForm: Email and password
            LoginForm --> LoginValidation

            state if_login <<choice>>
            LoginValidation --> if_login
            if_login --> SessionCreated: Credentials valid
            if_login --> LoginError: Credentials invalid
            LoginError --> LoginForm
        }

        state "Registration" as Registration {
            [*] --> RegisterForm
            RegisterForm: Email, password, confirmation
            RegisterForm --> RegisterValidation

            state if_register <<choice>>
            RegisterValidation --> if_register
            if_register --> AccountCreated: Data valid
            if_register --> RegisterError: Validation error
            RegisterError --> RegisterForm
        }

        state "Password Reset" as PasswordReset {
            [*] --> ResetForm
            ResetForm: Enter email
            ResetForm --> EmailSent
            EmailSent --> WaitingForLink
            WaitingForLink --> NewPassword: Click link
            NewPassword --> PasswordChanged
        }
    }

    state "Onboarding" as Onboarding {
        [*] --> AllergiesStep
        AllergiesStep: Select allergies or None
        AllergiesStep --> DietsStep: Next

        DietsStep: Select diets or None
        DietsStep --> EquipmentStep: Next
        DietsStep --> AllergiesStep: Back

        EquipmentStep: Select kitchen equipment
        EquipmentStep --> StaplesStep: Next
        EquipmentStep --> DietsStep: Back

        StaplesStep: Staples information
        StaplesStep --> OnboardingCompleted: Start
        StaplesStep --> EquipmentStep: Back
    }

    state "Application" as Application {
        state "Inventory" as Inventory {
            [*] --> ProductList
            ProductList: Browse products
            ProductList --> ReceiptScanning: Scan
            ProductList --> QuickAdd: Add manually
            ProductList --> ManageStaples: Staples

            ReceiptScanning --> ScanVerification
            ScanVerification --> ProductList: Confirm
            QuickAdd --> ProductList: Save
            ManageStaples --> ProductList: Done
        }

        state "Recipes" as Recipes {
            [*] --> ImportRecipe
            ImportRecipe: Paste URL or text
            ImportRecipe --> IngredientAnalysis

            state if_ingredients <<choice>>
            IngredientAnalysis --> if_ingredients
            if_ingredients --> AllAvailable: Have everything
            if_ingredients --> MissingIngredients: Missing items

            MissingIngredients --> AISubstitutions
            AISubstitutions --> ReadyToCook
            AllAvailable --> ReadyToCook

            ReadyToCook --> ConfirmUsage: Cooked
            ConfirmUsage --> DeductFromInventory
        }

        state "Settings" as Settings {
            [*] --> UserProfile
            UserProfile: Allergies, diets, equipment
            UserProfile --> EditProfile
            UserProfile --> DeleteAccount
            EditProfile --> UserProfile: Save
        }

        ProductList --> ImportRecipe: Recipes
        ImportRecipe --> ProductList: Inventory
        ProductList --> UserProfile: Settings
        UserProfile --> ProductList: Back
        DeductFromInventory --> ProductList
    }

    state "Account Deletion" as AccountDeletion {
        [*] --> ConfirmationModal
        ConfirmationModal: Enter password
        ConfirmationModal: Type confirmation text

        state if_delete <<choice>>
        ConfirmationModal --> if_delete
        if_delete --> AccountDeleted: Confirmation valid
        if_delete --> DeletionError: Verification error
        DeletionError --> ConfirmationModal
    }

    %% Transitions between main states
    LandingPage --> Login: Log in
    LandingPage --> Registration: Register

    Login --> Registration: No account?
    Registration --> Login: Have account?
    Login --> PasswordReset: Forgot password?
    PasswordReset --> Login: Back
    PasswordChanged --> Login

    SessionCreated --> Onboarding: New user
    SessionCreated --> Inventory: Returning user
    AccountCreated --> Onboarding

    OnboardingCompleted --> Inventory

    DeleteAccount --> AccountDeletion
    AccountDeleted --> LandingPage

    Application --> LandingPage: Logout
```

</mermaid_diagram>

## Detailed Diagram - Cooking Flow

<mermaid_diagram>

```mermaid
stateDiagram-v2
    [*] --> SelectRecipe

    state "Recipe Import" as SelectRecipe {
        [*] --> PasteURL
        PasteURL: Paste recipe link
        PasteURL --> FetchContent: Submit

        state if_url <<choice>>
        FetchContent --> if_url
        if_url --> ExtractIngredients: URL supported
        if_url --> PasteText: URL unsupported

        PasteText: Paste recipe text
        PasteText --> ExtractIngredients: Parse
    }

    state "Ingredient Analysis" as AnalyzeIngredients {
        [*] --> CompareWithInventory
        CompareWithInventory: Check availability

        state if_available <<choice>>
        CompareWithInventory --> if_available

        if_available --> IngredientsAvailable: All available
        if_available --> IngredientsPartial: Partially available
        if_available --> IngredientsMissing: Missing ingredients
    }

    state "AI Suggestions" as AISuggestions {
        [*] --> CheckLimit

        state if_limit <<choice>>
        CheckLimit --> if_limit
        if_limit --> GenerateSubstitutions: Limit OK
        if_limit --> NoLimitLeft: Limit exceeded

        GenerateSubstitutions: AI analyzes inventory
        GenerateSubstitutions --> DisplaySubstitutions
        DisplaySubstitutions: Substitution suggestions

        NoLimitLeft: Basic matching only
        NoLimitLeft --> DisplayMissing
    }

    state "Cooking" as Cooking {
        [*] --> PrepareIngredients
        PrepareIngredients: Preparation list
        PrepareIngredients --> Cook: Ready
        Cook --> CookedConfirmation: Cooked
    }

    state "Inventory Update" as InventoryUpdate {
        [*] --> UsageEstimate
        UsageEstimate: System estimates quantities
        UsageEstimate --> EditUsage
        EditUsage: User corrects amounts

        state if_confirm <<choice>>
        EditUsage --> if_confirm
        if_confirm --> DeductProducts: Confirm
        if_confirm --> CancelDeduction: Cancel

        DeductProducts --> UpdatedInventory
    }

    ExtractIngredients --> CompareWithInventory

    IngredientsAvailable --> PrepareIngredients
    IngredientsPartial --> CheckLimit
    IngredientsMissing --> CheckLimit

    DisplaySubstitutions --> PrepareIngredients: Accept
    DisplayMissing --> PrepareIngredients: Continue

    CookedConfirmation --> UsageEstimate

    UpdatedInventory --> [*]
    CancelDeduction --> [*]
```

</mermaid_diagram>

## Diagram - New User Path

<mermaid_diagram>

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Discovery

    state "App Discovery" as Discovery {
        LandingPage: Mealer landing page
    }

    state "Registration" as Registration {
        EnterEmail: Enter email
        EnterPassword: Create strong password
        ConfirmPassword: Confirm password
        ClickRegister: Click Register
    }

    state "Onboarding" as Onboarding {
        SelectAllergies: Mark allergies
        SelectDiets: Mark diets
        SelectEquipment: Mark equipment
        LearnStaples: Learn about Staples
    }

    state "First Steps" as FirstSteps {
        AddProducts: Scan receipt or add manually
        PasteRecipe: Paste first recipe
        SeeAnalysis: View AI analysis
    }

    state "Regular Use" as RegularUse {
        ManageInventory: Update products
        SearchRecipes: Import recipes
        Cook: Cook and deduct
    }

    Discovery --> Registration: Register
    Registration --> Onboarding: Account created
    Onboarding --> FirstSteps: Start
    FirstSteps --> RegularUse: Familiar
    RegularUse --> [*]: Logout
```

</mermaid_diagram>

## Key Success Metrics (from PRD)

| Metric                  | Target       | Related States               |
| ----------------------- | ------------ | ---------------------------- |
| Profile Completion Rate | 90%          | Onboarding → all 4 steps     |
| Weekly Active Usage     | 50% MAU      | Cooking → "Cooked This" flow |
| Scan Latency            | < 10 seconds | Scanning → Verification      |
| AI Accuracy             | < 15% edits  | Scan verification            |

## Error Scenarios

| Scenario           | Error State    | Recovery Path     |
| ------------------ | -------------- | ----------------- |
| Network error      | Error message  | Retry action      |
| Empty inventory    | Add suggestion | Scanning/Adding   |
| AI limit           | Info modal     | Basic matching    |
| Unreadable receipt | Retake request | Scanning          |
| Unsupported URL    | Text fallback  | Paste recipe text |
