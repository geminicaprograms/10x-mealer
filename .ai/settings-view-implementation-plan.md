# View Implementation Plan: Settings Page

## 1. Overview

The Settings Page (`/settings`) serves as the central hub for users to manage their account preferences, view AI usage statistics, and perform account-related actions. It provides a single, scrollable page with clearly separated sections:

1. **Preferencje (Preferences)** - Edit allergies, diets, and kitchen equipment
2. **Podstawowe produkty (Staples)** - Quick link to staples management in inventory
3. **Użycie AI (AI Usage)** - Display remaining scans and substitutions for today
4. **Konto (Account)** - Logout and account deletion actions

The page integrates with the existing profile management API, AI usage tracking, and authentication system to provide a comprehensive settings experience.

## 2. View Routing

- **Path**: `/settings`
- **File Location**: `src/app/settings/page.tsx`
- **Layout**: `src/app/settings/layout.tsx` (optional, can use root layout)
- **Protection**: Requires authentication (middleware redirects unauthenticated users to `/login`)

The route should be added to the `BottomNavigation` component as the fourth navigation item.

## 3. Component Structure

```
src/app/settings/
├── page.tsx                          # Main settings page (server component wrapper)
├── layout.tsx                        # Optional layout with header
├── components/
│   ├── index.ts                      # Barrel export
│   ├── SettingsContainer.tsx         # Main client container with data fetching
│   ├── PreferencesSection.tsx        # Preferences card with edit functionality
│   ├── PreferencesEditSheet.tsx      # Bottom sheet for editing preferences
│   ├── StaplesSection.tsx            # Staples link card
│   ├── AIUsageSection.tsx            # AI usage statistics card
│   ├── AccountSection.tsx            # Account actions card (logout, delete)
│   └── LogoutConfirmDialog.tsx       # Logout confirmation dialog
└── hooks/
    ├── index.ts                      # Barrel export
    └── useSettings.ts                # Main settings state management hook
```

### Component Hierarchy

```
SettingsPage (page.tsx)
└── SettingsContainer
    ├── Header (optional - "Ustawienia" title)
    ├── PreferencesSection
    │   └── PreferencesEditSheet (triggered on edit)
    │       └── CheckboxGroupField (reused from onboarding)
    ├── StaplesSection
    ├── AIUsageSection
    │   └── AIUsageIndicator
    ├── AccountSection
    │   ├── LogoutConfirmDialog
    │   └── DeleteAccountModal (existing component)
    └── LoadingState / ErrorState (conditional)
```

## 4. Component Details

### 4.1 SettingsContainer

- **Description**: Main client component that orchestrates data fetching, state management, and renders all settings sections. Acts as the data layer for child components.
- **Main elements**:
  - Loading skeleton during initial fetch
  - Error state with retry button
  - Vertical stack of Card sections with consistent spacing
  - Toast notifications for success/error feedback
- **Handled interactions**:
  - Initial data loading on mount
  - Retry on error
  - Coordinates state updates across sections
- **Handled validation**: None directly (delegated to child components)
- **Types**: `SettingsViewModel`, `ProfileDTO`, `AIUsageDTO`, `SystemConfigDTO`
- **Props**: None (fetches own data)

### 4.2 PreferencesSection

- **Description**: Displays user's current preferences (allergies, diets, equipment) in a read-only card with an edit button that opens the edit sheet.
- **Main elements**:
  - `Card` with `CardHeader` ("Preferencje") and `CardContent`
  - Three subsections with labels and `Badge` lists for each preference type
  - Edit button (`Button` with edit icon) in card header
  - Empty state text when no preferences selected ("Brak" for each empty list)
- **Handled interactions**:
  - Click edit button → opens `PreferencesEditSheet`
- **Handled validation**: None (read-only display)
- **Types**: `ProfileDTO`, `PreferencesSectionProps`
- **Props**:
  ```typescript
  interface PreferencesSectionProps {
    profile: ProfileDTO;
    onEditClick: () => void;
  }
  ```

### 4.3 PreferencesEditSheet

- **Description**: Bottom sheet modal for editing user preferences. Reuses the checkbox group pattern from onboarding but in a single scrollable sheet with all three preference types.
- **Main elements**:
  - `Sheet` component (bottom sheet on mobile)
  - `SheetHeader` with title "Edytuj preferencje"
  - `ScrollArea` containing three collapsible sections:
    - Allergies (`CheckboxGroupField` with "Brak alergii" option)
    - Diets (`CheckboxGroupField` with "Brak diety" option)
    - Equipment (`CheckboxGroupField`)
  - `SheetFooter` with Cancel and Save buttons
  - Loading state on save button
