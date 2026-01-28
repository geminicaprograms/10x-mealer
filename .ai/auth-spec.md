# Authentication System Technical Specification

## Overview

This document provides a detailed technical specification for implementing user authentication in the Mealer application. The specification covers registration (US-001), login (US-002), password reset (US-003), logout (US-004), and account deletion (US-018) functionality using Supabase Auth integrated with Next.js 15.

---

## 1. User Interface Architecture

### 1.1 Page Structure

The authentication system introduces three new pages and modifies existing layouts:

#### 1.1.1 New Pages

| Path                    | File Location                             | Page Type        | Description                       |
| ----------------------- | ----------------------------------------- | ---------------- | --------------------------------- |
| `/login`                | `src/app/(auth)/login/page.tsx`           | Client Component | User login form                   |
| `/register`             | `src/app/(auth)/register/page.tsx`        | Client Component | New user registration form        |
| `/reset-password`       | `src/app/(auth)/reset-password/page.tsx`  | Client Component | Password reset request form       |
| `/auth/callback`        | `src/app/auth/callback/route.ts`          | Route Handler    | OAuth/magic link callback handler |
| `/auth/update-password` | `src/app/(auth)/update-password/page.tsx` | Client Component | Set new password after reset      |

#### 1.1.2 Route Group: `(auth)`

Create a route group `(auth)` for authentication pages with a shared layout that:

- Centers content vertically and horizontally
- Displays only the Mealer logo (no navigation)
- Has a maximum width of 400px for forms
- Uses consistent padding and spacing

```
src/app/(auth)/
├── layout.tsx          # Auth-specific layout (logo only, centered)
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx
├── reset-password/
│   └── page.tsx
└── update-password/
    └── page.tsx
```

### 1.2 Component Architecture

#### 1.2.1 New Components

| Component                   | Location                                            | Type   | Purpose                                      |
| --------------------------- | --------------------------------------------------- | ------ | -------------------------------------------- |
| `LoginForm`                 | `src/components/auth/LoginForm.tsx`                 | Client | Email/password login form with validation    |
| `RegisterForm`              | `src/components/auth/RegisterForm.tsx`              | Client | Registration form with password strength     |
| `ResetPasswordForm`         | `src/components/auth/ResetPasswordForm.tsx`         | Client | Email input for password reset request       |
| `UpdatePasswordForm`        | `src/components/auth/UpdatePasswordForm.tsx`        | Client | New password form after reset                |
| `PasswordStrengthIndicator` | `src/components/auth/PasswordStrengthIndicator.tsx` | Client | Visual password strength feedback            |
| `AuthCard`                  | `src/components/auth/AuthCard.tsx`                  | Client | Wrapper card for auth forms                  |
| `DeleteAccountModal`        | `src/components/auth/DeleteAccountModal.tsx`        | Client | Account deletion confirmation modal (US-018) |

#### 1.2.2 Shared UI Components (extend existing shadcn/ui)

| Component | Location                       | Status  | Notes                                         |
| --------- | ------------------------------ | ------- | --------------------------------------------- |
| `Input`   | `src/components/ui/input.tsx`  | **New** | Text input with error state support           |
| `Alert`   | `src/components/ui/alert.tsx`  | **New** | Success/error message display                 |
| `Form`    | `src/components/ui/form.tsx`   | **New** | Form wrapper with react-hook-form integration |
| `Dialog`  | `src/components/ui/dialog.tsx` | **New** | Modal dialog for DeleteAccountModal           |

### 1.3 Component Specifications

#### 1.3.1 LoginForm

**Props:**

```typescript
interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}
```

**Features:**

- Email input with email validation
- Password input with masking
- "Zaloguj się" (Login) submit button
- "Zapomniałeś hasła?" (Forgot password) link → `/reset-password`
- "Zarejestruj się" (Register) link → `/register`
- Loading state during submission (button disabled, spinner)
- Inline error messages for validation
- Toast notification for server errors

