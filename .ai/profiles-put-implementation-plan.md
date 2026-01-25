# API Endpoint Implementation Plan: PUT /api/profile

## 1. Endpoint Overview

This endpoint updates the authenticated user's profile information. The profile contains user preferences for food-related settings including allergies, dietary restrictions, available kitchen equipment, and onboarding status. All fields are optional, enabling partial updates.

**Key Characteristics:**

- Write operation with partial update support
- Requires authentication
- User-specific data protected by Row Level Security (RLS)
- Validates input values against system configuration (supported_allergies, supported_diets, supported_equipment)
- Returns the updated profile after successful modification

## 2. Request Details

- **HTTP Method:** PUT
- **URL Structure:** `/api/profile`
- **Authentication:** Required (Supabase session cookie)

### Parameters

- **Required:** None (endpoint has no URL parameters)
- **Optional:** None (endpoint has no query parameters)

### Request Headers

| Header       | Required | Description                                                               |
| ------------ | -------- | ------------------------------------------------------------------------- |
| Cookie       | Yes      | Contains Supabase auth session tokens (sb-access-token, sb-refresh-token) |
| Content-Type | Yes      | Must be `application/json`                                                |

### Request Body

All fields are optional to support partial updates.

```json
{
  "allergies": ["gluten"],
  "diets": ["wegetariańska", "bezlaktozowa"],
  "equipment": ["piekarnik", "mikser"],
  "onboarding_status": "completed"
}
```

| Field             | Type       | Required | Validation                                                   |
| ----------------- | ---------- | -------- | ------------------------------------------------------------ |
| allergies         | `string[]` | No       | Each value must exist in `system_config.supported_allergies` |
| diets             | `string[]` | No       | Each value must exist in `system_config.supported_diets`     |
| equipment         | `string[]` | No       | Each value must exist in `system_config.supported_equipment` |
| onboarding_status | `string`   | No       | Must be `"pending"` or `"completed"`                         |

## 3. Used Types

### Command Model (from `src/types.ts`)

```typescript
type OnboardingStatus = "pending" | "completed";

/**
 * Command for PUT /api/profile
 * All fields are optional for partial updates
 */
interface ProfileUpdateCommand {
  allergies?: string[];
  diets?: string[];
  equipment?: string[];
  onboarding_status?: OnboardingStatus;
}
```

### Response DTO (from `src/types.ts`)

```typescript
interface ProfileDTO {
  id: string;
  allergies: string[];
  diets: string[];
  equipment: string[];
  onboarding_status: OnboardingStatus;
  created_at: string;
  updated_at: string;
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

interface ValidationErrorDetailDTO {
  field: string;
  message: string;
}

// Error codes used by this endpoint: UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR, INTERNAL_ERROR
```

### Database Types

```typescript
// profiles table Update type (from database.types.ts)
interface ProfilesUpdate {
  allergies?: Json;
  diets?: Json;
  equipment?: Json;
  onboarding_status?: string;
  updated_at?: string;
}
```

### New Types to Create

```typescript
// Zod schema for request validation (src/lib/services/profile.service.ts)
import { z } from "zod";

const profileUpdateSchema = z.object({
  allergies: z.array(z.string()).optional(),
  diets: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  onboarding_status: z.enum(["pending", "completed"]).optional(),
});
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "allergies": ["gluten"],
  "diets": ["wegetariańska", "bezlaktozowa"],
  "equipment": ["piekarnik", "mikser"],
  "onboarding_status": "completed",
  "created_at": "2026-01-20T12:00:00Z",
  "updated_at": "2026-01-22T10:30:00Z"
}
```

### Error Responses