- **Handled interactions**:
  - Toggle individual checkboxes
  - Toggle "Brak alergii" / "Brak diety" exclusive options
  - Cancel → closes sheet without saving
  - Save → validates and calls PUT /api/profile
- **Handled validation**:
  - Values must exist in `SystemConfigDTO.supported_*` arrays
  - If "Brak alergii" selected, allergies array must be empty
  - If "Brak diety" selected, diets array must be empty
- **Types**: `ProfileDTO`, `ProfileUpdateCommand`, `SystemConfigDTO`, `PreferencesFormData`
- **Props**:
  ```typescript
  interface PreferencesEditSheetProps {
    isOpen: boolean;
    onClose: () => void;
    profile: ProfileDTO;
    config: SystemConfigDTO;
    onSave: (data: ProfileUpdateCommand) => Promise<void>;
    isSaving: boolean;
  }
  ```

### 4.4 StaplesSection

- **Description**: Simple card with a link to the staples tab in inventory. Provides quick access to staples management.
- **Main elements**:
  - `Card` with `CardHeader` ("Podstawowe produkty")
  - `CardContent` with descriptive text
  - `Link` button to `/inventory?tab=staples` or `/inventory#staples`
- **Handled interactions**:
  - Click link → navigates to inventory staples tab
- **Handled validation**: None
- **Types**: None specific
- **Props**: None

### 4.5 AIUsageSection

- **Description**: Displays the user's AI feature usage statistics for the current day, including receipt scans and substitution requests.
- **Main elements**:
  - `Card` with `CardHeader` ("Użycie AI")
  - `CardContent` with two usage indicators:
    - Receipt scans: "Skanowania: X/Y pozostało"
    - Substitutions: "Zamienniki: X/Y pozostało"
  - Progress bars or visual indicators for each limit
  - Date display showing "Dzisiaj (DD.MM.YYYY)"
  - Informational text about daily reset
- **Handled interactions**: None (read-only display)
- **Handled validation**: None
- **Types**: `AIUsageDTO`, `AIUsageCounterDTO`
- **Props**:
  ```typescript
  interface AIUsageSectionProps {
    usage: AIUsageDTO | null;
    isLoading: boolean;
  }
  ```

### 4.6 AccountSection

- **Description**: Contains account management actions including logout and account deletion with appropriate confirmation dialogs.
- **Main elements**:
  - `Card` with `CardHeader` ("Konto")
  - `CardContent` with vertical button stack:
    - Logout button (`Button` variant="outline")
    - Delete account button (`Button` variant="destructive")
  - `LogoutConfirmDialog` (rendered conditionally)
  - `DeleteAccountModal` (existing component, rendered conditionally)
- **Handled interactions**:
  - Click logout → opens `LogoutConfirmDialog`
  - Confirm logout → calls Supabase signOut, clears local data, redirects to /login
  - Click delete account → opens `DeleteAccountModal`
  - Confirm delete → calls POST /api/auth/delete-account
- **Handled validation**: Delegated to `DeleteAccountModal`
- **Types**: `DeleteAccountCommand`
- **Props**:
  ```typescript
  interface AccountSectionProps {
    onLogout: () => Promise<void>;
    onDeleteAccount: (data: DeleteAccountCommand) => Promise<void>;
    isLoggingOut: boolean;
    isDeletingAccount: boolean;
  }
  ```

### 4.7 LogoutConfirmDialog

- **Description**: Simple confirmation dialog for logout action to prevent accidental logouts.
- **Main elements**:
  - `AlertDialog` component
  - Title: "Wylogowanie"
  - Description: "Czy na pewno chcesz się wylogować?"
  - Cancel button
  - Confirm button
- **Handled interactions**:
  - Cancel → closes dialog
  - Confirm → triggers logout callback
- **Handled validation**: None
- **Types**: None specific
- **Props**:
  ```typescript
  interface LogoutConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
  }
  ```

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

```typescript
// Profile types
interface ProfileDTO {
  id: string;
  allergies: string[];
  diets: string[];
  equipment: string[];
  onboarding_status: "pending" | "completed";
  created_at: string;
  updated_at: string;
}

interface ProfileUpdateCommand {
  allergies?: string[];
  diets?: string[];
  equipment?: string[];
  onboarding_status?: "pending" | "completed";
}

// AI Usage types
interface AIUsageCounterDTO {
  used: number;
  limit: number;
  remaining: number;
}

interface AIUsageDTO {
  date: string;
  receipt_scans: AIUsageCounterDTO;
  substitutions: AIUsageCounterDTO;
}

// System config types
interface SystemConfigDTO {
  supported_allergies: string[];
  supported_diets: string[];
  supported_equipment: string[];
  rate_limits: {
    receipt_scans_per_day: number;
    substitutions_per_day: number;
  };
}

// Account deletion types
interface DeleteAccountCommand {
  password: string;
  confirmation: string;
}

interface DeleteAccountResponseDTO {
  message: string;
}

// Error types
interface ErrorResponseDTO {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
```