**Validation Rules:**
| Field | Validation | Error Message (Polish) |
|-------|------------|------------------------|
| Email | Required | "Email jest wymagany" |
| Email | Valid format | "Nieprawidłowy format email" |
| Password | Required | "Hasło jest wymagane" |
| Password | Min 8 chars | "Hasło musi mieć minimum 8 znaków" |

**Error Handling:**
| Scenario | User Feedback |
|----------|---------------|
| Invalid credentials | "Nieprawidłowy email lub hasło" |
| Rate limited | "Zbyt wiele prób logowania. Spróbuj ponownie za X minut." |
| Network error | "Brak połączenia z serwerem. Sprawdź połączenie internetowe." |
| Server error | "Wystąpił błąd. Spróbuj ponownie później." |

#### 1.3.2 RegisterForm

**Props:**

```typescript
interface RegisterFormProps {
  onSuccess?: () => void;
}
```

**Features:**

- Email input with email validation
- Password input with real-time strength indicator
- Password confirmation input
- "Zarejestruj się" (Register) submit button
- "Masz już konto? Zaloguj się" link → `/login`
- Loading state during submission
- ARIA descriptions for password requirements

**Validation Rules:**
| Field | Validation | Error Message (Polish) |
|-------|------------|------------------------|
| Email | Required | "Email jest wymagany" |
| Email | Valid format | "Nieprawidłowy format email" |
| Email | Not already registered | "Ten email jest już zarejestrowany" |
| Password | Required | "Hasło jest wymagane" |
| Password | Min 8 chars | "Hasło musi mieć minimum 8 znaków" |
| Password | 1 uppercase | "Hasło musi zawierać wielką literę" |
| Password | 1 lowercase | "Hasło musi zawierać małą literę" |
| Password | 1 number | "Hasło musi zawierać cyfrę" |
| Confirm | Match password | "Hasła nie są identyczne" |

**Password Strength Levels:**
| Level | Criteria | Color | Label (Polish) |
|-------|----------|-------|----------------|
| Weak | < 8 chars or missing criteria | Red | "Słabe" |
| Medium | 8+ chars, 2/3 criteria | Yellow | "Średnie" |
| Strong | 8+ chars, all criteria | Green | "Silne" |

#### 1.3.3 ResetPasswordForm

**Props:**

```typescript
interface ResetPasswordFormProps {
  onSuccess?: () => void;
}
```

**Features:**

- Email input
- "Wyślij link resetujący" submit button
- "Powrót do logowania" link → `/login`
- Success message after submission (always shown, regardless of email existence)
- Security: Same response whether email exists or not

**Validation Rules:**
| Field | Validation | Error Message (Polish) |
|-------|------------|------------------------|
| Email | Required | "Email jest wymagany" |
| Email | Valid format | "Nieprawidłowy format email" |

**Success Message:** "Jeśli podany email istnieje w systemie, wysłaliśmy link do zresetowania hasła. Sprawdź swoją skrzynkę."

#### 1.3.4 UpdatePasswordForm

**Props:**

```typescript
interface UpdatePasswordFormProps {
  onSuccess?: () => void;
}
```

**Features:**

- New password input with strength indicator
- Confirm password input
- "Ustaw nowe hasło" submit button
- Same password validation as RegisterForm
- **Success notification:** Toast message "Hasło zostało zmienione pomyślnie" shown before redirect to `/login`

#### 1.3.5 DeleteAccountModal (US-018)

**Props:**

