# API Endpoint Implementation Plan: Initialize User Staples

## 1. Endpoint Overview

The `POST /api/inventory/staples/init` endpoint initializes a user's staple items from the system-defined staple definitions. Staples are common pantry items (salt, pepper, oil, etc.) that users typically have on hand. Unlike quantitative inventory items, staples use a simple "have/don't have" toggle (`is_available`) rather than tracking exact quantities.

**Key behaviors:**

- Copies all active staple definitions to the user's inventory as staple items
- By default, only creates staples that don't already exist in the user's inventory
- When `overwrite=true`, resets all staples to their default availability state (`is_available=true`)
- Returns the count of created/skipped items and the full list of user's staples

## 2. Request Details

- **HTTP Method:** `POST`
- **URL Structure:** `/api/inventory/staples/init`
- **Parameters:**
  - **Required:** None
  - **Optional:** None (all config is in the body)

### Request Body

```json
{
  "overwrite": false
}
```

| Field       | Type    | Required | Default | Description                                                                                               |
| ----------- | ------- | -------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `overwrite` | boolean | No       | `false` | If `false`, only creates staples that don't exist. If `true`, resets all staples to default availability. |

## 3. Used Types

### Existing Types (from `src/types.ts`)

```typescript
/** Request payload for POST /api/inventory/staples/init */
export interface StaplesInitCommand {
  overwrite?: boolean;
}

/** Response for POST /api/inventory/staples/init */
export interface StaplesInitResponseDTO {
  created: number;
  skipped: number;
  staples: InventoryStapleItemDTO[];
}

/** Abbreviated inventory item DTO for staples initialization response */
export interface InventoryStapleItemDTO {
  id: InventoryItemRow["id"];
  product_id: InventoryItemRow["product_id"];
  product: ProductMinimalDTO | null;
  is_staple: true;
  is_available: InventoryItemRow["is_available"];
}

/** Very brief product DTO for staples listing */
export interface ProductMinimalDTO {
  id: ProductCatalogRow["id"];
  name_pl: ProductCatalogRow["name_pl"];
}
```

### New Validation Schema (to add to `inventory.service.ts`)

```typescript
/**
 * Zod schema for POST /api/inventory/staples/init.
 */
export const staplesInitSchema = z.object({
  overwrite: z.boolean().optional().default(false),
});

export type StaplesInitInput = z.infer<typeof staplesInitSchema>;
```

## 4. Response Details

### Success Responses

#### 201 Created - Staples created for the first time (all new)

```json
{
  "created": 15,
  "skipped": 0,
  "staples": [
    {
      "id": "uuid-string",
      "product_id": 1,
      "product": {
        "id": 1,
        "name_pl": "Sól"
      },
      "is_staple": true,
      "is_available": true
    }
  ]
}
```

#### 200 OK - Staples initialized (some or all already existed)

```json
{
  "created": 5,
  "skipped": 10,
  "staples": [
    {
      "id": "uuid-string",
      "product_id": 1,
      "product": {
        "id": 1,
        "name_pl": "Sól"
      },
      "is_staple": true,
      "is_available": true
    }
  ]
}
```

### Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "overwrite",
        "message": "Expected boolean, received string"
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
┌─────────────────────────────────────────────────────────────────────────────┐
│                        POST /api/inventory/staples/init                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Parse Request Body                                                        │
│    - Handle empty body (default to {})                                       │
│    - Validate JSON structure                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Validate with Zod Schema                                                  │
│    - Validate overwrite is boolean if present                                │
│    - Apply default (overwrite: false)                                        │
│    - Return 400 if validation fails                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. Authenticate User                                                         │
│    - Create Supabase server client                                           │
│    - Get authenticated user via supabase.auth.getUser()                      │
│    - Return 401 if not authenticated                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Call Service: initializeStaples(supabase, userId, { overwrite })          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4a. Fetch Active Staple Definitions                                          │
│     SELECT id, product_id                                                    │
│     FROM staple_definitions                                                  │
│     WHERE is_active = true                                                   │
│     JOIN product_catalog (id, name_pl)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4b. Fetch User's Existing Staples                                            │
│     SELECT id, product_id, is_available                                      │
│     FROM inventory_items                                                     │
│     WHERE user_id = :userId AND is_staple = true                             │
│     (RLS automatically filters by user)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4c. Determine Actions Based on Mode                                          │
│                                                                              │
│     IF overwrite = false:                                                    │
│       - Create staples for products not in user's inventory                  │
│       - Skip staples that already exist                                      │
│                                                                              │
│     IF overwrite = true:                                                     │
│       - Create missing staples                                               │
│       - Reset is_available = true for existing staples                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4d. Execute Database Operations                                              │
│     - INSERT new staples into inventory_items                                │
│     - UPDATE existing staples if overwrite = true                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4e. Fetch Final Staples List                                                 │
│     SELECT id, product_id, is_available                                      │
│     FROM inventory_items                                                     │
│     WHERE user_id = :userId AND is_staple = true                             │
│     JOIN product_catalog (id, name_pl)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. Determine Response Status                                                 │
│    - 201 Created: created > 0 AND skipped = 0 (all new)                      │
│    - 200 OK: skipped > 0 OR (created = 0 AND overwrite mode)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. Return StaplesInitResponseDTO                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6. Security Considerations