#### 400 Bad Request (Invalid Payload Structure)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "allergies",
        "message": "Expected array, received string"
      }
    ]
  }
}
```

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

#### 422 Unprocessable Entity (Invalid Values)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid values provided",
    "details": [
      {
        "field": "allergies",
        "message": "Invalid allergy value: 'invalid_allergy'. Supported values: gluten, laktoza, orzechy, jaja, ryby, skorupiaki, soja, seler, gorczyca, sezam, siarczyny, łubin, mięczaki"
      }
    ]
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
      │ 1. PUT /api/profile │                        │                      │
      │    with JSON body   │                        │                      │
      │─────────────────────>                        │                      │
      │                     │                        │                      │
      │                     │ 2. Parse JSON body     │                      │
      │                     │    & Zod validation    │                      │
      │                     │                        │                      │
      │                     │ 3. Create Supabase     │                      │
      │                     │    server client       │                      │
      │                     │                        │                      │
      │                     │ 4. Get authenticated   │                      │
      │                     │    user                │                      │
      │                     │                        │                      │
      │                     │ 5. If no user,         │                      │
      │                     │    return 401          │                      │
      │                     │                        │                      │
      │                     │ 6. Fetch system_config │                      │
      │                     │    (supported values)  │                      │
      │                     │────────────────────────────────────────────────>
      │                     │                        │                      │
      │                     │ 7. Validate values     │                      │
      │                     │    against config      │                      │
      │                     │                        │                      │
      │                     │ 8. If invalid values,  │                      │
      │                     │    return 422          │                      │
      │                     │                        │                      │
      │                     │ 9. Update profile      │                      │
      │                     │────────────────────────────────────────────────>
      │                     │                        │                      │
      │                     │                        │10. Return updated row│
      │                     │<────────────────────────────────────────────────
      │                     │                        │                      │
      │                     │11. Transform to DTO    │                      │
      │                     │                        │                      │
      │12. Return ProfileDTO│                        │                      │
      │<─────────────────────                        │                      │
```

### Step-by-Step Flow

1. Client sends PUT request to `/api/profile` with JSON body and authentication cookies
2. Route handler parses JSON body and validates structure with Zod schema
3. If body parsing or Zod validation fails, return 400 Bad Request
4. Route handler creates Supabase server client using `createClient()`
5. Route handler retrieves authenticated user via `supabase.auth.getUser()`
6. If no authenticated user, return 401 Unauthorized
7. Profile service fetches `system_config` to get supported values
8. Service validates provided arrays against supported values from system_config
9. If any invalid values, return 422 Unprocessable Entity with details
10. Service updates the profile in database using `.update()` with `.select()`
11. If profile not found (update returns no rows), return 404 Not Found
12. Service transforms database row to `ProfileDTO`
13. Route handler returns the updated `ProfileDTO` with 200 OK status

## 6. Security Considerations

### Authentication

- **Session Validation:** Use `supabase.auth.getUser()` which validates the JWT token server-side
- **Cookie Security:** Supabase SSR client handles secure cookie management automatically

### Input Validation

- **Schema Validation:** Zod validates request body structure (types, array contents)
- **Value Validation:** Cross-check arrays against `system_config` supported values
- **SQL Injection Prevention:** Supabase client uses parameterized queries
- **Content Type:** Reject requests without `application/json` content type

### Data Protection

- **No PII Handling:** Profile contains only preferences, minimal security risk

## 7. Error Handling

### Error Scenarios and Handling

| Scenario                       | HTTP Status | Error Code       | Message                        | Action                               |
| ------------------------------ | ----------- | ---------------- | ------------------------------ | ------------------------------------ |
| Missing/invalid JSON body      | 400         | VALIDATION_ERROR | "Invalid request body"         | Return Zod error details             |
| Invalid field types            | 400         | VALIDATION_ERROR | "Validation failed"            | Return field-level errors            |
| Empty request body             | 400         | VALIDATION_ERROR | "Request body required"        | Return early                         |
| No auth session/token          | 401         | UNAUTHORIZED     | "Authentication required"      | Return error immediately             |
| Invalid/expired token          | 401         | UNAUTHORIZED     | "Authentication required"      | Return error immediately             |
| Invalid allergy/diet/equipment | 422         | VALIDATION_ERROR | "Invalid values provided"      | Return list of invalid values        |
| Profile not found              | 404         | NOT_FOUND        | "Profile not found"            | Log warning                          |
| Database connection error      | 500         | INTERNAL_ERROR   | "An unexpected error occurred" | Log error with details               |
| system_config fetch failed     | 500         | INTERNAL_ERROR   | "An unexpected error occurred" | Log error, don't expose config issue |