```typescript
interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

**Features:**

- Modal/dialog triggered from Settings page
- Clear warning about permanent data loss
- Password input for re-verification
- Confirmation text input (user must type "USUŃ MOJE KONTO")
- "Usuń konto" (Delete account) submit button (destructive styling)
- "Anuluj" (Cancel) button to close modal
- Loading state during deletion
- Redirect to `/login` after successful deletion

**UI Layout:**

1. Warning icon and title: "Usuwanie konta"
2. Warning message (red background): "Ta operacja jest nieodwracalna. Wszystkie Twoje dane, w tym profil, inwentarz i historia, zostaną trwale usunięte."
3. Password input: "Potwierdź hasłem"
4. Confirmation input: "Wpisz USUŃ MOJE KONTO aby potwierdzić"
5. Action buttons: Cancel (secondary) | Delete (destructive)

**Validation Rules:**
| Field | Validation | Error Message (Polish) |
|-------|------------|------------------------|
| Password | Required | "Hasło jest wymagane" |
| Confirmation | Required | "Potwierdzenie jest wymagane" |
| Confirmation | Must be "USUŃ MOJE KONTO" | "Wpisz dokładnie: USUŃ MOJE KONTO" |

**Error Handling:**
| Scenario | User Feedback |
|----------|---------------|
| Invalid password | "Nieprawidłowe hasło" |
| Invalid confirmation | "Wpisz dokładnie: USUŃ MOJE KONTO" |
| Network error | "Brak połączenia z serwerem. Spróbuj ponownie." |
| Server error | "Wystąpił błąd. Spróbuj ponownie później." |

**API Integration:**
Calls existing `POST /api/auth/delete-account` endpoint with:

```typescript
{
  password: string;
  confirmation: string; // Must be "USUŃ MOJE KONTO"
}
```

### 1.4 Form Library Integration

Use **react-hook-form** with **zod** for form management and validation.

**Note:** Validation schemas are defined once in `src/lib/services/auth.service.ts` (see Section 2.2) and imported by form components. This ensures consistency between client-side and server-side validation.

### 1.5 Navigation and Routing Flow

#### 1.5.1 Unauthenticated User Flows

```
Landing (/) ──────────────────────────────────────┐
    │                                             │
    ▼                                             │
/login ◄──────────────────────────────────────────┤
    │                                             │
    ├── Success ──► /onboarding (new) or /inventory (returning)
    │                                             │
    ├── Click "Register" ──► /register            │
    │                             │               │
    │                             ├── Success ──► /onboarding
    │                             │               │
    │                             └── Click "Login" ──► /login
    │                                             │
    └── Click "Forgot Password" ──► /reset-password
                                        │
                                        └── Email sent ──► Check email
                                                              │
                                                              ▼
                                        /auth/callback (from email link)
                                                              │
                                                              ▼
                                        /update-password ──► /login
```

#### 1.5.2 Authenticated User Logout Flow

```
/settings ──► Click "Wyloguj się" ──► Confirmation dialog
                                            │
                                            ├── Cancel ──► Stay on /settings
                                            │
                                            └── Confirm ──► Clear session
                                                              │
                                                              ▼
                                                          /login
```

### 1.6 Layout Modifications

#### 1.6.1 Root Layout (`src/app/layout.tsx`)

No changes required. The root layout remains generic.

#### 1.6.2 Auth Layout (`src/app/(auth)/layout.tsx`)

**New file** with:

- Centered content (flexbox)
- Mealer logo at top
- Max-width container (400px)
- No header/footer navigation
- Polish language attribute

```typescript
// Structure
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-900">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          {/* Mealer Logo */}
        </div>
        {children}
      </div>
    </div>
  );
}
```

#### 1.6.3 App Layout (`src/app/(app)/layout.tsx`)

**New route group** `(app)` for authenticated pages with:

- Header component
- Bottom navigation
- Protected by middleware

```
src/app/(app)/
├── layout.tsx              # App layout with header + bottom nav
├── inventory/
│   └── page.tsx
├── recipes/
│   └── page.tsx
├── settings/
│   └── page.tsx
└── onboarding/
    └── page.tsx            # Move existing onboarding here
```

---

## 2. Backend Logic

### 2.1 API Endpoint Structure

#### 2.1.1 Authentication Endpoints (No API routes needed)

Supabase Auth is called directly from the client using the browser client (`src/db/supabase/client.ts`). The following operations do NOT require custom API routes:

| Operation              | Supabase Method         | Client-Side Call |
| ---------------------- | ----------------------- | ---------------- |
| Login                  | `signInWithPassword`    | Direct           |
| Register               | `signUp`                | Direct           |
| Logout                 | `signOut`               | Direct           |
| Reset password request | `resetPasswordForEmail` | Direct           |
| Update password        | `updateUser`            | Direct           |

#### 2.1.2 Auth Callback Route Handler

**File:** `src/app/auth/callback/route.ts`

**Purpose:** Handle OAuth redirects and magic link confirmations (including password reset links).

```typescript
// Route handler for /auth/callback
import { createClient } from "@/db/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/inventory";
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // For password reset, redirect to update-password page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/update-password`);
      }
      // For other auth flows, redirect to the 'next' page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to error page on failure
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

