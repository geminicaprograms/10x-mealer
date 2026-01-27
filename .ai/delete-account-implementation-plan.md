# API Endpoint Implementation Plan: Delete Account

## 1. Endpoint Overview

The `POST /api/auth/delete-account` endpoint allows authenticated users to permanently delete their account and all associated data. This is a destructive, irreversible operation that requires:

1. **Password verification** - User must provide their current password to confirm identity
2. **Explicit confirmation** - User must type the exact Polish phrase "USUŃ MOJE KONTO" (Delete My Account)

Upon successful deletion, all user data is permanently removed from the system including:

- User profile (allergies, diets, equipment preferences)
- Inventory items (both regular items and staples)
- AI usage logs
- Authentication credentials

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/auth/delete-account`
- **Content-Type:** `application/json`

### Parameters

| Parameter      | Type   | Required | Description                                        |
| -------------- | ------ | -------- | -------------------------------------------------- |
| `password`     | string | Yes      | User's current password for re-authentication      |
| `confirmation` | string | Yes      | Must be exactly "USUŃ MOJE KONTO" (case-sensitive) |

### Request Body Schema

```json
{
  "password": "current_password",
  "confirmation": "USUŃ MOJE KONTO"
}
```

### Validation Rules

1. **password**:
   - Must be a non-empty string
   - Must match the authenticated user's current password
   - Minimum length validation (defer to Supabase auth)

2. **confirmation**:
   - Must be exactly "USUŃ MOJE KONTO" (case-sensitive, no extra whitespace)
   - Acts as a safeguard against accidental deletion

## 3. Used Types

### Existing Types (from `src/types.ts`)

```typescript
/** Request payload for POST /api/auth/delete-account */
export interface DeleteAccountCommand {
  password: string;
  confirmation: string;
}

/** Response for POST /api/auth/delete-account */
export interface DeleteAccountResponseDTO {
  message: string;
}
```

### New Zod Schema (to be created in `auth.service.ts`)

```typescript
import { z } from "zod";

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmation: z.string().min(1, "Confirmation is required"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "message": "Konto zostało usunięte pomyślnie"
}
```

### Error Responses

| Status Code | Error Code       | Description                                      |
| ----------- | ---------------- | ------------------------------------------------ |
| 400         | VALIDATION_ERROR | Missing or invalid required fields               |
| 401         | UNAUTHORIZED     | User not authenticated                           |
| 403         | FORBIDDEN        | Password incorrect or confirmation text mismatch |
| 500         | INTERNAL_ERROR   | Unexpected server error                          |

#### Example Error Response (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "password", "message": "Password is required" },
      { "field": "confirmation", "message": "Confirmation is required" }
    ]
  }
}
```

