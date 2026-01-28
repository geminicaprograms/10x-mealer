# Authentication Flow Diagram - Mealer

## Analysis

<authentication_analysis>

### 1. Authentication flows mentioned in the specification

1. **Login (US-002)**: Email/password → verification → session → redirect
2. **Registration (US-001)**: Email/password → account creation → profile creation → onboarding
3. **Password Reset (US-003)**: Email → link → callback → new password
4. **Logout (US-004)**: End session → clear cookies → redirect
5. **Account Deletion (US-018)**: Password verification → confirmation → deletion → logout
6. **Token Refresh**: Automatic via middleware on each request

### 2. Main actors and their interactions

| Actor              | Role                   | Interactions                                  |
| ------------------ | ---------------------- | --------------------------------------------- |
| Browser            | User client            | Sends requests, stores session cookies        |
| Next.js Middleware | Intermediary layer     | Verifies session, refreshes tokens, redirects |
| Next.js API        | Application server     | Processes requests, validates data            |
| Supabase Auth      | Authentication service | Manages users, tokens, sessions               |
| Email Service      | Email service          | Sends password reset emails                   |

### 3. Token verification and refresh processes

**Token Verification:**

1. Middleware intercepts every request
2. `supabase.auth.getUser()` verifies JWT token
3. If token expired, attempt refresh via refresh token
4. If refresh fails, redirect to `/login`

**Token Refresh:**

1. Supabase JS client automatically refreshes tokens in background
2. Middleware calls `updateSession()` on every server request
3. New tokens saved in HTTP-only cookies
4. Session lasts 7 days (configurable)

### 4. Authentication steps description

**Login:**

1. User enters email/password
2. Client-side validation (zod schema)
3. `signInWithPassword()` to Supabase
4. Supabase verifies credentials
5. Returns JWT access_token and refresh_token
6. Tokens saved in HTTP-only cookies
7. Redirect to `/onboarding` or `/inventory`

**Registration:**

1. User enters email/password with confirmation
2. Password strength validation (min 8 chars, uppercase/lowercase, digit)
3. `signUp()` to Supabase
4. Supabase creates user in auth.users
5. Database trigger creates profile with `onboarding_status: 'pending'`
6. Redirect to `/onboarding`

**Password Reset:**

1. User enters email
2. `resetPasswordForEmail()` with `redirectTo: /auth/callback?type=recovery`
3. Supabase sends email with link
4. User clicks link → `/auth/callback`
5. Callback exchanges code for session
6. Redirect to `/update-password`
7. User sets new password via `updateUser()`

</authentication_analysis>

## Diagram - Login Process

<mermaid_diagram>

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser
    participant MW as Middleware
    participant API as Next.js API
    participant Auth as Supabase Auth
    participant DB as Database

    Note over Browser,Auth: LOGIN PROCESS

    Browser->>Browser: User fills form
    Browser->>Browser: Client-side validation

    Browser->>Auth: signInWithPassword(email, password)
    activate Auth
    Auth->>Auth: Verify credentials

    alt Credentials valid
        Auth->>Auth: Generate JWT tokens
        Auth-->>Browser: Return access_token + refresh_token
        deactivate Auth
        Browser->>Browser: Save tokens in cookies

        Browser->>MW: GET /inventory
        activate MW
        MW->>Auth: getUser() - verify token
        Auth-->>MW: User data

        MW->>DB: SELECT onboarding_status
        DB-->>MW: status

        alt Onboarding pending
            MW-->>Browser: Redirect /onboarding
        else Onboarding completed
            MW-->>Browser: Redirect /inventory
        end
        deactivate MW
    else Credentials invalid
        Auth-->>Browser: Error: Invalid credentials
        Browser->>Browser: Display error
    else Rate limited
        Auth-->>Browser: Error: Too many attempts
        Browser->>Browser: Display rate limit error
    end
```

</mermaid_diagram>

## Diagram - Registration Process

<mermaid_diagram>

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser
    participant Auth as Supabase Auth
    participant DB as Database
    participant Trigger as DB Trigger

    Note over Browser,DB: REGISTRATION PROCESS

    Browser->>Browser: Fill registration form
    Browser->>Browser: Validate password strength

    Browser->>Auth: signUp(email, password)
    activate Auth

    alt Email already exists
        Auth-->>Browser: Error: Email registered
        Browser->>Browser: Display error
    else Email available
        Auth->>Auth: Hash password with bcrypt
        Auth->>DB: INSERT INTO auth.users
        activate DB
        DB-->>Auth: User created

        Note over DB,Trigger: Automatic trigger
        DB->>Trigger: AFTER INSERT on auth.users
        activate Trigger
        Trigger->>DB: INSERT INTO profiles
        Note right of DB: onboarding_status = pending
        Trigger-->>DB: Profile created
        deactivate Trigger
        deactivate DB

        Auth->>Auth: Generate JWT tokens
        Auth-->>Browser: Return session + user
        deactivate Auth

        Browser->>Browser: Save tokens in cookies
        Browser->>Browser: Redirect /onboarding
    end
```