### 2.2 Auth Service Extension

**File:** `src/lib/services/auth.service.ts`

Extend the existing auth service with new validation schemas:

```typescript
// New validation schemas to add

/** Schema for login request validation */
export const loginSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Schema for registration request validation */
export const registerSchema = z
  .object({
    email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
    password: z
      .string()
      .min(8, "Hasło musi mieć minimum 8 znaków")
      .regex(/[A-Z]/, "Hasło musi zawierać wielką literę")
      .regex(/[a-z]/, "Hasło musi zawierać małą literę")
      .regex(/[0-9]/, "Hasło musi zawierać cyfrę"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** Schema for password reset request validation */
export const resetPasswordSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Schema for update password validation */
export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Hasło musi mieć minimum 8 znaków")
      .regex(/[A-Z]/, "Hasło musi zawierać wielką literę")
      .regex(/[a-z]/, "Hasło musi zawierać małą literę")
      .regex(/[0-9]/, "Hasło musi zawierać cyfrę"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

/** Schema for account deletion validation (US-018) - Already exists in auth.service.ts */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Hasło jest wymagane"),
  confirmation: z.string().min(1, "Potwierdzenie jest wymagane"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/** Required confirmation text for account deletion */
export const DELETE_ACCOUNT_CONFIRMATION = "USUŃ MOJE KONTO";
```

### 2.3 Type Definitions

**File:** `src/types.ts`

Add new DTOs for authentication:

```typescript
// =============================================================================
// Authentication DTOs
// =============================================================================

/** Request payload for login */
export interface LoginCommand {
  email: string;
  password: string;
}

/** Request payload for registration */
export interface RegisterCommand {
  email: string;
  password: string;
  confirmPassword: string;
}

/** Request payload for password reset request */
export interface ResetPasswordCommand {
  email: string;
}

/** Request payload for updating password */
export interface UpdatePasswordCommand {
  password: string;
  confirmPassword: string;
}

/** Auth error codes specific to authentication */
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_EXISTS"
  | "WEAK_PASSWORD"
  | "INVALID_EMAIL"
  | "SESSION_EXPIRED"
  | "RATE_LIMITED";

/** Authentication response with user data */
export interface AuthResponseDTO {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    expires_at: number;
  };
}

/** Request payload for account deletion (US-018) */
export interface DeleteAccountCommand {
  password: string;
  confirmation: string; // Must be "USUŃ MOJE KONTO"
}

/** Response for successful account deletion */
export interface DeleteAccountResponseDTO {
  message: string;
}
```

### 2.4 Input Validation

All validation is performed:

1. **Client-side**: Using react-hook-form with zod schemas (immediate feedback)
2. **Supabase-side**: Supabase Auth performs server-side validation

### 2.5 Error Handling

#### 2.5.1 Supabase Auth Error Mapping

Map Supabase Auth errors to user-friendly Polish messages:

```typescript
// src/lib/utils/auth-errors.ts

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Nieprawidłowy email lub hasło",
  "Email not confirmed": "Email nie został potwierdzony. Sprawdź swoją skrzynkę.",
  "User already registered": "Ten email jest już zarejestrowany",
  "Password should be at least 6 characters": "Hasło jest za krótkie",
  "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie później.",
  "For security purposes, you can only request this once every 60 seconds":
    "Ze względów bezpieczeństwa możesz wysłać kolejną prośbę za 60 sekund.",
};

export function mapAuthError(error: Error | null): string {
  if (!error) return "Wystąpił nieznany błąd";

  const message = AUTH_ERROR_MESSAGES[error.message];
  if (message) return message;

  // Fallback for unmapped errors
  console.error("Unmapped auth error:", error.message);
  return "Wystąpił błąd. Spróbuj ponownie później.";
}
```

