# View Implementation Plan: Left-Over Features

## 1. Overview

This implementation plan covers the remaining features that were planned in the UI architecture but not yet implemented in the Mealer application. These "left-over" features include:

1. **Password Reset Supabase Integration** - Connect the existing ResetPasswordForm to Supabase auth
2. **React Context Providers** - Implement shared state management (AuthContext, ProfileContext, AIUsageContext)
3. **Header Component** - Create a reusable header component for main app pages
4. **SessionExpiredDialog** - Handle session expiration gracefully with a dialog
5. **Global ErrorBoundary** - Add root-level error boundary
6. **Accessibility: prefers-reduced-motion** - Respect user's motion preferences
7. **Additional UX improvements** - Offline indicator, image size validation guidance, unit conversion warnings, supported domains hint

> **Note on Route Protection**: The existing `src/proxy.ts` file is already the correct implementation for Next.js 16+. The `middleware.ts` convention is deprecated in favor of `proxy.ts` (see [Next.js Proxy docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)). The current proxy implementation handles session refresh and route protection correctly.

## 2. View Routing

These features are cross-cutting concerns that affect multiple routes:

| Feature                    | Affected Routes                                        |
| -------------------------- | ------------------------------------------------------ |
| Password Reset Integration | `/reset-password`                                      |
| AuthContext                | All authenticated routes                               |
| ProfileContext             | `/onboarding`, `/settings`, AI feature pages           |
| AIUsageContext             | `/inventory/scan`, `/recipes`, `/recipes/[id]`         |
| Header Component           | `/inventory`, `/recipes`, `/settings` (main app pages) |
| SessionExpiredDialog       | All authenticated routes                               |
| Global ErrorBoundary       | `/` (root layout)                                      |
| Accessibility              | All routes (global)                                    |

## 3. Component Structure

```
src/
├── proxy.ts                         # EXISTING: Next.js proxy (route protection) - NO CHANGES NEEDED
├── app/
│   ├── layout.tsx                   # MODIFY: Add providers and ErrorBoundary
│   ├── error.tsx                    # NEW: Root error boundary
│   ├── (auth)/
│   │   ├── layout.tsx               # EXISTING: Auth layout with Mealer branding - NO CHANGES NEEDED
│   │   └── reset-password/
│   │       └── page.tsx             # NO CHANGES - form handles integration internally
│   └── (main)/                      # CONSIDER: Group main app pages for shared layout
│       ├── layout.tsx               # NEW: Main app layout with Header + BottomNav
│       ├── inventory/
│       ├── recipes/
│       └── settings/
├── components/
│   ├── Header.tsx                   # NEW: Shared header component
│   ├── SessionExpiredDialog.tsx     # NEW: Session expiration dialog
│   ├── ErrorBoundary.tsx            # NEW: Error boundary wrapper
│   ├── OfflineIndicator.tsx         # NEW: Connection status indicator
│   └── auth/
│       └── ResetPasswordForm.tsx    # MODIFY: Supabase integration
├── contexts/
│   ├── index.ts                     # NEW: Context exports
│   ├── AuthContext.tsx              # NEW: Authentication context
│   ├── ProfileContext.tsx           # NEW: Profile context
│   └── AIUsageContext.tsx           # NEW: AI usage context
└── lib/
    └── utils/
        └── accessibility.ts         # NEW: Accessibility utilities
```

### Layout Architecture (PWA Considerations)

The application uses Next.js route groups for distinct layout needs:

1. **Auth Layout** `(auth)/layout.tsx` - Already implemented
   - Centered content with Mealer logo branding
   - No navigation (users not authenticated)
   - Max-width 400px for form readability
   - Full-height centered design

2. **Main App Layout** - To be implemented via `(main)/layout.tsx` or existing layouts
   - Header (56-64px) with back button, title/logo, settings icon
   - Main content area (scrollable)
   - Bottom Navigation (56px) - already implemented in `BottomNavigation.tsx`
   - PWA-optimized: safe-area-inset padding for notched devices

3. **Onboarding Layout** - Separate wizard flow
   - Progress indicator
   - No bottom navigation
   - Step-based navigation

## 4. Component Details