### 5.2 New View Model Types (to add in `src/app/settings/types.ts`)

```typescript
/**
 * Combined view model for the settings page containing all required data
 */
export interface SettingsViewModel {
  profile: ProfileDTO | null;
  aiUsage: AIUsageDTO | null;
  config: SystemConfigDTO | null;
}

/**
 * Form data for preferences editing
 */
export interface PreferencesFormData {
  allergies: string[];
  diets: string[];
  equipment: string[];
  hasNoAllergies: boolean;
  hasNoDiets: boolean;
}

/**
 * Settings page loading states
 */
export interface SettingsLoadingState {
  profile: boolean;
  aiUsage: boolean;
  config: boolean;
  saving: boolean;
  loggingOut: boolean;
  deletingAccount: boolean;
}

/**
 * Settings page error states
 */
export interface SettingsErrorState {
  profile: string | null;
  aiUsage: string | null;
  config: string | null;
  save: string | null;
}
```

## 6. State Management

### 6.1 Custom Hook: `useSettings`

The settings page requires a custom hook to manage:

- Fetching profile, AI usage, and system config data
- Handling loading and error states for each API call
- Managing preferences editing state
- Handling logout and account deletion flows

```typescript
// src/app/settings/hooks/useSettings.ts

interface UseSettingsReturn {
  // Data
  profile: ProfileDTO | null;
  aiUsage: AIUsageDTO | null;
  config: SystemConfigDTO | null;

  // Loading states
  isLoading: boolean;
  isLoadingProfile: boolean;
  isLoadingAIUsage: boolean;
  isLoadingConfig: boolean;
  isSavingPreferences: boolean;
  isLoggingOut: boolean;
  isDeletingAccount: boolean;

  // Error states
  errors: SettingsErrorState;

  // Edit sheet state
  isEditSheetOpen: boolean;
  openEditSheet: () => void;
  closeEditSheet: () => void;

  // Dialog states
  isLogoutDialogOpen: boolean;
  openLogoutDialog: () => void;
  closeLogoutDialog: () => void;
  isDeleteModalOpen: boolean;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;

  // Actions
  savePreferences: (data: ProfileUpdateCommand) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (data: DeleteAccountCommand) => Promise<void>;
  retryFetch: () => void;
}
```

### 6.2 State Flow

1. **Initial Load**:
   - Fetch profile, AI usage, and config in parallel
   - Show loading skeleton during fetch
   - Handle errors with retry option

2. **Preferences Edit**:
   - Open sheet → populate form with current profile data
   - User makes changes
   - Save → validate → PUT /api/profile → update local state → close sheet

3. **Logout**:
   - Open confirmation dialog
   - Confirm → call Supabase signOut → clear local storage → redirect to /login

4. **Account Deletion**:
   - Open delete modal (existing component)
   - User enters password and confirmation
   - Submit → POST /api/auth/delete-account → redirect to /login

## 7. API Integration

### 7.1 GET /api/profile

- **When**: On component mount
- **Request**: None (auth via cookies)
- **Response**: `ProfileDTO`
- **Error handling**:
  - 401 → Redirect to /login
  - 404 → Show error state (rare, should not happen)
  - 500 → Show error with retry

### 7.2 GET /api/ai/usage

- **When**: On component mount
- **Request**: None (auth via cookies)
- **Response**: `AIUsageDTO`
- **Error handling**:
  - 401 → Redirect to /login
  - 500 → Show error with retry (AI usage section can fail independently)

### 7.3 GET /api/config

- **When**: On component mount (needed for preferences editing)
- **Request**: None (auth via cookies)
- **Response**: `SystemConfigDTO`
- **Error handling**:
  - 401 → Redirect to /login
  - 500 → Show error with retry

### 7.4 PUT /api/profile

- **When**: User saves preferences in edit sheet
- **Request**: `ProfileUpdateCommand`
  ```typescript
  {
    allergies: string[],
    diets: string[],
    equipment: string[]
  }
  ```
- **Response**: `ProfileDTO`
- **Error handling**:
  - 400 → Show validation errors inline
  - 401 → Redirect to /login
  - 422 → Show specific field errors (invalid values)
  - 500 → Show toast error