---

## 3. Authentication System

### 3.1 Supabase Auth Configuration

#### 3.1.1 Environment Variables

Required environment variables (already partially configured):

```env
# Public (exposed to client)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Private (server-only)
SUPABASE_SERVICE_ROLE_KEY=xxx  # Already exists for delete-account

# App URL for redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 3.1.2 Supabase Project Settings (Dashboard)

Configure in Supabase Dashboard → Authentication → Settings:

| Setting                    | Value                                  | Notes                                                                                                          |
| -------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Site URL                   | `${NEXT_PUBLIC_APP_URL}`               | For redirect URLs                                                                                              |
| Redirect URLs              | `${NEXT_PUBLIC_APP_URL}/auth/callback` | Whitelist callback                                                                                             |
| Email Templates            | Polish translations                    | Customize templates                                                                                            |
| Minimum password length    | 8                                      | Match frontend validation                                                                                      |
| Enable email confirmations | **No** (MVP)                           | Disabled for MVP to allow immediate access after registration. Enable for production to prevent fake accounts. |
| Email rate limit           | 4 per hour                             | Prevent abuse                                                                                                  |
| Session duration           | 7 days                                 | JWT expiry                                                                                                     |

**Note on Email Confirmations (MVP vs Production):**

- **MVP:** Email confirmation is **disabled** to reduce friction. Users can immediately proceed to onboarding after registration.
- **Production:** Consider enabling email confirmation to prevent spam accounts. If enabled, update the navigation flow in Section 1.5.1 to include an "Email Verification Pending" state.

#### 3.1.3 Email Templates (Polish)

Customize Supabase email templates with Polish text:

**Confirmation Email:**

```
Temat: Potwierdź swoje konto w Mealer

Witaj,

Kliknij poniższy link, aby potwierdzić swoje konto:
{{ .ConfirmationURL }}

Link wygaśnie za 24 godziny.

Zespół Mealer
```

**Password Reset Email:**

```
Temat: Zresetuj hasło w Mealer

Witaj,

Kliknij poniższy link, aby zresetować hasło:
{{ .ConfirmationURL }}

Link wygaśnie za 24 godziny.

Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.

Zespół Mealer
```

**Email Delivery SLA:**
Per PRD US-003, password reset emails should be delivered within 2 minutes. This depends on:

- Supabase email infrastructure (or custom SMTP provider)
- No email service degradation

If using Supabase's built-in email, delivery is typically within seconds. For production, consider using a dedicated SMTP provider (e.g., SendGrid, Resend) for better delivery guarantees and monitoring.

### 3.2 Next.js Middleware

#### 3.2.1 New Middleware File

**File:** `src/middleware.ts` (root of src folder)

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/db/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/register", "/reset-password", "/auth/callback"];

// Routes that require completed onboarding
const ONBOARDING_REQUIRED_ROUTES = ["/inventory/scan", "/recipes"];

export async function middleware(request: NextRequest) {
  // Update session (refresh token if needed)
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return response;
  }

  // Create Supabase client to check auth status
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith("/auth/"));

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    // Check onboarding status
    const { data: profile } = await supabase.from("profiles").select("onboarding_status").eq("id", user.id).single();

    if (profile?.onboarding_status === "pending") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    return NextResponse.redirect(new URL("/inventory", request.url));
  }

  // Check onboarding requirement for specific routes
  if (user && ONBOARDING_REQUIRED_ROUTES.some((route) => pathname.startsWith(route))) {
    const { data: profile } = await supabase.from("profiles").select("onboarding_status").eq("id", user.id).single();

    if (profile?.onboarding_status === "pending") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 3.3 Client-Side Auth Hooks

#### 3.3.1 Auth Context Provider

**File:** `src/components/providers/AuthProvider.tsx`

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/db/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### 3.4 Session Management

#### 3.4.1 Token Refresh

Handled automatically by:

1. **Middleware**: `updateSession()` refreshes expired tokens on each request
2. **Client**: Supabase JS client auto-refreshes tokens in the background

#### 3.4.2 Session Storage

- JWT tokens stored in HTTP-only cookies (set by Supabase SSR)
- Secure cookie attributes in production (`Secure`, `SameSite=Lax`)
- 7-day session duration (configurable in Supabase dashboard)

#### 3.4.3 Logout Process

1. Call `supabase.auth.signOut()`
2. Supabase clears auth cookies
3. Clear any client-side state (IndexedDB recipe cache - optional)
4. Redirect to `/login`

### 3.5 Profile Creation Trigger

When a new user registers, a database trigger should create their profile:

**Supabase SQL Migration:**

```sql
-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, onboarding_status)
  VALUES (new.id, 'pending');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 4. Security Considerations