### 4.1 ResetPasswordForm (Modification)

- **Component description**: Existing form component that needs Supabase integration to actually send password reset emails.
- **Main elements**:
  - Email input field
  - Submit button with loading state
  - Success/error alerts
  - Back to login link
- **Handled interactions**:
  - Form submission triggers `supabase.auth.resetPasswordForEmail()`
  - Success state shows confirmation message
  - Error state displays error message
- **Handled validation**:
  - Email format validation (existing)
  - Empty email validation (existing)
- **Types**:
  - `ResetPasswordFormData` (existing)
- **Props**:
  - `onSubmit?: (data: ResetPasswordFormData) => Promise<void>` (to be removed, use internal Supabase call)

### 4.2 AuthContext (New Component)

- **Component description**: React context provider for authentication state management across the application.
- **Main elements**:
  - `AuthProvider` component wrapping children
  - `useAuth` hook for consuming context
- **Handled interactions**:
  - `signIn(email, password)` - Login user
  - `signUp(email, password)` - Register user
  - `signOut()` - Logout user
  - `resetPassword(email)` - Request password reset
- **Handled validation**:
  - Session validity via `supabase.auth.getUser()`
  - Auth state changes via `onAuthStateChange`
- **Types**:
  ```typescript
  interface AuthContextValue {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
  }
  ```
- **Props**:
  - `children: React.ReactNode`

### 4.3 ProfileContext (New Component)

- **Component description**: React context provider for user profile data (allergies, diets, equipment, onboarding status).
- **Main elements**:
  - `ProfileProvider` component wrapping children
  - `useProfile` hook for consuming context
- **Handled interactions**:
  - `updateProfile(data)` - Update user profile
  - `refetch()` - Refresh profile data
- **Handled validation**:
  - Profile values against system config (supported_allergies, supported_diets, supported_equipment)
- **Types**:
  ```typescript
  interface ProfileContextValue {
    profile: ProfileDTO | null;
    isLoading: boolean;
    error: Error | null;
    updateProfile: (data: ProfileUpdateCommand) => Promise<void>;
    refetch: () => Promise<void>;
  }
  ```
- **Props**:
  - `children: React.ReactNode`

### 4.4 AIUsageContext (New Component)

- **Component description**: React context provider for AI usage limits and remaining quota.
- **Main elements**:
  - `AIUsageProvider` component wrapping children
  - `useAIUsage` hook for consuming context
- **Handled interactions**:
  - `refetch()` - Refresh usage data
  - Automatic refetch after AI operations
- **Handled validation**:
  - Daily limit checks for scans and substitutions
- **Types**:
  ```typescript
  interface AIUsageContextValue {
    usage: AIUsageDTO | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    canScan: boolean;
    canGetSubstitutions: boolean;
  }
  ```
- **Props**:
  - `children: React.ReactNode`

### 4.5 Header (New Component)

- **Component description**: Shared header component for main application pages with consistent styling, optional back navigation, and PWA-optimized safe area handling.
- **Main elements**:
  - Back button (optional, using lucide-react ArrowLeft icon)
  - Title/logo (centered or left-aligned based on context)
  - Settings icon link (optional, right-aligned)
- **Handled interactions**:
  - Back button click navigates to previous page or specified route
  - Settings icon navigates to `/settings`
- **Handled validation**: N/A
- **PWA considerations**:
  - Uses `env(safe-area-inset-top)` for notched devices
  - Fixed position with proper z-index
  - Height: 56-64px (excluding safe area)
  - Touch targets minimum 48x48px
- **Types**:
  ```typescript
  interface HeaderProps {
    title?: string;
    showBack?: boolean;
    backHref?: string;
    showSettings?: boolean;
    className?: string;
  }
  ```
- **Props**:
  - `title?: string` - Page title to display (defaults to "Mealer" logo)
  - `showBack?: boolean` - Show back navigation button
  - `backHref?: string` - Custom back navigation target (uses `router.back()` if not provided)
  - `showSettings?: boolean` - Show settings icon (defaults to false on settings page)
  - `className?: string` - Additional CSS classes

### 4.6 SessionExpiredDialog (New Component)