### Authentication

- Requires valid Supabase session (cookie-based or Bearer token)
- No additional authorization checks needed (users can only manage their own staples)

### Input Validation

- Zod schema ensures `overwrite` is a boolean if provided
- Empty request body is acceptable (defaults applied)
- No risk of SQL injection (using Supabase parameterized queries)

### Data Integrity

- Staple definitions are read-only (system-managed)
- Users can only modify their own inventory items via RLS
- Check constraints in database ensure staples don't have quantity/unit_id

## 7. Error Handling

| Scenario                                   | HTTP Status | Error Code         | Message                             |
| ------------------------------------------ | ----------- | ------------------ | ----------------------------------- |
| Invalid JSON body                          | 400         | `VALIDATION_ERROR` | "Invalid JSON in request body"      |
| `overwrite` is not boolean                 | 400         | `VALIDATION_ERROR` | "Expected boolean, received {type}" |
| User not authenticated                     | 401         | `UNAUTHORIZED`     | "Authentication required"           |
| Database error fetching staple definitions | 500         | `INTERNAL_ERROR`   | "An unexpected error occurred"      |
| Database error creating/updating items     | 500         | `INTERNAL_ERROR`   | "An unexpected error occurred"      |

### Error Logging

- Log all caught exceptions with `console.error` before returning 500 response
- Include operation context (e.g., "Error initializing staples")

## 8. Performance Considerations

### Query Optimization

- Fetch staple definitions and existing user staples in parallel using `Promise.all`
- Use batch INSERT for creating multiple staples at once (single INSERT with multiple rows)
- Use batch UPDATE for resetting availability (single UPDATE with WHERE ... IN)

### Caching

- Response headers: `Cache-Control: no-store, max-age=0` (user-specific data)
- Staple definitions could be cached (read-only system data), but keeping it simple for MVP

### Estimated Database Operations

1. SELECT from `staple_definitions` with JOIN to `product_catalog` (~15-20 rows)
2. SELECT from `inventory_items` for user's staples (~0-20 rows)
3. INSERT into `inventory_items` (0-20 rows, batch)
4. UPDATE `inventory_items` if overwrite=true (0-20 rows, batch)
5. Final SELECT to return all staples with product info

### Payload Size

- Response contains ~15-20 staples with minimal product info
- Estimated JSON size: ~2-3 KB

## 9. Implementation Steps

### Step 1: Add Zod Validation Schema

Add to `src/lib/services/inventory.service.ts`:

```typescript
/**
 * Zod schema for POST /api/inventory/staples/init.
 * Validates optional overwrite flag.
 */
export const staplesInitSchema = z.object({
  overwrite: z.boolean().optional().default(false),
});

export type StaplesInitInput = z.infer<typeof staplesInitSchema>;
```

### Step 2: Add Database Query Types

Add to `src/lib/services/inventory.service.ts`:

```typescript
/** Staple definition with joined product for initialization */
interface StapleDefinitionWithProduct {
  id: number;
  product_id: number;
  product_catalog: {
    id: number;
    name_pl: string;
  };
}

/** User's existing staple item for comparison */
interface ExistingStapleItem {
  id: string;
  product_id: number | null;
  is_available: boolean;
}

/** Staple inventory item with product for response */
interface StapleItemWithProduct {
  id: string;
  product_id: number | null;
  is_available: boolean;
  product_catalog: {
    id: number;
    name_pl: string;
  } | null;
}
```