### Logging Strategy

- **400 Errors:** Log at DEBUG level (expected validation failures)
- **401 Errors:** Log at INFO level (expected behavior for unauthenticated requests)
- **404 Errors:** Log at WARN level (unexpected, may indicate trigger issue)
- **422 Errors:** Log at INFO level with invalid values (helps understand user behavior)
- **500 Errors:** Log at ERROR level with full context (stack trace, user ID if available)

## 8. Performance Considerations

### Database Query Optimization

- **Primary Key Update:** Update uses `id` (primary key) which is indexed
- **Single Row:** Update affects at most one row
- **Select After Update:** Use `.select()` to return updated row in single query
- **Batch Config Fetch:** Fetch all three system_config keys in a single query using `.in()`

### Caching Strategy

- **system_config Caching:** Consider caching supported values (low-frequency changes)
  - Cache TTL: 5-15 minutes recommended
  - For MVP: Fresh fetch per request is acceptable
- **No Response Caching:** Updated data should never be cached

### Response Size

- Profile payload is small (~500 bytes typical)
- No compression needed at this size

### Validation Performance

- Zod validation is synchronous and fast (~<1ms for this schema)
- system_config validation is O(n) where n is number of items in arrays

## 9. Implementation Steps

### Step 1: Add Zod Dependency (if not present)

```bash
pnpm add zod
```

### Step 2: Create Validation Schema

Add to `src/lib/services/profile.service.ts`:

```typescript
import { z } from "zod";

/**
 * Zod schema for validating PUT /api/profile request body.
 * All fields are optional to support partial updates.
 */
export const profileUpdateSchema = z.object({
  allergies: z.array(z.string().min(1)).optional(),
  diets: z.array(z.string().min(1)).optional(),
  equipment: z.array(z.string().min(1)).optional(),
  onboarding_status: z.enum(["pending", "completed"]).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
```

### Step 3: Create System Config Fetch Function

Add to `src/lib/services/profile.service.ts`:

```typescript
import type { SupabaseClient } from "@/db/supabase/server";
import { ensureStringArray } from "@/lib/utils/db";

interface SupportedProfileValues {
  allergies: string[];
  diets: string[];
  equipment: string[];
}

/**
 * Fetches supported profile values from system_config table.
 *
 * @param supabase - Supabase client instance
 * @returns Object containing supported allergies, diets, and equipment
 * @throws Error if database query fails
 */
export async function getSupportedProfileValues(supabase: SupabaseClient): Promise<SupportedProfileValues> {
  const { data, error } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", ["supported_allergies", "supported_diets", "supported_equipment"]);

  if (error) {
    throw error;
  }

  const config: SupportedProfileValues = {
    allergies: [],
    diets: [],
    equipment: [],
  };

  for (const row of data ?? []) {
    switch (row.key) {
      case "supported_allergies":
        config.allergies = ensureStringArray(row.value);
        break;
      case "supported_diets":
        config.diets = ensureStringArray(row.value);
        break;
      case "supported_equipment":
        config.equipment = ensureStringArray(row.value);
        break;
    }
  }

  return config;
}
```

### Step 4: Create Value Validation Function

Add to `src/lib/services/profile.service.ts`:

