# API Endpoint Implementation Plan: GET /api/profile

## 1. Endpoint Overview

This endpoint retrieves the authenticated user's profile information. The profile contains user preferences for food-related settings including allergies, dietary restrictions, and available kitchen equipment. This data is essential for the AI-powered recipe customization features.

**Key Characteristics:**

- Read-only operation (no data modification)
- Requires authentication
- Returns user-specific data protected by Row Level Security (RLS)
- Profile is auto-created by a database trigger when a user registers, so 404 should be rare

## 2. Request Details

- **HTTP Method:** GET
- **URL Structure:** `/api/profile`
- **Authentication:** Required (Supabase session cookie)

### Parameters

- **Required:** None
- **Optional:** None

### Request Headers

| Header | Required | Description                                                               |
| ------ | -------- | ------------------------------------------------------------------------- |
| Cookie | Yes      | Contains Supabase auth session tokens (sb-access-token, sb-refresh-token) |

### Request Body

Not applicable for GET requests.

## 3. Used Types

### Response DTO (from `src/types.ts`)

```typescript
type OnboardingStatus = "pending" | "completed";

interface ProfileDTO {
  id: string; // UUID from auth.users
  allergies: string[]; // e.g., ["gluten", "lactose"]
  diets: string[]; // e.g., ["vegetarian", "vegan"]
  equipment: string[]; // e.g., ["oven", "blender"]
  onboarding_status: OnboardingStatus; // User onboarding state
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

### Error Response DTO (from `src/types.ts`)

```typescript
interface ErrorResponseDTO {
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetailDTO[];
  };
}

// Full ErrorCode type (this endpoint uses: UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR)
type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "EXTERNAL_SERVICE_ERROR";
```

### Database Row Type (from `src/db/supabase/database.types.ts`)

```typescript
// profiles table Row type
{
  id: string;
  allergies: Json; // JSONB stored as Json type
  diets: Json; // JSONB stored as Json type
  equipment: Json; // JSONB stored as Json type
  onboarding_status: string;
  created_at: string;
  updated_at: string;
}
```

### Transformation Notes

The database stores `allergies`, `diets`, and `equipment` as JSONB (`Json` type). These must be cast to `string[]` when mapping to `ProfileDTO`. Use type assertion or validation to ensure runtime safety.

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "allergies": ["gluten", "laktoza"],
  "diets": ["wegetariańska"],
  "equipment": ["piekarnik", "blender"],
  "onboarding_status": "completed",
  "created_at": "2026-01-20T12:00:00Z",
  "updated_at": "2026-01-20T12:00:00Z"
}
```

### Error Responses

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Profile not found"
  }
}
```

#### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌────────────┐
│   Client    │────>│  Route Handler   │────>│ Profile Service │────>│  Supabase  │
│             │     │ (api/profile)    │     │                 │     │  Database  │
└─────────────┘     └──────────────────┘     └─────────────────┘     └────────────┘
      │                     │                        │                      │
      │ 1. GET /api/profile │                        │                      │
      │─────────────────────>                        │                      │
      │                     │                        │                      │
      │                     │ 2. Create Supabase     │                      │
      │                     │    server client       │                      │
      │                     │──────────────────────>                        │
      │                     │                        │                      │
      │                     │ 3. Get authenticated   │                      │
      │                     │    user                │                      │
      │                     │──────────────────────>                        │
      │                     │                        │                      │
      │                     │ 4. If no user,         │                      │
      │                     │    return 401          │                      │
      │                     │                        │                      │
      │                     │ 5. Fetch profile       │                      │
      │                     │    by user_id          │                      │
      │                     │──────────────────────────────────────────────>
      │                     │                        │                      │
      │                     │                        │ 6. Return profile row│
      │                     │<──────────────────────────────────────────────
      │                     │                        │                      │
      │                     │ 7. Transform to DTO    │                      │
      │                     │                        │                      │
      │ 8. Return ProfileDTO│                        │                      │
      │<─────────────────────                        │                      │
```

### Step-by-Step Flow

1. Client sends GET request to `/api/profile` with authentication cookies
2. Route handler creates Supabase server client using `createClient()` from `src/db/supabase/server.ts`
3. Route handler retrieves authenticated user via `supabase.auth.getUser()`
4. If no authenticated user, return 401 Unauthorized
5. Profile service queries the `profiles` table filtered by `user_id`
6. Supabase returns the profile row (RLS ensures user can only access their own profile)
7. Service transforms database row to `ProfileDTO` (casting JSONB fields to string arrays)
8. Route handler returns the `ProfileDTO` with 200 OK status

## 6. Security Considerations

### Authentication

- **Session Validation:** Use `supabase.auth.getUser()` which validates the JWT token server-side
- **Cookie Security:** Supabase SSR client handles secure cookie management automatically
- **Token Refresh:** Middleware should handle token refresh; route handler receives valid session

### Authorization

- **Row Level Security (RLS):** Database enforces that users can only SELECT their own profile row
- **Policy Verification:** Ensure RLS policy exists:
  ```sql
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
  ```

### Data Protection

- **No Sensitive Data Exposure:** Profile contains only user preferences, no PII beyond user ID
- **HTTPS Only:** Ensure all requests use HTTPS (handled at infrastructure level)
- **No Caching Sensitive Data:** Response should include `Cache-Control: no-store` header

### Input Validation

- No user input to validate (GET request without parameters)
- Validate that `user.id` from auth is a valid UUID before querying

## 7. Error Handling

### Error Scenarios and Handling