#### Example Error Response (403)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Invalid password or confirmation"
  }
}
```

## 5. Data Flow

```
┌─────────────────┐
│  Client Request │
│  POST /api/auth/│
│  delete-account │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  1. Parse JSON body             │
│  2. Validate with Zod schema    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  3. Authenticate user           │
│     (supabase.auth.getUser())   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  4. Verify confirmation text    │
│     === "USUŃ MOJE KONTO"       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  5. Verify password             │
│     (signInWithPassword)        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  6. Delete user via Admin API   │
│     (admin.deleteUser)          │
│                                 │
│  CASCADE deletes:               │
│  - profiles                     │
│  - inventory_items              │
│  - ai_usage_log                 │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  7. Sign out (clear session)    │
│     (supabase.auth.signOut())   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  8. Return success response     │
│     200 OK                      │
└─────────────────────────────────┘
```

### Database Cascade Behavior

Due to `ON DELETE CASCADE` constraints defined in the database schema:

| Parent Table | Child Table     | Behavior     |
| ------------ | --------------- | ------------ |
| auth.users   | profiles        | Auto-deleted |
| auth.users   | inventory_items | Auto-deleted |
| auth.users   | ai_usage_log    | Auto-deleted |

No manual deletion of child records is required.

## 6. Security Considerations

### Authentication

- User must be authenticated via Supabase session (cookie or Bearer token)
- Use `supabase.auth.getUser()` to validate JWT server-side (not just `getSession()`)

### Re-Authentication

- Password verification provides re-authentication to prevent unauthorized deletion if session is hijacked
- Use `signInWithPassword` with the user's email and provided password to verify

### Confirmation Safeguard

- Explicit text confirmation "USUŃ MOJE KONTO" prevents accidental deletion
- Exact match required (case-sensitive, no trimming)

### Rate Limiting Considerations

- Consider implementing rate limiting to prevent password brute-force attacks
- Recommended: Max 5 attempts per hour per user/IP

### Logging

- Log account deletion events (without sensitive data) for audit purposes
- Include: user_id, timestamp, success/failure status

### Session Invalidation

- After successful deletion, explicitly sign out to clear any remaining session tokens

### Security Headers

- Response should include appropriate security headers
- No caching: `Cache-Control: no-store, max-age=0`

## 7. Error Handling

### Error Scenarios and Responses

| Scenario                   | HTTP Status | Error Code       | Message                            |
| -------------------------- | ----------- | ---------------- | ---------------------------------- |
| Invalid JSON body          | 400         | VALIDATION_ERROR | "Invalid JSON in request body"     |
| Missing password field     | 400         | VALIDATION_ERROR | "Validation failed" (with details) |
| Missing confirmation field | 400         | VALIDATION_ERROR | "Validation failed" (with details) |
| Empty password             | 400         | VALIDATION_ERROR | "Validation failed" (with details) |
| Empty confirmation         | 400         | VALIDATION_ERROR | "Validation failed" (with details) |
| No authentication          | 401         | UNAUTHORIZED     | "Authentication required"          |
| Invalid/expired session    | 401         | UNAUTHORIZED     | "Authentication required"          |
| Incorrect password         | 403         | FORBIDDEN        | "Invalid password or confirmation" |
| Confirmation mismatch      | 403         | FORBIDDEN        | "Invalid password or confirmation" |
| Database error             | 500         | INTERNAL_ERROR   | "An unexpected error occurred"     |
| Admin API failure          | 500         | INTERNAL_ERROR   | "An unexpected error occurred"     |

### Security Note on 403 Errors

For security reasons, the same error message is returned for both:

- Incorrect password
- Incorrect confirmation text

This prevents attackers from knowing which field is wrong, adding a layer of protection against targeted attacks.

### Error Logging

```typescript
// Log errors for debugging (without sensitive data)
console.error("Account deletion failed:", {
  userId: user.id,
  reason: "password_mismatch" | "confirmation_mismatch" | "db_error",
  timestamp: new Date().toISOString(),
});
```

## 8. Performance Considerations

### Expected Performance

- Endpoint should complete within 2-3 seconds under normal conditions
- Password verification adds ~100-200ms latency
- Database cascade deletions are handled efficiently by PostgreSQL

### Potential Bottlenecks

1. **Password verification** - Network call to Supabase Auth
2. **User deletion** - Admin API call to Supabase
3. **Cascade deletes** - Depends on amount of user data

### Optimizations

1. **No need for transaction** - Supabase handles cascade atomically
2. **Parallel operations not possible** - Sequential flow required for security
3. **Minimal database queries** - Single delete triggers all cascades

### Monitoring Recommendations

- Track endpoint response times
- Monitor deletion success/failure rates
- Alert on unusual deletion patterns (potential attack)

## 9. Implementation Steps

### Step 1: Create Supabase Admin Client

Create a new file `src/db/supabase/admin.ts` for admin operations:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/supabase/database.types";

/**
 * Creates a Supabase admin client with service role key.
 * Use ONLY for admin operations like user deletion.
 * NEVER expose this client to the frontend.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

### Step 2: Create Auth Service

Create `src/lib/services/auth.service.ts`:

```typescript
import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase/server";
import { createAdminClient } from "@/db/supabase/admin";

// =============================================================================
// Constants
// =============================================================================

/** Required confirmation text for account deletion (Polish) */
export const DELETE_ACCOUNT_CONFIRMATION = "USUŃ MOJE KONTO";

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Zod schema for validating POST /api/auth/delete-account request body.
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmation: z.string().min(1, "Confirmation is required"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// =============================================================================
// Verification Functions
// =============================================================================

/**
 * Verifies the confirmation text matches the required phrase.
 *
 * @param confirmation - User-provided confirmation text
 * @returns true if confirmation matches exactly
 */
export function verifyConfirmationText(confirmation: string): boolean {
  return confirmation === DELETE_ACCOUNT_CONFIRMATION;
}

/**
 * Verifies the user's password by attempting to sign in.
 *
 * @param supabase - Supabase client instance
 * @param email - User's email address
 * @param password - Password to verify
 * @returns true if password is valid, false otherwise
 */
export async function verifyUserPassword(supabase: SupabaseClient, email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return !error;
}

// =============================================================================
// Account Deletion
// =============================================================================

/**
 * Deletes a user account using the Supabase Admin API.
 * This will cascade delete all associated data (profiles, inventory, etc.)
 *
 * @param userId - The user's UUID
 * @throws Error if deletion fails
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Failed to delete user account:", {
      userId,
      error: error.message,
    });
    throw new Error("Failed to delete user account");
  }
}

/**
 * Signs out the user to invalidate their session.
 *
 * @param supabase - Supabase client instance
 */
export async function signOutUser(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}
```

### Step 3: Create API Route Handler

Create `src/app/api/auth/delete-account/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  deleteAccountSchema,
  verifyConfirmationText,
  verifyUserPassword,
  deleteUserAccount,
  signOutUser,
} from "@/lib/services/auth.service";
import { unauthorizedError, validationError, forbiddenError, internalError } from "@/lib/api/errors";
import type { DeleteAccountResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/auth/delete-account
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires password verification and explicit confirmation text.
 *
 * @returns DeleteAccountResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 403, 500)
 *
 * @security Requires authentication + password re-verification
 */