```typescript
import type { ValidationErrorDetailDTO } from "@/types";

interface ProfileValueValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetailDTO[];
}

/**
 * Validates profile update values against supported system configuration.
 *
 * @param input - Parsed and schema-validated input
 * @param supportedValues - Supported values from system_config
 * @returns Validation result with any invalid value errors
 */
export function validateProfileValues(
  input: ProfileUpdateInput,
  supportedValues: SupportedProfileValues
): ProfileValueValidationResult {
  const errors: ValidationErrorDetailDTO[] = [];

  if (input.allergies) {
    const invalidAllergies = input.allergies.filter((a) => !supportedValues.allergies.includes(a));
    if (invalidAllergies.length > 0) {
      errors.push({
        field: "allergies",
        message: `Invalid allergy value(s): '${invalidAllergies.join("', '")}'. Supported values: ${supportedValues.allergies.join(", ")}`,
      });
    }
  }

  if (input.diets) {
    const invalidDiets = input.diets.filter((d) => !supportedValues.diets.includes(d));
    if (invalidDiets.length > 0) {
      errors.push({
        field: "diets",
        message: `Invalid diet value(s): '${invalidDiets.join("', '")}'. Supported values: ${supportedValues.diets.join(", ")}`,
      });
    }
  }

  if (input.equipment) {
    const invalidEquipment = input.equipment.filter((e) => !supportedValues.equipment.includes(e));
    if (invalidEquipment.length > 0) {
      errors.push({
        field: "equipment",
        message: `Invalid equipment value(s): '${invalidEquipment.join("', '")}'. Supported values: ${supportedValues.equipment.join(", ")}`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

### Step 5: Create Profile Update Service Function

Add to `src/lib/services/profile.service.ts`:

```typescript
import type { ProfileDTO, ProfileUpdateCommand } from "@/types";

/**
 * Updates a user's profile with the provided data.
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's UUID
 * @param data - Partial profile update data
 * @returns Updated ProfileDTO if found and updated, null if profile not found
 * @throws Error if database query fails
 */
