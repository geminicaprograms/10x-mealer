# UI Architecture for Mealer

## 1. UI Structure Overview

Mealer is a Progressive Web App (PWA) designed for mobile browsers (iOS Safari, Android Chrome) with a Polish-only interface. The application follows a simple MVP philosophy with a mobile-first approach (320-428px viewport), centered on larger screens with max-width: 428px.

### Technical Foundation

- **Framework**: Next.js 15 with App Router, React 19, TypeScript 5
- **Styling**: Tailwind 4 + shadcn/ui components exclusively
- **State Management**: React Context (AuthContext, ProfileContext, AIUsageContext)
- **Local Storage**: IndexedDB for recipe data (copyright protection)
- **Theme**: Light mode only, no dark mode support

### Application Structure

The UI is organized into three main sections:

1. **Authentication Section** (`/login`, `/register`, `/reset-password`)
   - Full-screen pages, no navigation
   - Handles user authentication flows

2. **Onboarding Section** (`/onboarding`)
   - Multi-step wizard (4 steps)
   - Mandatory for new users before accessing AI features
   - Progress indicator with step navigation

3. **Main Application** (`/inventory`, `/recipes`, `/settings`)
   - Bottom navigation bar for primary navigation
   - Protected routes requiring authentication and completed onboarding
   - Consistent header with minimal controls

### Routing Structure

```
/                       → Redirect to /inventory (if authenticated) or /login
├── /login              → Login page
├── /register           → Registration page
├── /reset-password     → Password reset page
├── /onboarding         → Multi-step onboarding wizard
├── /inventory          → Inventory list with Products/Staples tabs
│   └── /inventory/scan → Receipt scanning flow
├── /recipes            → Recipe input and recent recipes list
│   └── /recipes/[id]   → Recipe detail with substitutions
└── /settings           → User settings and account management
```

---

## 2. View List

### 2.1 Authentication Views

#### 2.1.1 Login Page

- **Path**: `/login`
- **Main Purpose**: Allow returning users to authenticate with email/password
- **Key Information**:
  - Email input field
  - Password input field
  - Login button
  - "Zapomniałeś hasła?" (Forgot password) link
  - "Zarejestruj się" (Register) link
- **Key Components**:
  - `Input` (email, password) from shadcn/ui
  - `Button` for form submission
  - Form validation with inline error messages
- **UX Considerations**:
  - On-blur + on-submit validation
  - Polish error messages
  - Disabled button during submission with loading state
- **Accessibility**:
  - Semantic form elements with proper labels
  - Focus management on error
  - Keyboard navigation support
- **Security**:
  - Password field masked
  - Rate limiting on failed attempts (server-side)
  - Session managed via HTTP-only cookies
- **API Integration**:
  - Supabase Auth `signInWithPassword`
- **User Story Mapping**: US-002 (User Login)

---

#### 2.1.2 Registration Page

- **Path**: `/register`
- **Main Purpose**: Allow new users to create an account
- **Key Information**:
  - Email input field
  - Password input field with strength indicator
  - Password confirmation field
  - Register button
  - "Masz już konto? Zaloguj się" link
- **Key Components**:
  - `Input` (email, password, confirm password)
  - `Button` for form submission
  - Password strength validation indicator
- **UX Considerations**:
  - Real-time password strength feedback
  - Confirm password match validation
  - Clear success message before redirect
- **Accessibility**:
  - ARIA descriptions for password requirements
  - Error announcements for screen readers
- **Security**:
  - Password strength validation enforced
  - Passwords masked
- **API Integration**:
  - Supabase Auth `signUp`
- **User Story Mapping**: US-001 (User Registration)

---

#### 2.1.3 Password Reset Page

- **Path**: `/reset-password`
- **Main Purpose**: Allow users to request a password reset link
- **Key Information**:
  - Email input field
  - Submit button
  - "Powrót do logowania" link
  - Success message after submission
- **Key Components**:
  - `Input` (email)
  - `Button` for submission
  - `Alert` for success/error messages
- **UX Considerations**:
  - Clear confirmation message regardless of email existence (security)
  - Link back to login
- **Accessibility**:
  - Clear status messages
  - Focus management
- **Security**:
  - No indication whether email exists in system
  - Rate limiting on requests
- **API Integration**:
  - Supabase Auth `resetPasswordForEmail`
- **User Story Mapping**: US-003 (Password Reset)

---

### 2.2 Onboarding Views

#### 2.2.1 Onboarding Wizard