### Step 3: Add Mapping Function

Add to `src/lib/services/inventory.service.ts`:

```typescript
/**
 * Maps a staple inventory row to InventoryStapleItemDTO format.
 *
 * @param row - Database row with joined product
 * @returns InventoryStapleItemDTO
 */
export function mapStapleRowToDTO(row: StapleItemWithProduct): InventoryStapleItemDTO {
  return {
    id: row.id,
    product_id: row.product_id,
    product: row.product_catalog
      ? {
          id: row.product_catalog.id,
          name_pl: row.product_catalog.name_pl,
        }
      : null,
    is_staple: true,
    is_available: row.is_available,
  };
}
```

### Step 4: Implement Service Function

Add to `src/lib/services/inventory.service.ts`:

```typescript
/**
 * Initializes user's staples from system staple definitions.
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's UUID
 * @param options - Options including overwrite flag
 * @returns Response with created/skipped counts and staples list
 */
export async function initializeStaples(
  supabase: SupabaseClient,
  userId: string,
  options: { overwrite: boolean }
): Promise<StaplesInitResponseDTO> {
  const { overwrite } = options;

  // 1. Fetch active staple definitions and user's existing staples in parallel
  const [definitionsResult, existingResult] = await Promise.all([
    supabase
      .from("staple_definitions")
      .select(
        `
        id,
        product_id,
        product_catalog (
          id,
          name_pl
        )
      `
      )
      .eq("is_active", true),
    supabase.from("inventory_items").select("id, product_id, is_available").eq("is_staple", true),
  ]);

  if (definitionsResult.error) {
    throw definitionsResult.error;
  }
  if (existingResult.error) {
    throw existingResult.error;
  }

  const definitions = (definitionsResult.data ?? []) as StapleDefinitionWithProduct[];
  const existingStaples = (existingResult.data ?? []) as ExistingStapleItem[];

  // 2. Build map of existing staples by product_id
  const existingByProductId = new Map<number, ExistingStapleItem>();
  for (const staple of existingStaples) {
    if (staple.product_id !== null) {
      existingByProductId.set(staple.product_id, staple);
    }
  }

  // 3. Determine which staples to create and which to update
  const staplesToCreate: Array<{
    user_id: string;
    product_id: number;
    is_staple: boolean;
    is_available: boolean;
  }> = [];
  const staplesToUpdate: string[] = [];
  let skipped = 0;

  for (const definition of definitions) {
    const existing = existingByProductId.get(definition.product_id);

    if (!existing) {
      // Create new staple
      staplesToCreate.push({
        user_id: userId,
        product_id: definition.product_id,
        is_staple: true,
        is_available: true,
      });
    } else if (overwrite && !existing.is_available) {
      // Reset availability if overwrite mode
      staplesToUpdate.push(existing.id);
    } else {
      // Skip existing staple
      skipped++;
    }
  }

  // Also count staples that won't be updated in overwrite mode
  if (overwrite) {
    skipped = existingStaples.filter(
      (s) => s.is_available && s.product_id !== null && definitions.some((d) => d.product_id === s.product_id)
    ).length;
  }

  // 4. Execute database operations
  if (staplesToCreate.length > 0) {
    const { error: insertError } = await supabase.from("inventory_items").insert(staplesToCreate);

    if (insertError) {
      throw insertError;
    }
  }

  if (staplesToUpdate.length > 0) {
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ is_available: true, updated_at: new Date().toISOString() })
      .in("id", staplesToUpdate);

    if (updateError) {
      throw updateError;
    }
  }

  // 5. Fetch final staples list
  const { data: finalStaples, error: fetchError } = await supabase
    .from("inventory_items")
    .select(
      `
      id,
      product_id,
      is_available,
      product_catalog (
        id,
        name_pl
      )
    `
    )
    .eq("is_staple", true)
    .order("product_catalog(name_pl)", { ascending: true });

  if (fetchError) {
    throw fetchError;
  }

  // 6. Map to DTOs and return
  const staples = ((finalStaples ?? []) as StapleItemWithProduct[]).map(mapStapleRowToDTO);

  return {
    created: staplesToCreate.length + staplesToUpdate.length,
    skipped,
    staples,
  };
}
```