</mermaid_diagram>

## Diagram - Password Reset

<mermaid_diagram>

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser
    participant Auth as Supabase Auth
    participant Email as Email Service
    participant Callback as Auth Callback

    Note over Browser,Callback: PASSWORD RESET PROCESS

    Browser->>Browser: Enter email
    Browser->>Auth: resetPasswordForEmail(email)
    activate Auth

    Note over Auth: Always same response
    Note over Auth: for security reasons

    alt Email exists
        Auth->>Email: Send reset link
        activate Email
        Email-->>Email: Link with code and type=recovery
        deactivate Email
    end

    Auth-->>Browser: Success message
    deactivate Auth
    Browser->>Browser: Display success message

    Note over Browser,Callback: USER CLICKS LINK IN EMAIL

    Browser->>Callback: GET /auth/callback?code=xxx&type=recovery
    activate Callback
    Callback->>Auth: exchangeCodeForSession(code)
    activate Auth

    alt Code valid
        Auth->>Auth: Create session
        Auth-->>Callback: Session data
        deactivate Auth
        Callback-->>Browser: Redirect /update-password
    else Code invalid or expired
        Auth-->>Callback: Error
        Callback-->>Browser: Redirect /login?error=auth_callback_failed
    end
    deactivate Callback

    Note over Browser,Auth: SET NEW PASSWORD

    Browser->>Browser: Enter new password
    Browser->>Browser: Validate password strength
    Browser->>Auth: updateUser(new password)
    activate Auth
    Auth->>Auth: Hash and save password
    Auth-->>Browser: Success
    deactivate Auth
    Browser->>Browser: Toast: Password changed
    Browser->>Browser: Redirect /login
```

</mermaid_diagram>

## Diagram - Session Management

<mermaid_diagram>

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser
    participant MW as Middleware
    participant Auth as Supabase Auth

    Note over Browser,Auth: SESSION VERIFICATION AND REFRESH

    Browser->>MW: Request protected page
    activate MW
    MW->>MW: updateSession(request)
    MW->>Auth: getUser()
    activate Auth

    alt Token valid
        Auth-->>MW: User data
        MW-->>Browser: Return page
    else Token expired, refresh valid
        Auth->>Auth: Refresh access_token
        Auth-->>MW: New tokens + User data
        MW->>MW: Set new cookies
        MW-->>Browser: Return page + new cookies
    else No session or refresh expired
        Auth-->>MW: No session
        deactivate Auth
        MW-->>Browser: Redirect /login?redirect=original_path
    end
    deactivate MW

    Note over Browser,Auth: LOGOUT PROCESS

    Browser->>Auth: signOut()
    activate Auth
    Auth->>Auth: Invalidate session
    Auth-->>Browser: Success
    deactivate Auth
    Browser->>Browser: Clear cookies
    Browser->>Browser: Clear local state
    Browser->>Browser: Redirect /login
```

</mermaid_diagram>

## Diagram - Account Deletion

<mermaid_diagram>

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Browser
    participant API as Delete Account API
    participant Auth as Supabase Auth
    participant Admin as Supabase Admin
    participant DB as Database

    Note over Browser,DB: ACCOUNT DELETION PROCESS (US-018)

    Browser->>Browser: Open DeleteAccountModal
    Browser->>Browser: Enter password
    Browser->>Browser: Type confirmation text

    Browser->>API: POST /api/auth/delete-account
    activate API
    API->>API: Validate JSON body
    API->>Auth: getUser()
    activate Auth
    Auth-->>API: User data
    deactivate Auth

    API->>API: Verify confirmation text

    alt Confirmation incorrect
        API-->>Browser: 403 Invalid confirmation
        Browser->>Browser: Display error
    else Confirmation correct
        API->>Auth: signInWithPassword(email, password)
        activate Auth

        alt Password incorrect
            Auth-->>API: Error
            deactivate Auth
            API-->>Browser: 403 Invalid password
            Browser->>Browser: Display error
        else Password correct
            Auth-->>API: Success

            API->>Admin: admin.deleteUser(userId)
            activate Admin
            Admin->>DB: CASCADE DELETE
            Note over DB: Delete profile, inventory
            Note over DB: AI history, all data
            DB-->>Admin: Deleted
            Admin-->>API: Success
            deactivate Admin

            API->>Auth: signOut()
            Auth-->>API: Session cleared

            API-->>Browser: 200 Account deleted
            deactivate API
            Browser->>Browser: Clear state
            Browser->>Browser: Redirect /login
        end
    end
```

</mermaid_diagram>

## Security Summary

| Aspect            | Implementation                                |
| ----------------- | --------------------------------------------- |
| Password storage  | Bcrypt via Supabase                           |
| Session tokens    | JWT in HTTP-only cookies                      |
| Cookie attributes | Secure, SameSite=Lax (production)             |
| Rate limiting     | Handled by Supabase Auth                      |
| CSRF              | Protection via SameSite cookies               |
| Password reset    | Uniform message regardless of email existence |
| Account deletion  | Requires password + confirmation text         |