- **Path**: `/onboarding`
- **Main Purpose**: Collect mandatory user preferences before allowing access to AI features
- **Key Information**:
  - Progress indicator (step 1-4)
  - Step content (varies by step)
  - Navigation buttons (Dalej/Next, Wstecz/Back)
- **Steps**:
  1. **Allergies Selection**: Multi-select from `system_config.supported_allergies`, "Brak alergii" option
  2. **Diets Selection**: Multi-select from `system_config.supported_diets`, "Brak diety" option
  3. **Equipment Selection**: Multi-select from `system_config.supported_equipment`
  4. **Staples Initialization**: Confirmation to initialize default staples, "Rozpocznij" button
- **Key Components**:
  - Progress bar (custom with Tailwind)
  - `Checkbox` groups for selections
  - `Button` for navigation
  - `Card` wrapper for each step
- **UX Considerations**:
  - Cannot skip - mandatory completion
  - Progress clearly visible
  - Back navigation allowed (except step 1)
  - Final step confirms completion
- **Accessibility**:
  - ARIA progressbar
  - Clear step announcements
  - Checkbox groups with fieldset/legend
- **Security**:
  - Route protection - redirect to login if unauthenticated
- **API Integration**:
  - `GET /api/config` (fetch supported values on mount)
  - `PUT /api/profile` (save preferences)
  - `POST /api/inventory/staples/init` (initialize staples)
- **User Story Mapping**: US-005 (Mandatory Profile Setup)

---

### 2.3 Main Application Views

#### 2.3.1 Inventory Page