export async function updateProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
  data: ProfileUpdateCommand
): Promise<ProfileDTO | null> {
  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.allergies !== undefined) {
    updateData.allergies = data.allergies;
  }
  if (data.diets !== undefined) {
    updateData.diets = data.diets;
  }
  if (data.equipment !== undefined) {
    updateData.equipment = data.equipment;
  }
  if (data.onboarding_status !== undefined) {
    updateData.onboarding_status = data.onboarding_status;
  }

  const { data: updatedRow, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select("id, allergies, diets, equipment, onboarding_status, created_at, updated_at")
    .single();

  if (error) {
    // PGRST116: "The result contains 0 rows" - profile not found
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return mapProfileRowToDTO(updatedRow);
}
```

### Step 6: Add Unprocessable Entity Error Helper

Add to `src/lib/api/errors.ts`:

```typescript
/**
 * Returns a 422 Unprocessable Entity error response.
 * Used when request is syntactically valid but contains semantically invalid values.
 *
 * @param message - Error message describing the issue
 * @param details - Array of field-level validation errors
 */
export function unprocessableEntityError(
  message = "Invalid values provided",
  details?: ValidationErrorDetailDTO[]
): NextResponse<ErrorResponseDTO> {
  return createErrorResponse("VALIDATION_ERROR", message, 422, details);
}
```

### Step 7: Implement PUT Route Handler

Update `src/app/api/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  getProfileByUserId,
  updateProfileByUserId,
  profileUpdateSchema,
  getSupportedProfileValues,
  validateProfileValues,
} from "@/lib/services/profile.service";
import {
  unauthorizedError,
  notFoundError,
  validationError,
  unprocessableEntityError,
  internalError,
} from "@/lib/api/errors";
import type { ProfileDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

// ... existing GET handler ...

/**
 * PUT /api/profile
 *
 * Updates the authenticated user's profile preferences.
 * Supports partial updates - only provided fields are modified.
 *
 * @param request - Next.js request object containing JSON body
 * @returns ProfileDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 404, 422, 500)
 *
 * @security Requires authentication via Supabase session cookie
 */
export async function PUT(request: NextRequest): Promise<NextResponse<ProfileDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const parseResult = profileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return validationError("Validation failed", details);
    }

    const input = parseResult.data;

    // 3. Check if request body has any fields to update
    if (Object.keys(input).length === 0) {
      return validationError("At least one field is required for update");
    }

    // 4. Create Supabase client and authenticate
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 5. Fetch supported values from system_config
    const supportedValues = await getSupportedProfileValues(supabase);

    // 6. Validate values against system config
    const validationResult = validateProfileValues(input, supportedValues);
    if (!validationResult.isValid) {
      return unprocessableEntityError("Invalid values provided", validationResult.errors);
    }

    // 7. Update profile
    const updatedProfile = await updateProfileByUserId(supabase, user.id, input);

    // 8. Handle profile not found (rare - should be auto-created by trigger)
    if (!updatedProfile) {
      console.warn(`Profile not found for user ${user.id} during update.`);
      return notFoundError("Profile not found");
    }

    // 9. Return updated profile with no-cache headers
    return NextResponse.json(updatedProfile, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return internalError();
  }
}
```

### Step 8: Final Directory Structure

After implementation, the project structure should include:

```
src/
├── app/
│   └── api/
│       └── profile/
│           └── route.ts              # GET & PUT /api/profile handlers
├── lib/
│   ├── api/
│   │   └── errors.ts                 # Standardized error responses (updated)
│   └── services/
│       └── profile.service.ts        # Profile service (updated)
```

### Step 9: Testing Checklist

#### Unit Tests

- [ ] `profileUpdateSchema` validates correct input structure
- [ ] `profileUpdateSchema` rejects invalid types (string instead of array)
- [ ] `profileUpdateSchema` rejects invalid onboarding_status values
- [ ] `validateProfileValues` returns errors for invalid allergies
- [ ] `validateProfileValues` returns errors for invalid diets
- [ ] `validateProfileValues` returns errors for invalid equipment
- [ ] `validateProfileValues` returns isValid: true for valid values
- [ ] `getSupportedProfileValues` correctly parses system_config response
- [ ] `updateProfileByUserId` returns null for non-existent profiles
- [ ] `updateProfileByUserId` throws on database errors (non-404)

#### Integration Tests

- [ ] PUT /api/profile returns 400 for invalid JSON body
- [ ] PUT /api/profile returns 400 for invalid field types
- [ ] PUT /api/profile returns 400 for empty body
- [ ] PUT /api/profile returns 401 when unauthenticated
- [ ] PUT /api/profile returns 422 for invalid allergy values
- [ ] PUT /api/profile returns 422 for invalid diet values
- [ ] PUT /api/profile returns 422 for invalid equipment values
- [ ] PUT /api/profile returns 200 with updated ProfileDTO for valid request
- [ ] PUT /api/profile supports partial updates (single field)
- [ ] PUT /api/profile updates `updated_at` timestamp
- [ ] Response matches ProfileDTO schema

#### Security Tests

- [ ] Cannot update another user's profile (RLS enforced)
- [ ] Expired tokens return 401
- [ ] Invalid tokens return 401
- [ ] SQL injection attempts are blocked

### Step 10: Example cURL Commands

```bash
# Full profile update
curl -X PUT http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=<token>; sb-refresh-token=<token>" \
  -d '{
    "allergies": ["gluten", "laktoza"],
    "diets": ["wegetariańska"],
    "equipment": ["piekarnik", "blender"],
    "onboarding_status": "completed"
  }'

# Partial update (only allergies)
curl -X PUT http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=<token>; sb-refresh-token=<token>" \
  -d '{
    "allergies": ["orzechy"]
  }'

# Complete onboarding
curl -X PUT http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=<token>; sb-refresh-token=<token>" \
  -d '{
    "onboarding_status": "completed"
  }'
```

## Summary

This implementation plan provides a complete roadmap for building the PUT /api/profile endpoint. The endpoint:

- Supports partial updates with all optional fields
- Uses Zod for structural validation
- Validates values against system_config for semantic correctness
- Returns appropriate HTTP status codes (200, 400, 401, 404, 422, 500)
- Follows Next.js App Router conventions
- Leverages Supabase for authentication and data access with RLS protection
- Adheres to the project's coding standards with proper error handling and type safety

**Files to Modify:**

1. `src/lib/api/errors.ts` - Add `unprocessableEntityError` helper
2. `src/lib/services/profile.service.ts` - Add schema, validation, and update functions
3. `src/app/api/profile/route.ts` - Add PUT handler

**Dependencies to Add (if not present):**

1. `zod` - For request body validation