### 7.5 POST /api/auth/delete-account

- **When**: User confirms account deletion in modal
- **Request**: `DeleteAccountCommand`
  ```typescript
  {
    password: string,
    confirmation: "USUŃ MOJE KONTO"
  }
  ```
- **Response**: `DeleteAccountResponseDTO`
- **Error handling**:
  - 400 → Show validation errors
  - 401 → Redirect to /login
  - 403 → Show "Invalid password or confirmation" error
  - 500 → Show toast error

### 7.6 Supabase Auth signOut

- **When**: User confirms logout
- **Method**: `supabase.auth.signOut()`
- **Post-action**: Clear local storage, redirect to /login

## 8. User Interactions

### 8.1 View Preferences

| Action      | Component          | Result                                                    |
| ----------- | ------------------ | --------------------------------------------------------- |
| Page load   | SettingsContainer  | Fetch profile, AI usage, config; display loading skeleton |
| Data loaded | PreferencesSection | Display current preferences with badges                   |

### 8.2 Edit Preferences

| Action                | Component            | Result                                         |
| --------------------- | -------------------- | ---------------------------------------------- |
| Click "Edytuj" button | PreferencesSection   | Open PreferencesEditSheet                      |
| Toggle checkbox       | PreferencesEditSheet | Update local form state                        |
| Toggle "Brak alergii" | PreferencesEditSheet | Clear allergies, disable checkboxes            |
| Click "Anuluj"        | PreferencesEditSheet | Close sheet, discard changes                   |
| Click "Zapisz"        | PreferencesEditSheet | Validate, save to API, close sheet, show toast |

### 8.3 Navigate to Staples

| Action             | Component      | Result                                         |
| ------------------ | -------------- | ---------------------------------------------- |
| Click staples link | StaplesSection | Navigate to /inventory with staples tab active |

### 8.4 Logout

| Action                    | Component           | Result                                   |
| ------------------------- | ------------------- | ---------------------------------------- |
| Click "Wyloguj"           | AccountSection      | Open LogoutConfirmDialog                 |
| Click "Anuluj"            | LogoutConfirmDialog | Close dialog                             |
| Click "Wyloguj" (confirm) | LogoutConfirmDialog | Sign out, clear data, redirect to /login |

### 8.5 Delete Account

| Action                       | Component          | Result                                    |
| ---------------------------- | ------------------ | ----------------------------------------- |
| Click "Usuń konto"           | AccountSection     | Open DeleteAccountModal                   |
| Enter password               | DeleteAccountModal | Update form state                         |
| Enter confirmation           | DeleteAccountModal | Update form state, enable submit if valid |
| Click "Anuluj"               | DeleteAccountModal | Close modal, reset form                   |
| Click "Usuń konto" (confirm) | DeleteAccountModal | Validate, call API, redirect to /login    |

## 9. Conditions and Validation

### 9.1 Preferences Validation

| Condition                                  | Component            | Effect                        |
| ------------------------------------------ | -------------------- | ----------------------------- |
| Allergies must be from supported_allergies | PreferencesEditSheet | Show error, prevent save      |
| Diets must be from supported_diets         | PreferencesEditSheet | Show error, prevent save      |
| Equipment must be from supported_equipment | PreferencesEditSheet | Show error, prevent save      |
| "Brak alergii" selected                    | PreferencesEditSheet | Allergies array must be empty |
| "Brak diety" selected                      | PreferencesEditSheet | Diets array must be empty     |

### 9.2 Account Deletion Validation

| Condition                              | Component          | Effect                 |
| -------------------------------------- | ------------------ | ---------------------- |
| Password required                      | DeleteAccountModal | Show error if empty    |
| Confirmation required                  | DeleteAccountModal | Show error if empty    |
| Confirmation must be "USUŃ MOJE KONTO" | DeleteAccountModal | Show error if mismatch |
| Password must be correct               | API (403 response) | Show error in modal    |

### 9.3 UI State Conditions

| Condition          | Component            | Effect                                |
| ------------------ | -------------------- | ------------------------------------- |
| Profile loading    | SettingsContainer    | Show skeleton for preferences section |
| AI usage loading   | AIUsageSection       | Show skeleton for usage indicators    |
| Config loading     | PreferencesEditSheet | Disable edit button until loaded      |
| Saving preferences | PreferencesEditSheet | Disable buttons, show spinner         |
| Logging out        | LogoutConfirmDialog  | Disable buttons, show spinner         |
| Deleting account   | DeleteAccountModal   | Disable buttons, show spinner         |