- **Path**: `/inventory`
- **Main Purpose**: Display and manage user's food inventory
- **Key Information**:
  - Tab navigation (Produkty/Podstawowe)
  - Products tab: List of quantitative items with name, quantity, unit, category
  - Staples tab: Checkbox list of staple items (have/don't have)
  - Filter row: Category filter, sort options
  - Search input (optional, above list)
  - Empty state with CTAs
- **Key Components**:
  - `Tabs` for Products/Staples switching
  - `Select` for category filter and sort options
  - `Card` for inventory item display
  - `Checkbox` for staple toggles
  - `Skeleton` for loading states
  - `Button` (FAB style) for scan/quick add actions
  - Custom empty state component
- **UX Considerations**:
  - Pull-to-refresh gesture (native browser)
  - Pagination: 50 items initially, "Załaduj więcej" button
  - Optimistic updates for staple toggles
  - Client-side search filtering
  - Swipe-to-delete on items (optional enhancement)
- **Accessibility**:
  - Proper list semantics (`ul`, `li`)
  - Interactive elements keyboard accessible
  - Filter/sort have clear labels
- **Security**:
  - Route protection via middleware
  - Onboarding check before AI features
- **API Integration**:
  - `GET /api/inventory` (with pagination, filters)
  - `GET /api/categories` (for filter dropdown)
  - `PUT /api/inventory/:id` (toggle staple availability, edit quantity)
  - `DELETE /api/inventory` (batch delete)
- **User Story Mapping**: US-008 (View Inventory), US-009 (Manage Pantry Staples)

---

#### 2.3.2 Receipt Scan Page

- **Path**: `/inventory/scan`
- **Main Purpose**: Scan grocery receipts and add items to inventory
- **Key Information**:
  - Image picker (gallery selection)
  - Image preview
  - Processing indicator (full-screen loader)
  - Verification list with confidence indicators
  - Item edit/delete/add capabilities
  - Confirm button
- **Key Components**:
  - `Input` with `type="file"` and `accept="image/*"`
  - Image preview container
  - Full-screen loading overlay with spinner
  - Verification list:
    - Confidence indicator (green/yellow/red dot)
    - Product name (editable via autocomplete)
    - Quantity input
    - Unit selector
    - Delete button
  - `Button` for "Dodaj produkt" (add missing item)
  - `Button` for confirm/cancel actions
  - `Alert` for partial success (207 response)
- **UX Considerations**:
  - Gallery selection only (no direct camera capture for MVP)
  - Full-screen loader during AI processing (<10s target)
  - Items sorted by confidence (low confidence first for review)
  - Inline autocomplete for unmatched products
  - Clear visual distinction between matched/unmatched items
  - Summary alert for batch operation results
- **Accessibility**:
  - File input properly labeled
  - Loading state announced
  - Edit fields properly labeled
- **Security**:
  - Image size validation (max 10MB)
  - Rate limit check before processing
- **API Integration**:
  - `POST /api/ai/scan-receipt` (process image)
  - `GET /api/products/search` (autocomplete)
  - `GET /api/units` (unit selector)
  - `POST /api/inventory` (batch add items)
  - `GET /api/ai/usage` (check remaining scans)
- **User Story Mapping**: US-006 (Scan Receipt), US-007 (Verify Scanned Items), US-014 (Rate Limiting)

---

#### 2.3.3 Quick Add Modal (Bottom Sheet)

- **Path**: N/A (modal overlay on `/inventory`)
- **Main Purpose**: Manually add a single item to inventory
- **Key Information**:
  - Product search input with autocomplete
  - Quantity input (numeric)
  - Unit selector
  - Add button
- **Key Components**:
  - `Sheet` (bottom sheet from shadcn/ui)
  - `Input` for product search with autocomplete dropdown
  - `Input` with `type="number"` for quantity
  - `Select` for unit selection
  - `Button` for add action
- **UX Considerations**:
  - Autocomplete suggests products as user types (2+ characters)
  - Can use custom name if no product matched
  - Default unit from selected product
  - Close on successful add
- **Accessibility**:
  - Focus trap within sheet
  - Escape key to close
  - Autocomplete results navigable via keyboard
- **API Integration**:
  - `GET /api/products/search` (autocomplete)
  - `GET /api/units` (unit options)
  - `POST /api/inventory` (single item add)
- **User Story Mapping**: US-010 (Manual Item Entry)

---

#### 2.3.4 Recipes Page

- **Path**: `/recipes`
- **Main Purpose**: Input recipe URLs/text and view recent recipes
- **Key Information**:
  - URL input field (primary)
  - Expandable text input (fallback)
  - Parse button
  - Recent recipes list (from IndexedDB)
  - AI usage indicator
- **Key Components**:
  - `Input` for URL with validation
  - `Collapsible` for text input fallback
  - `Textarea` for recipe text
  - `Button` for parse action
  - `Card` for recent recipe items
  - AI Usage indicator component
  - Empty state for no recent recipes
- **UX Considerations**:
  - URL input is primary method
  - "Wklej tekst przepisu" expandable section for text fallback
  - Recent recipes loaded from IndexedDB
  - Click on recent recipe navigates to detail view
  - Clear feedback on parse errors
- **Accessibility**:
  - Clear labels for input methods
  - Collapsible properly announced
  - Recent recipes list navigable
- **Security**:
  - Recipe data stored locally only (IndexedDB)
  - No server-side recipe storage
- **API Integration**:
  - `POST /api/recipes/parse` (parse URL)
  - `POST /api/recipes/parse-text` (parse text)
  - `GET /api/ai/usage` (for substitution limits display)
- **User Story Mapping**: US-011 (Import Recipe via Link), US-015 (Data Privacy)

---

#### 2.3.5 Recipe Detail Page

- **Path**: `/recipes/[id]`
- **Main Purpose**: Display recipe with ingredient analysis and substitution suggestions
- **Key Information**:
  - Recipe header (title, source URL)
  - Ingredients list with status badges
  - AI substitution suggestions
  - Allergy warnings
  - "Ugotowałem to" (Cooked This) button
- **Key Components**:
  - Header section with title and source link
  - Ingredients list:
    - Ingredient name and quantity
    - `Badge` for status (default=available/green, destructive=missing/red, secondary=substitution/yellow)
    - Substitution suggestion text (collapsible)
  - `Alert` for allergy warnings (destructive variant)
  - Sticky bottom action bar with "Ugotowałem to" button
  - AI Usage indicator
- **UX Considerations**:
  - Recipe data loaded from IndexedDB
  - Substitutions fetched on-demand (lazy load)
  - Clear visual status for each ingredient
  - Substitution text expandable/collapsible per ingredient
  - Sticky "Cooked This" button always visible
  - Empty inventory triggers specific message (US-017)
- **Accessibility**:
  - Status badges have aria-labels
  - Warnings announced prominently
  - Collapsible sections keyboard accessible
- **Security**:
  - Onboarding check for substitutions (403 handling)
  - Rate limit handling for substitutions
- **API Integration**:
  - `POST /api/ai/substitutions` (analyze ingredients)
  - `GET /api/ai/usage` (check remaining substitutions)
- **User Story Mapping**: US-012 (Analyze Recipe for Substitutions), US-014 (Rate Limiting), US-017 (Handle Empty Inventory)

---

#### 2.3.6 Cooked This Modal

- **Path**: N/A (modal overlay on `/recipes/[id]`)
- **Main Purpose**: Confirm ingredient deductions after cooking
- **Key Information**:
  - List of ingredients to deduct
  - Editable quantity for each ingredient
  - Current inventory quantity reference
  - Confirm/Cancel buttons
- **Key Components**:
  - `Dialog` from shadcn/ui
  - Deduction list:
    - Ingredient name
    - `Input` with `type="number"` for deduction amount
    - Unit abbreviation suffix
    - Current inventory quantity hint
  - `Button` for confirm ("Potwierdź")
  - `Button` for cancel ("Anuluj")
- **UX Considerations**:
  - Pre-filled with recipe quantities
  - User can adjust deduction amounts
  - Show current inventory for reference
  - Skip staple items (no quantity deduction)
  - Summary of what will be deducted
- **Accessibility**:
  - Focus trap in modal
  - Clear labels for each input
  - Escape key to cancel
- **API Integration**:
  - `POST /api/inventory/deduct` (apply deductions)
- **User Story Mapping**: US-013 (Cooked This - Usage Deduction)

---

#### 2.3.7 Settings Page

- **Path**: `/settings`
- **Main Purpose**: Manage user preferences, view AI usage, and account settings
- **Key Information**:
  - Preferences section (allergies, diets, equipment)
  - Staples management link
  - AI usage statistics
  - Account actions (logout, delete account)
- **Key Components**:
  - `Card` sections for each group:
    1. **Preferencje** (Preferences): Edit allergies, diets, equipment (link or inline editing)
    2. **Podstawowe produkty** (Staples): Link to staples tab or inline toggle list
    3. **Użycie AI** (AI Usage): Display scans and substitutions remaining today
    4. **Konto** (Account): Logout button, Delete account link
  - `Button` for logout
  - `Button` for delete account (destructive)
  - AI Usage display component
- **UX Considerations**:
  - Single scrollable page with clear sections
  - Settings icon in header on all main pages links here
  - Preferences editing can redirect to onboarding-style screens or use inline editing
  - Clear separation between sections
- **Accessibility**:
  - Proper heading hierarchy
  - Buttons clearly labeled
  - Destructive actions clearly distinguished
- **Security**:
  - Logout clears session data
  - Delete account requires dedicated screen
- **API Integration**:
  - `GET /api/profile` (load current settings)
  - `PUT /api/profile` (update preferences)
  - `GET /api/ai/usage` (usage stats)
  - Supabase Auth `signOut` (logout)
- **User Story Mapping**: US-004 (User Logout), US-005 (Profile Setup - editing)

---

---

## 3. User Journey Map

### 3.1 New User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEW USER JOURNEY                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Landing/Login → Register → Onboarding (4 steps) → Inventory (empty)
                                                        │
                    ┌───────────────────────────────────┴───────────────────────────────────┐
                    │                                                                       │
                    ▼                                                                       ▼
            Scan Receipt                                                             Quick Add
                    │                                                                       │
                    ▼                                                                       ▼
        Verify Items → Confirm                                                    Add Single Item
                    │                                                                       │
                    └───────────────────────────────────┬───────────────────────────────────┘
                                                        │
                                                        ▼
                                            Inventory (with items)
                                                        │
                                                        ▼
                                                   Recipes
                                                        │
                                                        ▼
                                              Paste Recipe URL
                                                        │
                                                        ▼
                                               Recipe Detail
                                                        │
                                                        ▼
                                           View Substitutions
                                                        │
                                                        ▼
                                           "Cooked This" Modal
                                                        │
                                                        ▼
                                            Confirm Deductions
                                                        │
                                                        ▼
                                          Inventory (updated)
```

### 3.2 Returning User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RETURNING USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────────────────┘

Login → Inventory (existing items)
            │
            ├──────────────────────┬────────────────────┬─────────────────────┐
            │                      │                    │                     │
            ▼                      ▼                    ▼                     ▼
       Scan Receipt           Quick Add            Recipes              Settings
            │                      │                    │                     │
            ▼                      │                    ▼                     │
       Verify Items               │              Recent Recipes               │
            │                      │                or New URL                │
            └──────────────────────┴────────────────────┘                     │
                                   │                                          │
                                   ▼                                          ▼
                            Recipe Detail                              Edit Preferences
                                   │                                    or Logout
                                   ▼
                         "Cooked This" Flow
```

### 3.3 Detailed User Flows

#### Flow 1: Add Products via Receipt Scan

| Step | Action                                      | Screen           | API Calls                                 |
| ---- | ------------------------------------------- | ---------------- | ----------------------------------------- |
| 1    | Tap "Skanuj" in bottom nav or FAB           | Inventory        | -                                         |
| 2    | Select image from gallery                   | Scan             | -                                         |
| 3    | View image preview                          | Scan             | -                                         |
| 4    | Tap "Przetwórz" button                      | Scan             | `POST /api/ai/scan-receipt`               |
| 5    | Wait for processing (full-screen loader)    | Scan             | -                                         |
| 6    | Review extracted items sorted by confidence | Scan             | `GET /api/products/search` (autocomplete) |
| 7    | Edit/delete/add items as needed             | Scan             | `GET /api/units`                          |
| 8    | Tap "Potwierdź" button                      | Scan             | `POST /api/inventory`                     |
| 9    | View success toast or partial success alert | Scan → Inventory | -                                         |
| 10   | See updated inventory list                  | Inventory        | `GET /api/inventory`                      |

#### Flow 2: Recipe Analysis and Cooking

| Step | Action                              | Screen        | API Calls                    |
| ---- | ----------------------------------- | ------------- | ---------------------------- |
| 1    | Tap "Przepisy" in bottom nav        | Recipes       | -                            |
| 2    | Paste recipe URL                    | Recipes       | -                            |
| 3    | Tap "Analizuj" button               | Recipes       | `POST /api/recipes/parse`    |
| 4    | View parsed recipe with ingredients | Recipe Detail | -                            |
| 5    | Recipe saved to IndexedDB           | Recipe Detail | (local storage)              |
| 6    | View substitution suggestions       | Recipe Detail | `POST /api/ai/substitutions` |
| 7    | Note allergy warnings if any        | Recipe Detail | -                            |
| 8    | Tap "Ugotowałem to" button          | Recipe Detail | -                            |
| 9    | Review/edit deduction amounts       | Modal         | -                            |
| 10   | Tap "Potwierdź"                     | Modal         | `POST /api/inventory/deduct` |
| 11   | See success toast                   | Recipe Detail | -                            |

#### Flow 3: Manage Staples

| Step | Action                               | Screen    | API Calls                           |
| ---- | ------------------------------------ | --------- | ----------------------------------- |
| 1    | Navigate to Inventory                | Inventory | `GET /api/inventory?is_staple=true` |
| 2    | Tap "Podstawowe" tab                 | Inventory | -                                   |
| 3    | Toggle staple checkboxes             | Inventory | `PUT /api/inventory/:id`            |
| 4    | Changes saved with optimistic update | Inventory | -                                   |

---

## 4. Layout and Navigation Structure

### 4.1 Global Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                     Header (56-64px)                        │ │
│ │  [← Back]          [Logo/Title]            [Settings Icon]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │                                                             │ │
│ │                                                             │ │
│ │                     Main Content                            │ │
│ │                   (scrollable area)                         │ │
│ │                                                             │ │
│ │                                                             │ │
│ │                                                             │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                  Bottom Navigation (56px)                   │ │
│ │   [Produkty]    [Skanuj]    [Przepisy]    [Ustawienia]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Header Behavior

| Context                             | Header Content                                            |
| ----------------------------------- | --------------------------------------------------------- |
| Inventory, Recipes, Settings        | Logo/App name + Settings icon (on inventory/recipes only) |
| Scan, Recipe Detail, Delete Account | Back arrow + Page title + (optional Settings icon)        |
| Auth pages                          | Logo only, no navigation                                  |
| Onboarding                          | Progress indicator + Step title                           |

### 4.3 Bottom Navigation

The bottom navigation appears on all main application screens after onboarding:

| Item | Icon     | Label      | Route             | Active State       |
| ---- | -------- | ---------- | ----------------- | ------------------ |
| 1    | Package  | Produkty   | `/inventory`      | Primary color fill |
| 2    | Scan     | Skanuj     | `/inventory/scan` | Primary color fill |
| 3    | ChefHat  | Przepisy   | `/recipes`        | Primary color fill |
| 4    | Settings | Ustawienia | `/settings`       | Primary color fill |

**Navigation Rules:**

- Always visible on main screens (Inventory, Recipes, Settings)
- Hidden on auth pages, onboarding, modals
- Hidden on detail/sub-pages (Recipe Detail, Scan flow)
- Thumb-friendly touch targets (min 48x48px)

### 4.4 Route Protection Middleware

```
Middleware Logic:
1. Check if route requires authentication
   - If unauthenticated → redirect to /login
2. Check if route requires completed onboarding
   - AI features (substitutions, scan) require onboarding
   - If onboarding_status !== "completed" → redirect to /onboarding
3. Check if user is on /login or /register while authenticated
   - If authenticated → redirect to /inventory
```

### 4.5 Responsive Behavior

| Viewport  | Behavior                                               |
| --------- | ------------------------------------------------------ |
| 320-428px | Full width, native mobile layout                       |
| 429px+    | Centered layout with max-width: 428px, gray background |

---

## 5. Key Components

### 5.1 Navigation Components

#### BottomNavigation

- **Purpose**: Primary navigation between main sections
- **Props**: `currentPath: string`
- **Features**: 4 items with icons and labels, active state indication
- **Usage**: Layout component for main app pages

#### Header

- **Purpose**: Consistent top bar across app
- **Props**: `title?: string`, `showBack?: boolean`, `showSettings?: boolean`
- **Features**: Optional back button, title/logo, settings icon
- **Usage**: All authenticated pages

### 5.2 Form Components

#### ProductAutocomplete

- **Purpose**: Search and select products from catalog
- **Props**: `onSelect: (product) => void`, `allowCustom?: boolean`
- **Features**: Debounced search, dropdown results, custom name fallback
- **Usage**: Quick Add, Scan Verification
- **API**: `GET /api/products/search`

#### QuantityInput

- **Purpose**: Numeric input with unit suffix
- **Props**: `value: number`, `unit: string`, `onChange: (value) => void`
- **Features**: `inputMode="decimal"`, unit abbreviation display
- **Usage**: Quick Add, Scan Verification, Cooked This Modal

#### UnitSelect

- **Purpose**: Select measurement unit
- **Props**: `value: number`, `onChange: (unitId) => void`
- **Features**: Dropdown with all available units
- **Usage**: Quick Add, Scan Verification
- **API**: `GET /api/units`

### 5.3 Display Components

#### InventoryItemCard

- **Purpose**: Display single inventory item
- **Props**: `item: InventoryItem`, `onEdit`, `onDelete`
- **Features**: Product name, quantity, unit, category badge, edit/delete actions
- **Usage**: Inventory list (Products tab)

#### StapleToggle

- **Purpose**: Toggle staple availability
- **Props**: `item: StapleItem`, `onChange: (available) => void`
- **Features**: Checkbox with product name, optimistic update
- **Usage**: Inventory list (Staples tab)

#### IngredientStatusBadge

- **Purpose**: Show ingredient availability status
- **Props**: `status: 'available' | 'missing' | 'substitution'`
- **Features**: Color-coded badge (green/red/yellow)
- **Variants**: `default` (green), `destructive` (red), `secondary` (yellow)
- **Usage**: Recipe Detail ingredients list

#### AIUsageIndicator

- **Purpose**: Display remaining AI operations
- **Props**: `type: 'scans' | 'substitutions' | 'both'`
- **Features**: Polish text, remaining count, visual indicator
- **Usage**: Recipes page, Settings page, Scan page

#### ConfidenceIndicator

- **Purpose**: Show scan confidence level
- **Props**: `confidence: number`
- **Features**: Colored dot (green >0.85, yellow >0.6, red <=0.6)
- **Usage**: Scan Verification list

### 5.4 Feedback Components

#### EmptyState

- **Purpose**: Friendly empty state with call-to-action
- **Props**: `type: 'inventory' | 'recipes'`, `onAction: () => void`
- **Features**: Illustration, Polish text, action button(s)
- **Usage**: Empty inventory, empty recipes list

#### LoadingOverlay

- **Purpose**: Full-screen loading for AI operations
- **Props**: `message?: string`
- **Features**: Spinner, optional message, blocks interaction
- **Usage**: Receipt scanning, recipe parsing

#### SessionExpiredDialog

- **Purpose**: Handle session expiration
- **Features**: AlertDialog with message, redirect to login
- **Usage**: Global error handling (401 responses)

#### PartialSuccessAlert

- **Purpose**: Show batch operation results
- **Props**: `summary: { total, success, failed }`, `errors?: Error[]`
- **Features**: Summary text, expandable error details
- **Usage**: After POST /api/inventory (207 response)

### 5.5 Modal Components

#### QuickAddSheet

- **Purpose**: Bottom sheet for manual item entry
- **Features**: Product autocomplete, quantity, unit, add button
- **Usage**: Triggered from Inventory FAB

#### CookedThisDialog

- **Purpose**: Confirm ingredient deductions
- **Features**: Editable quantities, current inventory reference, confirm/cancel
- **Usage**: Triggered from Recipe Detail

#### ConfirmationDialog

- **Purpose**: Simple confirmation for destructive actions
- **Props**: `title`, `message`, `onConfirm`, `onCancel`
- **Features**: AlertDialog with action buttons
- **Usage**: Delete item, logout confirmation

### 5.6 Layout Components

#### OnboardingWizard

- **Purpose**: Multi-step onboarding container
- **Features**: Progress bar, step navigation, step content rendering
- **Usage**: `/onboarding` page

#### InventoryTabs

- **Purpose**: Tab navigation for Products/Staples
- **Features**: Two tabs, count badges, active state
- **Usage**: Inventory page

#### FilterSortRow

- **Purpose**: Filtering and sorting controls
- **Features**: Category Select, Sort Select, optional search
- **Usage**: Inventory page (Products tab)

### 5.7 Error Handling Components

#### ErrorBoundary

- **Purpose**: Catch and display React errors
- **Features**: "Coś poszło nie tak" message, reload button
- **Usage**: Root level wrapper

#### Toast (sonner)

- **Purpose**: Notification messages
- **Features**: Bottom position, manual dismiss for errors, auto-dismiss for success
- **Usage**: Global via toast utility

---

## 6. State Management

### 6.1 React Context Structure

```typescript
// AuthContext
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email, password) => Promise<void>;
  signUp: (email, password) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email) => Promise<void>;
}

// ProfileContext
interface ProfileContextValue {
  profile: Profile | null;
  isLoading: boolean;
  updateProfile: (data) => Promise<void>;
  refetch: () => Promise<void>;
}

// AIUsageContext
interface AIUsageContextValue {
  usage: AIUsage | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  canScan: boolean;
  canGetSubstitutions: boolean;
}
```

### 6.2 Local State Patterns

| State Type         | Location        | Pattern                                  |
| ------------------ | --------------- | ---------------------------------------- |
| Form data          | Component state | `useState`                               |
| List data          | Page state      | `useState` + fetch on mount              |
| Modal open/close   | Component state | `useState`                               |
| Optimistic updates | Component state | Update UI immediately, rollback on error |
| Recipe history     | IndexedDB       | Custom hook `useRecipeStorage`           |

### 6.3 Data Fetching

- **Simple fetch**: Native `fetch` with `async/await`
- **Loading states**: `isLoading` boolean in component state
- **Error handling**: Try/catch with toast notifications
- **Caching**: Minimal - refetch on navigation (MVP simplicity)

---

## 7. Error Handling Strategy

### 7.1 Error Types and UI Treatment

| Error Type             | HTTP Status | UI Treatment                                                           |
| ---------------------- | ----------- | ---------------------------------------------------------------------- |
| Network error          | -           | Toast (manual dismiss): "Brak połączenia z internetem"                 |
| Authentication error   | 401         | AlertDialog → redirect to `/login`                                     |
| Authorization error    | 403         | Toast + redirect to `/onboarding` (if onboarding issue)                |
| Validation error       | 400/422     | Inline field errors                                                    |
| Rate limit             | 429         | Toast: "Osiągnięto dzienny limit. Spróbuj jutro." + disable AI buttons |
| Not found              | 404         | Toast or inline message depending on context                           |
| Server error           | 500         | Toast: "Wystąpił błąd. Spróbuj ponownie."                              |
| External service error | 502         | Toast: "Usługa zewnętrzna niedostępna"                                 |
| IndexedDB error        | -           | Toast: "Błąd lokalnego przechowywania danych"                          |

### 7.2 Error Message Format

All user-facing error messages are in Polish and follow this pattern:

- **Clear description** of what went wrong
- **Action suggestion** when applicable
- **Retry option** for recoverable errors

### 7.3 Graceful Degradation

| Feature               | Degraded Behavior                                     |
| --------------------- | ----------------------------------------------------- |
| AI scan limit reached | Show limit message, suggest quick add                 |
| AI substitution limit | Show basic ingredient matching without AI suggestions |
| Recipe parse fails    | Offer text input fallback                             |
| Image too large       | Show error before upload, suggest compression         |

---

## 8. Accessibility Requirements

### 8.1 General Requirements

- **Semantic HTML**: Proper use of `<main>`, `<nav>`, `<header>`, `<section>`, `<button>`, `<form>`
- **Focus management**: Visible focus indicators, logical tab order
- **Keyboard navigation**: All interactive elements keyboard accessible
- **Screen reader support**: ARIA labels on icon-only buttons, status announcements
- **Color contrast**: WCAG AA compliance (4.5:1 for text)
- **Motion**: Respect `prefers-reduced-motion` media query

### 8.2 Component-Specific Requirements

| Component          | Accessibility Feature                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| Bottom Navigation  | `<nav>` with `aria-label="Nawigacja główna"`                                |
| Icon Buttons       | `aria-label` in Polish (e.g., `aria-label="Ustawienia"`)                    |
| Form Inputs        | Associated `<label>` elements, error descriptions via `aria-describedby`    |
| Loading States     | `aria-busy="true"`, announcement of loading completion                      |
| Modals             | Focus trap, `aria-modal="true"`, escape key to close                        |
| Status Badges      | `aria-label` describing status (e.g., `aria-label="Składnik dostępny"`)     |
| Alerts             | `role="alert"` for important messages                                       |
| Progress Indicator | `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |

---

## 9. Security Considerations

### 9.1 Authentication Security

- JWT tokens stored in HTTP-only cookies
- Automatic token refresh via Supabase client
- Session invalidation on logout
- Rate limiting on authentication attempts (server-side)

### 9.2 Route Protection

- Next.js middleware validates authentication before protected routes
- Onboarding status checked before AI features
- 403 responses trigger appropriate redirects

### 9.3 Data Security

- Password fields always masked
- Account deletion requires password confirmation + text confirmation
- User data isolated via Row Level Security (RLS)
- Recipe data stored locally only (no server-side storage)

### 9.4 Input Validation

- Client-side validation for immediate feedback
- Server-side validation as source of truth
- Image size validation before upload
- URL validation before fetch

---

## 10. User Story to UI Mapping

| User Story               | Primary View(s)              | Key Components                         |
| ------------------------ | ---------------------------- | -------------------------------------- |
| US-001 (Registration)    | `/register`                  | Registration form, validation          |
| US-002 (Login)           | `/login`                     | Login form, error handling             |
| US-003 (Password Reset)  | `/reset-password`            | Reset form, success message            |
| US-004 (Logout)          | `/settings`                  | Logout button, confirmation            |
| US-005 (Onboarding)      | `/onboarding`                | OnboardingWizard, multi-step form      |
| US-006 (Scan Receipt)    | `/inventory/scan`            | Image picker, LoadingOverlay           |
| US-007 (Verify Items)    | `/inventory/scan`            | Verification list, ProductAutocomplete |
| US-008 (View Inventory)  | `/inventory`                 | InventoryTabs, InventoryItemCard       |
| US-009 (Manage Staples)  | `/inventory` (Staples tab)   | StapleToggle, checkbox list            |
| US-010 (Manual Entry)    | `/inventory` + QuickAddSheet | QuickAddSheet, ProductAutocomplete     |
| US-011 (Recipe Link)     | `/recipes`                   | URL input, parse button                |
| US-012 (Substitutions)   | `/recipes/[id]`              | IngredientStatusBadge, suggestions     |
| US-013 (Cooked This)     | `/recipes/[id]` + Modal      | CookedThisDialog, QuantityInput        |
| US-014 (Rate Limiting)   | Multiple                     | AIUsageIndicator, limit messaging      |
| US-015 (Local Storage)   | `/recipes`                   | IndexedDB hook, recent recipes         |
| US-016 (Network Errors)  | All                          | Toast notifications, error messages    |
| US-017 (Empty Inventory) | `/recipes/[id]`              | EmptyState, guidance message           |

---

## 11. Unresolved Issues for Implementation

The following items require further clarification during implementation:

1. **Supported recipe domains**: Define allowlist for URL parsing and display hint text to users
2. **Receipt image size feedback**: Implement pre-upload validation with user guidance for oversized images
3. **Recipe history limit**: Implement LRU eviction in IndexedDB (suggested: 50-100 recipes)
4. **Offline indicator**: Consider adding connection status indicator for lost connectivity mid-session
5. **AI substitution fallback UI**: Design degraded mode when rate limit reached but basic matching available
6. **Unit conversion warnings**: Handle cases where recipe units don't match inventory units