| Scenario                  | HTTP Status | Error Code     | Message                        | Action                                |
| ------------------------- | ----------- | -------------- | ------------------------------ | ------------------------------------- |
| No auth session/token     | 401         | UNAUTHORIZED   | "Authentication required"      | Return error immediately              |
| Invalid/expired token     | 401         | UNAUTHORIZED   | "Authentication required"      | Return error immediately              |
| Profile not found         | 404         | NOT_FOUND      | "Profile not found"            | Log warning (trigger may have failed) |
| Database connection error | 500         | INTERNAL_ERROR | "An unexpected error occurred" | Log error with details                |
| Unexpected exception      | 500         | INTERNAL_ERROR | "An unexpected error occurred" | Log error with stack trace            |

### Error Response Factory

Create a utility function to standardize error responses:

```typescript
// src/lib/api/errors.ts
export function createErrorResponse(code: ErrorCode, message: string, status: number): NextResponse<ErrorResponseDTO> {
  return NextResponse.json({ error: { code, message } }, { status });
}
```

### Logging Strategy

- **401 Errors:** Log at INFO level (expected behavior)
- **404 Errors:** Log at WARN level (unexpected, may indicate trigger issue)
- **500 Errors:** Log at ERROR level with full context (stack trace, user ID if available)

## 8. Performance Considerations

### Database Query Optimization

- **Primary Key Lookup:** Query uses `id` (primary key) which is indexed by default
- **Single Row:** Query returns at most one row, no pagination needed
- **Minimal Columns:** Select only required columns (though all are needed for this endpoint)

### Caching Strategy

- **No Server-Side Caching:** Profile data may change frequently; avoid stale data
- **Client-Side:** Allow short browser caching only if explicitly needed
- **Response Headers:**
  ```typescript
  headers: {
    'Cache-Control': 'no-store, max-age=0',
  }
  ```

### Response Size

- Profile payload is small (~500 bytes typical)
- No need for compression at this size
- No pagination required

### Connection Pooling

- Supabase handles connection pooling automatically
- Server client reuses connections within request lifecycle

## 9. Implementation Steps

### Step 1: Create API Error Utilities

Create `src/lib/api/errors.ts` with standardized error response helpers.

```typescript
import { NextResponse } from "next/server";
import type { ErrorCode, ErrorResponseDTO } from "@/types";

export function createErrorResponse(code: ErrorCode, message: string, status: number): NextResponse<ErrorResponseDTO> {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function unauthorizedError(message = "Authentication required") {
  return createErrorResponse("UNAUTHORIZED", message, 401);
}

export function notFoundError(message: string) {
  return createErrorResponse("NOT_FOUND", message, 404);
}

export function internalError(message = "An unexpected error occurred") {
  return createErrorResponse("INTERNAL_ERROR", message, 500);
}
```

### Step 2: Create Profile Service

Create `src/lib/services/profile.service.ts` to encapsulate profile data access logic.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/supabase/database.types";
import type { ProfileDTO } from "@/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfileByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ProfileDTO | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, allergies, diets, equipment, onboarding_status, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw error;
  }

  return mapProfileRowToDTO(data);
}

function mapProfileRowToDTO(row: ProfileRow): ProfileDTO {
  return {
    id: row.id,
    allergies: row.allergies as string[],
    diets: row.diets as string[],
    equipment: row.equipment as string[],
    onboarding_status: row.onboarding_status as ProfileDTO["onboarding_status"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
```

### Step 3: Create Route Handler

Create `src/app/api/profile/route.ts` implementing the GET endpoint.

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getProfileByUserId } from "@/lib/services/profile.service";
import { unauthorizedError, notFoundError, internalError } from "@/lib/api/errors";
import type { ProfileDTO } from "@/types";

export async function GET(): Promise<NextResponse<ProfileDTO | { error: unknown }>> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // Fetch profile
    const profile = await getProfileByUserId(supabase, user.id);

    if (!profile) {
      console.warn(`Profile not found for user ${user.id}`);
      return notFoundError("Profile not found");
    }

    return NextResponse.json(profile, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return internalError();
  }
}
```

### Step 4: Directory Structure

After implementation, the project structure should include:

```
src/
├── app/
│   └── api/
│       └── profile/
│           └── route.ts          # GET /api/profile handler
├── lib/
│   ├── api/
│   │   └── errors.ts             # Standardized error responses
│   └── services/
│       └── profile.service.ts    # Profile data access logic
```

### Step 5: Testing Checklist

1. **Unit Tests:**
   - [ ] `mapProfileRowToDTO` correctly transforms JSONB fields to arrays
   - [ ] `getProfileByUserId` returns null for non-existent profiles
   - [ ] `getProfileByUserId` throws on database errors

2. **Integration Tests:**
   - [ ] GET /api/profile returns 401 when unauthenticated
   - [ ] GET /api/profile returns 200 with ProfileDTO for authenticated user
   - [ ] GET /api/profile returns 404 when profile doesn't exist
   - [ ] Response matches ProfileDTO schema

3. **Security Tests:**
   - [ ] Cannot access another user's profile
   - [ ] Expired tokens return 401
   - [ ] Invalid tokens return 401

### Step 6: Documentation

Update API documentation to reflect the implemented endpoint:

- Add endpoint to OpenAPI/Swagger specification (if used)
- Document in README or API docs
- Add example curl command:

```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Cookie: sb-access-token=<token>; sb-refresh-token=<token>"
```

## Summary

This implementation plan provides a clear roadmap for building the GET /api/profile endpoint. The endpoint follows Next.js App Router conventions, leverages Supabase for authentication and data access, and adheres to the project's coding standards with proper error handling, type safety, and security considerations.

**Key Files to Create:**

1. `src/lib/api/errors.ts` - Error response utilities
2. `src/lib/services/profile.service.ts` - Profile service
3. `src/app/api/profile/route.ts` - Route handler