- **Component description**: Alert dialog that appears when session expires (401 response) and redirects user to login.
- **Main elements**:
  - AlertDialog from shadcn/ui
  - Message explaining session expiration
  - Login button
- **Handled interactions**:
  - "Zaloguj się ponownie" button redirects to `/login`
  - Dialog cannot be dismissed without action
- **Handled validation**: N/A
- **Types**:
  ```typescript
  interface SessionExpiredDialogProps {
    open: boolean;
    redirectUrl?: string;
  }
  ```
- **Props**:
  - `open: boolean` - Control dialog visibility
  - `redirectUrl?: string` - URL to preserve for redirect after login

### 4.7 ErrorBoundary (New Component)

- **Component description**: Root-level error boundary that catches React errors and displays a user-friendly fallback UI.
- **Main elements**:
  - Error message in Polish ("Coś poszło nie tak")
  - Reload button
  - Optional error details (dev mode)
- **Handled interactions**:
  - "Odśwież stronę" button reloads the page
  - Error logging to console
- **Handled validation**: N/A
- **Types**:
  ```typescript
  interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }
  ```
- **Props**:
  - `children: React.ReactNode`
  - `fallback?: React.ReactNode` - Custom fallback UI

### 4.8 OfflineIndicator (New Component)

- **Component description**: Toast-style indicator that appears when the user loses internet connection, designed for PWA usage.
- **Main elements**:
  - Fixed position banner at top of screen (below safe area)
  - Offline icon (WifiOff from lucide-react) and message in Polish
  - Auto-dismiss with fade animation when connection restored
- **Handled interactions**:
  - Listens to `navigator.onLine` and online/offline events
  - Automatically shows/hides based on connection status
  - Shows immediately on offline, hides after 2s delay on reconnect
- **Handled validation**: N/A
- **PWA considerations**:
  - Positioned below `env(safe-area-inset-top)` on notched devices
  - Uses `position: fixed` with high z-index
  - Respects `prefers-reduced-motion` for animations
- **Types**: N/A (no props)
- **Props**: None

### 4.9 app/error.tsx (New File)

- **Component description**: Next.js root error boundary page for unhandled errors.
- **Main elements**:
  - Error message display
  - Retry button
- **Handled interactions**:
  - "Spróbuj ponownie" button triggers error recovery
- **Handled validation**: N/A
- **Types**: Next.js error page props
- **Props**:
  - `error: Error & { digest?: string }`
  - `reset: () => void`

## 5. Types

### 5.1 New Types for Contexts

```typescript
// src/contexts/types.ts

import type { User, Session } from "@supabase/supabase-js";
import type { ProfileDTO, ProfileUpdateCommand, AIUsageDTO } from "@/types";

/** Authentication context value */
export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

/** Profile context value */
export interface ProfileContextValue {
  profile: ProfileDTO | null;
  isLoading: boolean;
  error: Error | null;
  isOnboardingCompleted: boolean;
  updateProfile: (data: ProfileUpdateCommand) => Promise<void>;
  refetch: () => Promise<void>;
}

/** AI Usage context value */
export interface AIUsageContextValue {
  usage: AIUsageDTO | null;
  isLoading: boolean;
  error: Error | null;
  canScan: boolean;
  canGetSubstitutions: boolean;
  refetch: () => Promise<void>;
}
```

### 5.2 Header Component Props

```typescript
// src/components/Header.tsx

export interface HeaderProps {
  /** Page title to display (defaults to "Mealer" logo) */
  title?: string;
  /** Show back navigation button */
  showBack?: boolean;
  /** Custom back navigation target (defaults to router.back()) */
  backHref?: string;
  /** Show settings icon link (defaults to true for main pages, false on settings page) */
  showSettings?: boolean;
  /** Additional CSS classes for customization */
  className?: string;
}
```

### 5.3 SessionExpiredDialog Props

```typescript
// src/components/SessionExpiredDialog.tsx

export interface SessionExpiredDialogProps {
  /** Control dialog visibility */
  open: boolean;
  /** Original URL to redirect back to after login */
  redirectUrl?: string;
}
```

### 5.4 Existing Types (from types.ts)