### Step 5: Create API Route Handler

Create `src/app/api/inventory/staples/init/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { staplesInitSchema, initializeStaples } from "@/lib/services/inventory.service";
import { unauthorizedError, validationError, internalError } from "@/lib/api/errors";
import type { StaplesInitResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/inventory/staples/init
 *
 * Initializes user's staples from system staple definitions.
 *
 * @param request - Next.js request object with optional JSON body
 * @returns StaplesInitResponseDTO on success (200, 201)
 * @returns ErrorResponseDTO on error (400, 401, 500)
 *
 * @security Requires authentication via Supabase session
 */
export async function POST(request: NextRequest): Promise<NextResponse<StaplesInitResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body (handle empty body)
    let body: unknown = {};
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        const text = await request.text();
        if (text.trim()) {
          body = JSON.parse(text);
        }
      } catch {
        return validationError("Invalid JSON in request body");
      }
    }

    // 2. Validate with Zod schema
    const parseResult = staplesInitSchema.safeParse(body);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const input = parseResult.data;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Initialize staples
    const result = await initializeStaples(supabase, user.id, {
      overwrite: input.overwrite,
    });

    // 5. Determine response status
    // 201 Created: All staples were newly created (none skipped, not in overwrite mode)
    // 200 OK: Some staples existed or in overwrite mode
    const status = result.created > 0 && result.skipped === 0 && !input.overwrite ? 201 : 200;

    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error initializing staples:", error);
    return internalError();
  }
}
```

### Step 6: Update Exports

Ensure the following are exported from `src/lib/services/inventory.service.ts`:

```typescript
export {
  // ... existing exports ...
  staplesInitSchema,
  type StaplesInitInput,
  mapStapleRowToDTO,
  initializeStaples,
};
```

### Step 7: Create Directory Structure

```
src/app/api/inventory/staples/init/
└── route.ts
```

### Step 8: Testing Checklist

#### Manual Testing with cURL

```bash
# 1. Test without body (should use defaults)
curl -X POST http://localhost:3000/api/inventory/staples/init \
  -H "Authorization: Bearer <token>"

# 2. Test with overwrite=false
curl -X POST http://localhost:3000/api/inventory/staples/init \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"overwrite": false}'

# 3. Test with overwrite=true
curl -X POST http://localhost:3000/api/inventory/staples/init \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"overwrite": true}'

# 4. Test without auth (should return 401)
curl -X POST http://localhost:3000/api/inventory/staples/init

# 5. Test with invalid body (should return 400)
curl -X POST http://localhost:3000/api/inventory/staples/init \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"overwrite": "yes"}'
```

#### Test Scenarios

1. **First-time initialization:**
   - User has no staples
   - All staple definitions are created
   - Response: 201, created=N, skipped=0

2. **Re-initialization (overwrite=false):**
   - User already has some/all staples
   - Only missing staples are created
   - Response: 200, created=M, skipped=N-M

3. **Re-initialization (overwrite=true):**
   - User has staples with is_available=false
   - Resets all to is_available=true
   - Response: 200, created=M (updated count), skipped=N-M

4. **No staple definitions:**
   - Edge case: no active staple definitions
   - Response: 200, created=0, skipped=0, staples=[]

5. **Authentication failure:**
   - No or invalid auth token
   - Response: 401

6. **Invalid request body:**
   - overwrite is not a boolean
   - Response: 400 with validation details

## 10. File Changes Summary

| File                                          | Action | Description                                                                                  |
| --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `src/lib/services/inventory.service.ts`       | Modify | Add `staplesInitSchema`, helper types, `mapStapleRowToDTO`, and `initializeStaples` function |
| `src/app/api/inventory/staples/init/route.ts` | Create | New API route handler for POST                                                               |

## 11. Dependencies

- No new npm packages required
- Relies on existing:
  - `zod` for validation
  - `@supabase/ssr` for database client
  - Existing error utilities from `@/lib/api/errors`
  - Existing types from `@/types`