export async function POST(request: NextRequest): Promise<NextResponse<DeleteAccountResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const parseResult = deleteAccountSchema.safeParse(body);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const { password, confirmation } = parseResult.data;

    // 3. Create Supabase client and authenticate
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Verify confirmation text
    if (!verifyConfirmationText(confirmation)) {
      console.warn("Account deletion failed: confirmation mismatch", {
        userId: user.id,
      });
      return forbiddenError("Invalid password or confirmation");
    }

    // 5. Verify password (requires user email)
    if (!user.email) {
      console.error("User has no email address", { userId: user.id });
      return internalError();
    }

    const passwordValid = await verifyUserPassword(supabase, user.email, password);

    if (!passwordValid) {
      console.warn("Account deletion failed: password mismatch", {
        userId: user.id,
      });
      return forbiddenError("Invalid password or confirmation");
    }

    // 6. Delete user account (cascades to all related data)
    await deleteUserAccount(user.id);

    // 7. Sign out to clear session
    await signOutUser(supabase);

    // 8. Return success response
    const response: DeleteAccountResponseDTO = {
      message: "Konto zostało usunięte pomyślnie",
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return internalError();
  }
}
```

### Step 4: Add Environment Variable

Add to `.env.local` (DO NOT commit to version control):

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Update `.env.example`:

```env
# Supabase Admin (server-side only)
SUPABASE_SERVICE_ROLE_KEY=
```

### Step 5: Add Test Script

Add to `scripts/test-ai-endpoints.sh` or create new `scripts/test-auth-endpoints.sh`:

```bash
#!/bin/bash

# Test DELETE Account endpoint
echo "=== Testing DELETE Account ==="

# Test without auth (expect 401)
echo "Test 1: No authentication"
curl -s -X POST http://localhost:3000/api/auth/delete-account \
  -H "Content-Type: application/json" \
  -d '{"password":"test","confirmation":"USUŃ MOJE KONTO"}' | jq

# Test with missing fields (expect 400)
echo "Test 2: Missing password"
curl -s -X POST http://localhost:3000/api/auth/delete-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"confirmation":"USUŃ MOJE KONTO"}' | jq

# Test with wrong confirmation (expect 403)
echo "Test 3: Wrong confirmation"
curl -s -X POST http://localhost:3000/api/auth/delete-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"password":"correct_password","confirmation":"wrong text"}' | jq

# Test with wrong password (expect 403)
echo "Test 4: Wrong password"
curl -s -X POST http://localhost:3000/api/auth/delete-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"password":"wrong_password","confirmation":"USUŃ MOJE KONTO"}' | jq

# Test successful deletion (expect 200)
# WARNING: This will actually delete the account!
# echo "Test 5: Successful deletion"
# curl -s -X POST http://localhost:3000/api/auth/delete-account \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer $TOKEN" \
#   -d '{"password":"correct_password","confirmation":"USUŃ MOJE KONTO"}' | jq
```

### Step 6: Implementation Checklist

- [ ] Create `src/db/supabase/admin.ts` with admin client
- [ ] Create `src/lib/services/auth.service.ts` with:
  - [ ] `deleteAccountSchema` Zod validation
  - [ ] `DELETE_ACCOUNT_CONFIRMATION` constant
  - [ ] `verifyConfirmationText()` function
  - [ ] `verifyUserPassword()` function
  - [ ] `deleteUserAccount()` function
  - [ ] `signOutUser()` function
- [ ] Create `src/app/api/auth/delete-account/route.ts` route handler
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to environment variables
- [ ] Update `.env.example` with placeholder
- [ ] Test all error scenarios manually
- [ ] Test successful deletion with test account
- [ ] Verify cascade deletion of related data
- [ ] Add logging for audit trail

## 10. File Structure Summary

After implementation, the following files will be created/modified:

```
src/
├── app/
│   └── api/
│       └── auth/
│           └── delete-account/
│               └── route.ts          # NEW: Route handler
├── db/
│   └── supabase/
│       ├── admin.ts                  # NEW: Admin client
│       └── server.ts                 # EXISTING
├── lib/
│   ├── api/
│   │   └── errors.ts                 # EXISTING
│   └── services/
│       └── auth.service.ts           # NEW: Auth service
└── types.ts                          # EXISTING (types already defined)
```

## 11. Notes for Reviewers

1. **Service Role Key Security**: The `SUPABASE_SERVICE_ROLE_KEY` has full admin access. Ensure it is:
   - Never exposed to the client
   - Only used in server-side code
   - Not committed to version control

2. **Error Message Consistency**: The 403 response uses the same message for password and confirmation failures to prevent information leakage.

3. **Cascade Deletion**: All user data is automatically deleted via database CASCADE constraints. No manual cleanup required.

4. **Session Handling**: After deletion, the user's session is explicitly invalidated to prevent any stale auth state.

5. **No Soft Delete**: This implementation performs a hard delete. If soft delete is needed in the future, the database schema and service logic would need to be modified.