### 4.1 Password Security

| Measure        | Implementation                            |
| -------------- | ----------------------------------------- |
| Minimum length | 8 characters                              |
| Complexity     | Requires uppercase, lowercase, and number |
| Storage        | Hashed by Supabase (bcrypt)               |
| Transmission   | HTTPS only                                |
| Client display | Always masked (`type="password"`)         |

### 4.2 Rate Limiting

| Action                  | Limit                    | Implementation            |
| ----------------------- | ------------------------ | ------------------------- |
| Login attempts          | Handled by Supabase Auth | Server-side               |
| Password reset requests | 4 per hour               | Supabase email rate limit |
| Registration            | Standard rate limit      | Supabase Auth             |

### 4.3 Security Headers

Ensure Next.js sends appropriate security headers (configure in `next.config.js`):

```javascript
// next.config.js
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];
```

### 4.4 CSRF Protection

- Supabase Auth uses secure, HTTP-only cookies with SameSite attribute
- Next.js API routes automatically protected
- No custom CSRF token needed

---

## 5. Accessibility Requirements

### 5.1 Form Accessibility

| Requirement         | Implementation                                |
| ------------------- | --------------------------------------------- |
| Labels              | All inputs have associated `<label>` elements |
| Error announcements | Use `aria-describedby` for error messages     |
| Focus management    | Focus first error field on validation failure |
| Keyboard navigation | Full keyboard support (Tab, Enter, Escape)    |
| Loading states      | Announce with `aria-busy` and `aria-live`     |

### 5.2 Password Field Accessibility

```html
<label htmlFor="password">Hasło</label>
<input
  type="password"
  id="password"
  aria-describedby="password-requirements password-error"
  aria-invalid="{hasError}"
/>
<div id="password-requirements" className="sr-only">
  Hasło musi mieć minimum 8 znaków, zawierać wielką literę, małą literę i cyfrę.
</div>
<div id="password-error" role="alert">{errorMessage}</div>
```

---

## 6. Implementation Checklist

### 6.1 Phase 1: Infrastructure

- [ ] Create `src/middleware.ts` with route protection
- [ ] Create `src/app/auth/callback/route.ts` handler
- [ ] Add validation schemas to `src/lib/services/auth.service.ts`
- [ ] Add auth error mapping utility
- [ ] Add new DTOs to `src/types.ts`

### 6.2 Phase 2: UI Components

- [ ] Install dependencies: `react-hook-form`, `@hookform/resolvers`
- [ ] Create shadcn/ui Input component
- [ ] Create shadcn/ui Alert component
- [ ] Create shadcn/ui Form component
- [ ] Create shadcn/ui Dialog component (for DeleteAccountModal)
- [ ] Create `AuthProvider` context
- [ ] Create `LoginForm` component
- [ ] Create `RegisterForm` component
- [ ] Create `ResetPasswordForm` component
- [ ] Create `UpdatePasswordForm` component
- [ ] Create `PasswordStrengthIndicator` component
- [ ] Create `DeleteAccountModal` component (US-018)

### 6.3 Phase 3: Pages & Layouts