## 10. Error Handling

### 10.1 Network Errors

| Error                        | Component         | User Feedback                                         |
| ---------------------------- | ----------------- | ----------------------------------------------------- |
| Failed to fetch (no network) | SettingsContainer | Toast: "Brak połączenia z internetem" + retry button  |
| Timeout                      | SettingsContainer | Toast: "Przekroczono czas oczekiwania" + retry button |

### 10.2 Authentication Errors

| Error           | HTTP Status | User Feedback                               |
| --------------- | ----------- | ------------------------------------------- |
| Session expired | 401         | Toast: "Sesja wygasła" + redirect to /login |
| Invalid token   | 401         | Redirect to /login                          |

### 10.3 Validation Errors

| Error                         | HTTP Status | User Feedback                                     |
| ----------------------------- | ----------- | ------------------------------------------------- |
| Invalid allergies values      | 422         | Inline error: "Nieprawidłowe wartości alergii"    |
| Invalid diets values          | 422         | Inline error: "Nieprawidłowe wartości diet"       |
| Invalid equipment values      | 422         | Inline error: "Nieprawidłowe wartości sprzętu"    |
| Wrong password (deletion)     | 403         | Inline error: "Nieprawidłowe hasło"               |
| Wrong confirmation (deletion) | 403         | Inline error: "Nieprawidłowy tekst potwierdzenia" |

### 10.4 Server Errors

| Error                 | HTTP Status | User Feedback                             |
| --------------------- | ----------- | ----------------------------------------- |
| Internal server error | 500         | Toast: "Wystąpił błąd. Spróbuj ponownie." |
| Service unavailable   | 503         | Toast: "Serwis tymczasowo niedostępny"    |

### 10.5 Error Recovery

- Profile fetch error: Show retry button in PreferencesSection
- AI usage fetch error: Show "Nie udało się załadować" message with retry link
- Config fetch error: Disable edit button, show tooltip explaining the issue
- Save error: Keep edit sheet open, show error message, allow retry

## 11. Implementation Steps

### Step 1: Create Directory Structure and Types

1. Create `src/app/settings/` directory
2. Create `src/app/settings/components/` directory
3. Create `src/app/settings/hooks/` directory
4. Create `src/app/settings/types.ts` with view model types

### Step 2: Implement Custom Hook

1. Create `src/app/settings/hooks/useSettings.ts`
2. Implement parallel data fetching for profile, AI usage, and config
3. Implement loading and error state management
4. Implement modal/sheet state management
5. Implement `savePreferences` action
6. Implement `logout` action using Supabase client
7. Implement `deleteAccount` action
8. Create `src/app/settings/hooks/index.ts` barrel export

### Step 3: Implement Base Components

1. Create `AIUsageSection.tsx` - simplest component to start
2. Create `StaplesSection.tsx` - simple link component
3. Create `LogoutConfirmDialog.tsx` - simple AlertDialog
4. Create `AccountSection.tsx` - composition of logout and delete

### Step 4: Implement Preferences Components

1. Create `PreferencesSection.tsx` - read-only display
2. Create `PreferencesEditSheet.tsx` - edit sheet with form
   - Reuse `CheckboxGroupField` from onboarding or recreate locally
3. Wire up validation logic matching API requirements

### Step 5: Implement Container and Page

1. Create `SettingsContainer.tsx` - main client component
   - Wire up `useSettings` hook
   - Render loading/error states
   - Compose all section components
2. Create `src/app/settings/page.tsx` - server component wrapper
3. Optionally create `layout.tsx` for header

### Step 6: Update Navigation

1. Update `src/components/BottomNavigation.tsx`:
   - Add Settings nav item with Settings icon
   - Add `/settings` route with "Ustawienia" label
   - Add matchPrefix for active state

### Step 7: Integration Testing

1. Test profile fetching and display
2. Test preferences editing flow (open, edit, save, cancel)
3. Test AI usage display
4. Test staples navigation link
5. Test logout flow (confirm, cancel)
6. Test account deletion flow (existing modal integration)
7. Test error states and recovery

### Step 8: Accessibility and Polish

1. Verify proper heading hierarchy (h1 → h2 for sections)
2. Add ARIA labels to all icon buttons
3. Ensure keyboard navigation works
4. Test with screen reader
5. Verify focus management in modals/sheets
6. Add Polish translations for all user-facing text

### Step 9: Final Review

1. Verify all user stories (US-004, US-005) are satisfied
2. Test responsive behavior (mobile-first)
3. Check loading states and skeletons
4. Verify toast notifications appear correctly
5. Test error handling for all API failure scenarios