The implementation reuses existing types:

- `ProfileDTO` - User profile data
- `ProfileUpdateCommand` - Profile update payload
- `AIUsageDTO` - AI usage statistics
- `AIUsageCounterDTO` - Individual counter for scans/substitutions

## 6. State Management

### 6.1 Context Hierarchy

```
<AuthProvider>              # Manages auth state, provides signIn/signOut
  <ProfileProvider>         # Depends on AuthContext for user ID
    <AIUsageProvider>       # Depends on AuthContext for user ID
      <App />
    </AIUsageProvider>
  </ProfileProvider>
</AuthProvider>
```

### 6.2 AuthContext State

```typescript
const [user, setUser] = useState<User | null>(null);
const [session, setSession] = useState<Session | null>(null);
const [isLoading, setIsLoading] = useState(true);

// Initialized via supabase.auth.getUser() on mount
// Updated via supabase.auth.onAuthStateChange() listener
```

### 6.3 ProfileContext State

```typescript
const [profile, setProfile] = useState<ProfileDTO | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

// Fetched via GET /api/profile when user changes
// Updated optimistically on updateProfile calls
```

### 6.4 AIUsageContext State

```typescript
const [usage, setUsage] = useState<AIUsageDTO | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

// Derived computed properties:
const canScan = usage ? usage.receipt_scans.remaining > 0 : false;
const canGetSubstitutions = usage ? usage.substitutions.remaining > 0 : false;

// Fetched via GET /api/ai/usage when user changes
// Refetched after AI operations complete
```

### 6.5 Session Expiration Handling

```typescript
// Global state for session expiration dialog
const [sessionExpired, setSessionExpired] = useState(false);

// Triggered by:
// 1. 401 responses from API calls
// 2. Auth state change to signed_out
```

## 7. API Integration

### 7.1 Password Reset

**Endpoint**: Supabase Auth (client-side)

```typescript
const supabase = createClient();
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/update-password`,
});
```

### 7.2 Profile Operations

**GET /api/profile**

- Request: None
- Response: `ProfileDTO`
- Error: `401 Unauthorized`, `404 Not Found`

**PUT /api/profile**

- Request: `ProfileUpdateCommand`
- Response: `ProfileDTO`
- Error: `400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity`

### 7.3 AI Usage

**GET /api/ai/usage**

- Request: None
- Response: `AIUsageDTO`
- Error: `401 Unauthorized`

### 7.4 Error Response Handling

All API calls should handle:

```typescript
interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetailDTO[];
  };
}
```

On `401 Unauthorized`:

1. Set `sessionExpired = true`
2. Show `SessionExpiredDialog`
3. Clear local state
4. Redirect to login after user confirms

## 8. User Interactions

### 8.1 Password Reset Flow

1. User navigates to `/reset-password`
2. User enters email address
3. User clicks "Wyślij link resetujący"
4. System calls `supabase.auth.resetPasswordForEmail()`
5. Success message shown (regardless of email existence for security)
6. User checks email and clicks reset link
7. User redirected to `/update-password` (existing)
8. User enters new password
9. User redirected to `/login`

### 8.2 Session Expiration Flow

1. User makes API request
2. API returns `401 Unauthorized`
3. Error interceptor catches response
4. `SessionExpiredDialog` appears
5. User clicks "Zaloguj się ponownie"
6. User redirected to `/login?redirect={currentPath}`
7. After login, user redirected back to original page

### 8.3 Offline Detection Flow

1. User loses internet connection
2. `OfflineIndicator` appears at top of screen
3. Message: "Brak połączenia z internetem"
4. User regains connection
5. Indicator auto-hides after 2 seconds

### 8.4 Reduced Motion Preference

1. System detects `prefers-reduced-motion` media query
2. CSS transitions/animations disabled or reduced
3. Loading spinners use static alternatives
4. No user interaction required

## 9. Conditions and Validation

### 9.1 Route Protection Conditions

> **Note**: Route protection is already implemented in `src/proxy.ts` using the Next.js 16+ proxy convention. No changes needed.

| Condition             | Routes Affected  | Behavior                 | Implementation |
| --------------------- | ---------------- | ------------------------ | -------------- |
| Unauthenticated user  | Protected routes | Redirect to `/login`     | `proxy.ts`     |
| Authenticated user    | Auth pages       | Redirect to `/inventory` | `proxy.ts`     |
| Onboarding incomplete | AI features      | Return `403 Forbidden`   | API routes     |

### 9.2 Context Initialization Conditions

| Context        | Initialization Condition | Fallback                                                  |
| -------------- | ------------------------ | --------------------------------------------------------- |
| AuthContext    | Always initialized       | `user: null, session: null`                               |
| ProfileContext | After user authenticated | `profile: null`                                           |
| AIUsageContext | After user authenticated | `usage: null, canScan: false, canGetSubstitutions: false` |

### 9.3 Header Display Conditions

| Condition                                     | Header Behavior                  |
| --------------------------------------------- | -------------------------------- |
| Main app pages (inventory, recipes, settings) | Show title + settings icon       |
| Sub-pages (scan, recipe detail)               | Show back button + title         |
| Auth pages                                    | Header not shown                 |
| Onboarding                                    | Progress indicator shown instead |

### 9.4 Image Size Validation (Receipt Scan)

```typescript
const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