- [ ] Create `src/app/(auth)/layout.tsx`
- [ ] Create `src/app/(auth)/login/page.tsx`
- [ ] Create `src/app/(auth)/register/page.tsx`
- [ ] Create `src/app/(auth)/reset-password/page.tsx`
- [ ] Create `src/app/(auth)/update-password/page.tsx`
- [ ] Restructure existing pages into `(app)` route group

### 6.4 Phase 4: Integration

- [ ] Wrap app with `AuthProvider`
- [ ] Add logout button to Settings page
- [ ] Add delete account button to Settings page (triggers DeleteAccountModal)
- [ ] Configure Supabase email templates (Polish)
- [ ] Add database trigger for profile creation
- [ ] Test complete auth flows

### 6.5 Phase 5: Polish & Security

- [ ] Add security headers to `next.config.js`
- [ ] Test rate limiting behavior
- [ ] Verify accessibility with screen reader
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile responsiveness testing

---

## 7. Dependencies

### 7.1 New NPM Packages

```bash
npm install react-hook-form @hookform/resolvers
```

### 7.2 Shadcn/ui Components to Add

```bash
npx shadcn@latest add input alert form dialog
```

---

## 8. File Structure Summary

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                    # Auth pages layout
│   │   ├── login/
│   │   │   └── page.tsx                  # Login page
│   │   ├── register/
│   │   │   └── page.tsx                  # Registration page
│   │   ├── reset-password/
│   │   │   └── page.tsx                  # Reset password page
│   │   └── update-password/
│   │       └── page.tsx                  # Update password page
│   ├── (app)/
│   │   ├── layout.tsx                    # Authenticated app layout
│   │   ├── inventory/
│   │   ├── recipes/
│   │   ├── settings/
│   │   └── onboarding/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                  # Auth callback handler
│   └── api/
│       └── auth/
│           └── delete-account/
│               └── route.ts              # Existing
├── components/
│   ├── auth/
│   │   ├── AuthCard.tsx
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   ├── UpdatePasswordForm.tsx
│   │   ├── PasswordStrengthIndicator.tsx
│   │   └── DeleteAccountModal.tsx      # US-018
│   ├── providers/
│   │   └── AuthProvider.tsx
│   └── ui/
│       ├── input.tsx                     # New
│       ├── alert.tsx                     # New
│       ├── form.tsx                      # New
│       ├── dialog.tsx                    # New (for DeleteAccountModal)
│       └── ... (existing)
├── lib/
│   ├── services/
│   │   └── auth.service.ts               # Extended with schemas
│   └── utils/
│       └── auth-errors.ts                # New error mapping
├── middleware.ts                          # New root middleware
└── types.ts                               # Extended with auth DTOs
```

---

## 9. Compatibility Notes

### 9.1 Existing Functionality Preserved

- **Delete Account API** (`/api/auth/delete-account`): Existing implementation already handles:
  - Password re-verification
  - Confirmation text requirement ("USUŃ MOJE KONTO")
  - Cascade deletion of all user data
  - Session invalidation

  **New requirement:** Add `DeleteAccountModal` UI component (Section 1.3.5) to call this API from Settings page.

- **Onboarding** (`/onboarding`): Will be moved to `(app)` route group, protected by middleware
- **Profile API** (`/api/profile`): No changes, already requires authentication
- **All other APIs**: Protected by existing authentication checks

### 9.2 Migration Considerations

1. Existing `src/app/onboarding/` directory should be moved to `src/app/(app)/onboarding/`
2. The root `page.tsx` can redirect to `/login` or serve as a landing page
3. Existing Supabase client setup (`client.ts`, `server.ts`, `middleware.ts`) remains unchanged

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Validation schemas (zod)
- Error mapping functions
- Password strength calculation

### 10.2 Integration Tests

- Login flow (valid/invalid credentials)
- Registration flow (new user, existing email)
- Password reset flow (email sending, link validity)
- Logout flow (session clearing)
- Middleware redirects
- Delete account flow (password verification, confirmation text, data deletion, redirect)

### 10.3 E2E Tests

- Complete user journey: Register → Onboarding → Inventory → Logout → Login
- Password reset complete flow
- Session expiration handling