function validateImageSize(file: File): { valid: boolean; message?: string } {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      message: `Obraz jest za duży (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksymalny rozmiar to ${MAX_IMAGE_SIZE_MB}MB.`,
    };
  }
  return { valid: true };
}
```

## 10. Error Handling

### 10.1 Authentication Errors

| Error                | Handling                         |
| -------------------- | -------------------------------- |
| Invalid credentials  | Show inline error message        |
| Rate limited (login) | Show toast with retry suggestion |
| Session expired      | Show `SessionExpiredDialog`      |
| Network error        | Show toast, allow retry          |

### 10.2 API Errors

| HTTP Status | Error Code               | Handling                                           |
| ----------- | ------------------------ | -------------------------------------------------- |
| 400         | `VALIDATION_ERROR`       | Show inline field errors                           |
| 401         | `UNAUTHORIZED`           | Show `SessionExpiredDialog`, redirect to login     |
| 403         | `FORBIDDEN`              | Redirect to `/onboarding` if onboarding incomplete |
| 404         | `NOT_FOUND`              | Show toast or inline message                       |
| 422         | `VALIDATION_ERROR`       | Show inline field errors                           |
| 429         | `RATE_LIMITED`           | Show toast with limit message, disable action      |
| 500         | `INTERNAL_ERROR`         | Show toast: "Wystąpił błąd. Spróbuj ponownie."     |
| 502         | `EXTERNAL_SERVICE_ERROR` | Show toast: "Usługa zewnętrzna niedostępna"        |

### 10.3 React Error Boundary

```typescript
// Caught errors display:
// - Title: "Coś poszło nie tak"
// - Description: "Wystąpił nieoczekiwany błąd aplikacji."
// - Action: "Odśwież stronę" button
// - Dev mode: Error stack trace
```

### 10.4 IndexedDB Errors

```typescript
// Toast message: "Błąd lokalnego przechowywania danych"
// Fallback: Continue without local storage for recipes
```

## 11. Implementation Steps

### Phase 1: Password Reset Integration (Priority: Critical)

1. **Modify ResetPasswordForm component**
   - Remove `onSubmit` prop dependency
   - Add Supabase client import from `@/db/supabase/client`
   - Implement `supabase.auth.resetPasswordForEmail()` call
   - Use `window.location.origin` for redirect URL to `/update-password`

2. **Verify reset-password flow**
   - Test form submission sends email via Supabase
   - Verify redirect URL works correctly
   - Test error handling for network issues

### Phase 2: Context Providers (Priority: High)

3. **Create AuthContext**
   - Create `src/contexts/AuthContext.tsx`
   - Implement provider with Supabase auth state
   - Add `onAuthStateChange` listener for real-time auth updates
   - Export `useAuth` hook

4. **Create ProfileContext**
   - Create `src/contexts/ProfileContext.tsx`
   - Implement profile fetching on auth change
   - Add `updateProfile` method with optimistic updates
   - Export `useProfile` hook

5. **Create AIUsageContext**
   - Create `src/contexts/AIUsageContext.tsx`
   - Implement usage fetching on auth change
   - Add computed `canScan` and `canGetSubstitutions`
   - Export `useAIUsage` hook

6. **Create context index**
   - Create `src/contexts/index.ts`
   - Export all contexts and hooks

7. **Update root layout**
   - Wrap app with context providers in correct hierarchy
   - AuthProvider → ProfileProvider → AIUsageProvider

### Phase 3: Session Expiration Handling (Priority: High)

8. **Create SessionExpiredDialog component**
   - Create `src/components/SessionExpiredDialog.tsx`
   - Use AlertDialog from shadcn/ui
   - Polish text: "Sesja wygasła"
   - Implement redirect to login with return URL preservation

9. **Add session expiration detection**
   - Create utility function for 401 detection in API calls
   - Connect to AuthContext state for global session expired flag
   - Show dialog instead of just toast

### Phase 4: Main App Layout & Header (Priority: Medium)

10. **Create Header component**
    - Create `src/components/Header.tsx`
    - Implement conditional back button (using `useRouter`)
    - Implement title display with Mealer logo fallback
    - Implement settings icon link (conditional)
    - Style with Tailwind for 56-64px height
    - Add PWA safe-area-inset-top padding for notched devices

11. **Consider main app layout consolidation**
    - Evaluate if `/inventory`, `/recipes`, `/settings` should share a `(main)` route group
    - If consolidating:
      - Create `src/app/(main)/layout.tsx`
      - Move pages into route group
      - Add Header + BottomNavigation to shared layout
    - If keeping separate:
      - Add Header component to each page individually
      - Ensure consistent spacing for bottom navigation

12. **Update existing pages**
    - Replace inline headers with Header component
    - Add proper `paddingBottom` for BottomNavigation overlap
    - Ensure scrollable content works with fixed header/nav

### Phase 5: Error Boundary (Priority: Medium)

13. **Create root error.tsx**
    - Create `src/app/error.tsx`
    - Implement user-friendly error UI in Polish
    - Title: "Coś poszło nie tak"
    - Add "Spróbuj ponownie" retry button
    - Style consistently with app design

14. **Create ErrorBoundary wrapper (optional)**
    - Create `src/components/ErrorBoundary.tsx` for client component use
    - Implement class component error boundary
    - Use for wrapping specific feature areas

### Phase 6: Accessibility & UX Improvements (Priority: Medium)

15. **Create accessibility utilities**
    - Create `src/lib/utils/accessibility.ts`
    - Implement `usePrefersReducedMotion()` hook
    - Export utility for checking motion preference

16. **Update global styles**
    - Add `@media (prefers-reduced-motion: reduce)` rules to `globals.css`
    - Reduce/disable CSS animations and transitions
    - Ensure loading spinners have static alternatives

17. **Create OfflineIndicator component**
    - Create `src/components/OfflineIndicator.tsx`
    - Implement `navigator.onLine` and online/offline event listeners
    - Style as top banner with Polish text: "Brak połączenia z internetem"
    - Auto-hide with delay when connection restored
    - Add to root layout

18. **Add image size validation**
    - Update scan page `ImageUploadSection` with pre-upload validation
    - Check file size before upload (max 10MB)
    - Show user-friendly error with guidance in Polish
    - Suggest image compression if oversized

### Phase 7: Integration & Testing (Priority: High)

19. **Update existing hooks to use contexts**
    - Evaluate `useSettings`, `useRecipeParse`, etc.
    - Replace redundant API calls with context data where appropriate
    - Ensure proper loading states and error handling

20. **Test all flows**
    - Password reset end-to-end (form → email → update)
    - Session expiration and recovery
    - Offline/online detection
    - Error boundary triggers
    - Reduced motion preferences
    - PWA installation and usage

21. **PWA-specific testing**
    - Test on iOS Safari with notch (safe-area-inset)
    - Test on Android Chrome
    - Verify bottom navigation doesn't overlap content
    - Test header appearance in standalone PWA mode

22. **Documentation**
    - Update component documentation
    - Add usage examples for contexts
    - Document accessibility features
