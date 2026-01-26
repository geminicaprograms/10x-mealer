# API Endpoint Implementation Plan: Lookup Tables

## Overview

This plan covers the implementation of four read-only lookup table endpoints that provide reference data for the Mealer application:

1. **GET /api/units** - List all measurement units
2. **GET /api/categories** - List all product categories
3. **GET /api/staples** - List all staple definitions
4. **GET /api/config** - Get system configuration

All endpoints require authentication and serve as foundational data providers for the frontend.

---

## 1. Endpoint Overview

### GET /api/units

Returns all measurement units (metric and Polish colloquial) used for quantity tracking in inventory items.

### GET /api/categories

Returns all product categories (Polish grocery categories) used for filtering and organizing products.

### GET /api/staples

Returns all staple definitions (common pantry items like salt, pepper, oil) with their associated product information.

### GET /api/config

Returns aggregated system configuration including supported allergies, diets, equipment, and rate limits.

---

## 2. Request Details

### Common to All Endpoints

- **HTTP Method:** GET
- **Authentication:** Required (Supabase session cookie)
- **Request Body:** None
- **Query Parameters:** None

### URL Structures

| Endpoint   | URL Pattern           |
| ---------- | --------------------- |
| Units      | `GET /api/units`      |
| Categories | `GET /api/categories` |
| Staples    | `GET /api/staples`    |
| Config     | `GET /api/config`     |

---

## 3. Used Types

All DTOs are already defined in `src/types.ts`:

### Units Endpoint

```typescript
/** Unit DTO for lookup endpoints */
export interface UnitDTO {
  id: number;
  name_pl: string;
  abbreviation: string;
  unit_type: string; // 'weight' | 'volume' | 'count'
  base_unit_multiplier: number;
}

/** Response for GET /api/units */
export interface UnitsResponseDTO {
  data: UnitDTO[];
}
```

### Categories Endpoint

```typescript
/** Category DTO for lookup endpoints */
export interface CategoryDTO {
  id: number;
  name_pl: string;
  display_order: number;
}

/** Response for GET /api/categories */
export interface CategoriesResponseDTO {
  data: CategoryDTO[];
}
```

### Staples Endpoint

```typescript
/** Very brief product DTO for staples listing */
export interface ProductMinimalDTO {
  id: number;
  name_pl: string;
}

/** Staple definition DTO with expanded product relation */
export interface StapleDefinitionDTO {
  id: number;
  product: ProductMinimalDTO;
  is_active: boolean;
}

/** Response for GET /api/staples */
export interface StaplesResponseDTO {
  data: StapleDefinitionDTO[];
}
```

### Config Endpoint

```typescript
/** Rate limits configuration */
export interface RateLimitsConfigDTO {
  receipt_scans_per_day: number;
  substitutions_per_day: number;
}

/** System configuration DTO for GET /api/config */
export interface SystemConfigDTO {
  supported_allergies: string[];
  supported_diets: string[];
  supported_equipment: string[];
  rate_limits: RateLimitsConfigDTO;
}
```

---

## 4. Response Details

### GET /api/units

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "name_pl": "gram",
      "abbreviation": "g",
      "unit_type": "weight",
      "base_unit_multiplier": 1
    },
    {
      "id": 8,
      "name_pl": "szklanka",
      "abbreviation": "szkl.",
      "unit_type": "volume",
      "base_unit_multiplier": 250
    }
  ]
}
```

### GET /api/categories

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "name_pl": "Warzywa",
      "display_order": 1
    },
    {
      "id": 2,
      "name_pl": "Owoce",
      "display_order": 2
    }
  ]
}
```

### GET /api/staples

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "product": {
        "id": 100,
        "name_pl": "Sól"
      },
      "is_active": true
    },
    {
      "id": 2,
      "product": {
        "id": 101,
        "name_pl": "Pieprz czarny"
      },
      "is_active": true
    }
  ]
}
```

### GET /api/config

**Success Response (200 OK):**

```json
{
  "supported_allergies": [
    "gluten",
    "laktoza",
    "orzechy",
    "jaja",
    "soja",
    "ryby",
    "skorupiaki",
    "seler",
    "gorczyca",
    "sezam",
    "siarczyny",
    "łubin",
    "mięczaki"
  ],
  "supported_diets": ["wegetariańska", "wegańska", "bezglutenowa", "bezlaktozowa", "keto", "paleo"],
  "supported_equipment": [
    "piekarnik",
    "kuchenka mikrofalowa",
    "blender",
    "mikser",
    "robot kuchenny",
    "grill",
    "frytkownica",
    "wolnowar",
    "szybkowar",
    "parowar",
    "toster",
    "opiekacz"
  ],
  "rate_limits": {
    "receipt_scans_per_day": 5,
    "substitutions_per_day": 10
  }
}
```

### Error Responses (All Endpoints)

**401 Unauthorized:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## 5. Data Flow

### Common Authentication Flow

```
1. Client sends GET request with session cookie
2. API route handler creates Supabase client
3. Supabase client validates session (getUser())
4. If invalid/missing → return 401 Unauthorized
5. If valid → proceed to data retrieval
```

### Units Data Flow

```
GET /api/units
    │
    ├─→ Authenticate user
    │
    ├─→ Call lookupService.getAllUnits(supabase)
    │       │
    │       └─→ SELECT id, name_pl, abbreviation, unit_type, base_unit_multiplier
    │           FROM units
    │           ORDER BY unit_type, name_pl
    │
    └─→ Return UnitsResponseDTO
```

### Categories Data Flow

```
GET /api/categories
    │
    ├─→ Authenticate user
    │
    ├─→ Call lookupService.getAllCategories(supabase)
    │       │
    │       └─→ SELECT id, name_pl, display_order
    │           FROM product_categories
    │           ORDER BY display_order ASC
    │
    └─→ Return CategoriesResponseDTO
```

### Staples Data Flow

```
GET /api/staples
    │
    ├─→ Authenticate user
    │
    ├─→ Call lookupService.getAllStapleDefinitions(supabase)
    │       │
    │       └─→ SELECT sd.id, sd.is_active,
    │                  pc.id as product_id, pc.name_pl as product_name
    │           FROM staple_definitions sd
    │           INNER JOIN product_catalog pc ON sd.product_id = pc.id
    │           WHERE sd.is_active = true
    │           ORDER BY pc.name_pl
    │
    └─→ Map to StaplesResponseDTO (with nested product)
```

### Config Data Flow

```
GET /api/config
    │
    ├─→ Authenticate user
    │
    ├─→ Call configService.getSystemConfig(supabase)
    │       │
    │       └─→ SELECT key, value
    │           FROM system_config
    │           WHERE key IN (
    │             'supported_allergies',
    │             'supported_diets',
    │             'supported_equipment',
    │             'rate_limits'
    │           )
    │
    └─→ Aggregate and return SystemConfigDTO
```

---

## 6. Security Considerations

### Authentication

- All endpoints require valid Supabase session
- Session validation via `supabase.auth.getUser()` (server-side JWT validation)
- Use `createClient()` from `@/db/supabase/server` for secure server-side client

### Authorization

- Lookup tables are read-only reference data
- All authenticated users have read access
- No user-specific data filtering required (same data for all users)

### Data Exposure

- No sensitive data exposed through these endpoints
- Polish locale data (name_pl) is intentional for the target market
- Config values are public system settings, not user secrets

---

## 7. Error Handling

### Error Scenarios

| Scenario                  | HTTP Status | Error Code     | Message                      |
| ------------------------- | ----------- | -------------- | ---------------------------- |
| No session cookie         | 401         | UNAUTHORIZED   | Authentication required      |
| Invalid/expired session   | 401         | UNAUTHORIZED   | Authentication required      |
| Database query failure    | 500         | INTERNAL_ERROR | An unexpected error occurred |
| Supabase connection error | 500         | INTERNAL_ERROR | An unexpected error occurred |

### Error Handling Strategy

1. **Early Return Pattern**: Check authentication first, return 401 immediately if failed
2. **Try-Catch Wrapper**: Wrap all database operations in try-catch
3. **Logging**: Log full error details server-side with `console.error()`
4. **Client Response**: Return generic message to client (don't expose internal details)

### Example Error Handling

```typescript
try {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const result = await lookupService.getAllUnits(supabase);
  return NextResponse.json(result, { status: 200 });
} catch (error) {
  console.error("Error fetching units:", error);
  return internalError();
}
```

---

## 8. Performance Considerations

### Caching Strategy

These endpoints return static reference data that changes infrequently:

1. **HTTP Caching**: Use `Cache-Control` headers for browser/CDN caching

   ```typescript
   return NextResponse.json(data, {
     status: 200,
     headers: {
       "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
     },
   });
   ```

   - `max-age=3600`: Cache for 1 hour
   - `stale-while-revalidate=86400`: Serve stale while revalidating for up to 24 hours

2. **Exception for Config**: Config endpoint may need shorter cache or `no-store` if rate limits change frequently

### Database Optimization

1. **Indexes**: Ensure proper indexes exist (already defined in migrations):
   - `units.unit_type` for grouped ordering
   - `product_categories.display_order` for sorted retrieval
   - `staple_definitions.product_id` for JOIN performance

2. **Query Efficiency**:
   - Select only needed columns (no `SELECT *`)
   - Use single query with JOIN for staples instead of N+1 queries

### Response Size

- Units: ~15-20 records (< 1KB)
- Categories: ~15-20 records (< 1KB)
- Staples: ~15-20 records (< 1KB)
- Config: Single object (< 1KB)

All responses are small enough that pagination is unnecessary.

---

## 9. Implementation Steps

### Step 1: Create Lookup Service

Create `src/lib/services/lookup.service.ts`:

```typescript
import type { SupabaseClient } from "@/db/supabase/server";
import type { UnitDTO, CategoryDTO, StapleDefinitionDTO, ProductMinimalDTO } from "@/types";

/**
 * Fetches all measurement units ordered by type and name.
 */
export async function getAllUnits(supabase: SupabaseClient): Promise<UnitDTO[]> {
  const { data, error } = await supabase
    .from("units")
    .select("id, name_pl, abbreviation, unit_type, base_unit_multiplier")
    .order("unit_type")
    .order("name_pl");

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Fetches all product categories ordered by display order.
 */
export async function getAllCategories(supabase: SupabaseClient): Promise<CategoryDTO[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name_pl, display_order")
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Fetches all active staple definitions with product information.
 */
export async function getAllStapleDefinitions(supabase: SupabaseClient): Promise<StapleDefinitionDTO[]> {
  const { data, error } = await supabase
    .from("staple_definitions")
    .select(
      `
      id,
      is_active,
      product_catalog!inner (
        id,
        name_pl
      )
    `
    )
    .eq("is_active", true)
    .order("product_catalog(name_pl)");

  if (error) {
    throw error;
  }

  // Map to DTO structure with nested product
  return (data ?? []).map((row) => ({
    id: row.id,
    is_active: row.is_active,
    product: {
      id: row.product_catalog.id,
      name_pl: row.product_catalog.name_pl,
    } as ProductMinimalDTO,
  }));
}
```

### Step 2: Create Config Service

Create `src/lib/services/config.service.ts`:

```typescript
import type { SupabaseClient } from "@/db/supabase/server";
import type { SystemConfigDTO, RateLimitsConfigDTO } from "@/types";
import { ensureStringArray, ensureNumber } from "@/lib/utils/db";

/**
 * Configuration keys stored in system_config table.
 */
const CONFIG_KEYS = ["supported_allergies", "supported_diets", "supported_equipment", "rate_limits"] as const;

/**
 * Default rate limits if not configured in database.
 */
const DEFAULT_RATE_LIMITS: RateLimitsConfigDTO = {
  receipt_scans_per_day: 5,
  substitutions_per_day: 10,
};

/**
 * Fetches and aggregates system configuration from database.
 */
export async function getSystemConfig(supabase: SupabaseClient): Promise<SystemConfigDTO> {
  const { data, error } = await supabase.from("system_config").select("key, value").in("key", CONFIG_KEYS);

  if (error) {
    throw error;
  }

  const config: SystemConfigDTO = {
    supported_allergies: [],
    supported_diets: [],
    supported_equipment: [],
    rate_limits: { ...DEFAULT_RATE_LIMITS },
  };

  for (const row of data ?? []) {
    switch (row.key) {
      case "supported_allergies":
        config.supported_allergies = ensureStringArray(row.value);
        break;
      case "supported_diets":
        config.supported_diets = ensureStringArray(row.value);
        break;
      case "supported_equipment":
        config.supported_equipment = ensureStringArray(row.value);
        break;
      case "rate_limits":
        config.rate_limits = parseRateLimits(row.value);
        break;
    }
  }

  return config;
}

/**
 * Parses rate limits from JSONB value with fallback to defaults.
 */
function parseRateLimits(value: unknown): RateLimitsConfigDTO {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_RATE_LIMITS };
  }

  const obj = value as Record<string, unknown>;

  return {
    receipt_scans_per_day: ensureNumber(obj.receipt_scans_per_day) ?? DEFAULT_RATE_LIMITS.receipt_scans_per_day,
    substitutions_per_day: ensureNumber(obj.substitutions_per_day) ?? DEFAULT_RATE_LIMITS.substitutions_per_day,
  };
}
```

### Step 3: Create API Route - Units

Create `src/app/api/units/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getAllUnits } from "@/lib/services/lookup.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { UnitsResponseDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/units
 *
 * Retrieves all measurement units for use in inventory tracking.
 * Units are ordered by type (weight, volume, count) and then by name.
 *
 * @returns UnitsResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie
 */
export async function GET(): Promise<NextResponse<UnitsResponseDTO | ErrorResponseDTO>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    const units = await getAllUnits(supabase);

    return NextResponse.json(
      { data: units },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching units:", error);
    return internalError();
  }
}
```

### Step 4: Create API Route - Categories

Create `src/app/api/categories/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getAllCategories } from "@/lib/services/lookup.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { CategoriesResponseDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/categories
 *
 * Retrieves all product categories for filtering and organization.
 * Categories are ordered by display_order for consistent UI presentation.
 *
 * @returns CategoriesResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie
 */
export async function GET(): Promise<NextResponse<CategoriesResponseDTO | ErrorResponseDTO>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    const categories = await getAllCategories(supabase);

    return NextResponse.json(
      { data: categories },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return internalError();
  }
}
```

### Step 5: Create API Route - Staples

Create `src/app/api/staples/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getAllStapleDefinitions } from "@/lib/services/lookup.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { StaplesResponseDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/staples
 *
 * Retrieves all active staple definitions with product information.
 * Staples are common pantry items that users can quickly add to inventory.
 *
 * @returns StaplesResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie
 */
export async function GET(): Promise<NextResponse<StaplesResponseDTO | ErrorResponseDTO>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    const staples = await getAllStapleDefinitions(supabase);

    return NextResponse.json(
      { data: staples },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching staples:", error);
    return internalError();
  }
}
```

### Step 6: Create API Route - Config

Create `src/app/api/config/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getSystemConfig } from "@/lib/services/config.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { SystemConfigDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/config
 *
 * Retrieves system configuration including supported profile values
 * and rate limits for AI features.
 *
 * @returns SystemConfigDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie
 */
export async function GET(): Promise<NextResponse<SystemConfigDTO | ErrorResponseDTO>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    const config = await getSystemConfig(supabase);

    // Config may change more frequently than lookup tables
    return NextResponse.json(config, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return internalError();
  }
}
```

### Step 7: Add ensureNumber Helper (if not exists)

Update `src/lib/utils/db.ts` to include number helper:

```typescript
/**
 * Ensures a value is a number, returning null if not.
 */
export function ensureNumber(value: unknown): number | null {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  return null;
}
```

### Step 8: Verify Database Seed Data

Ensure `supabase/migrations/20260120120004_seed_data.sql` contains:

1. **units** table data with all measurement types
2. **product_categories** table data with display_order
3. **staple_definitions** with references to product_catalog
4. **system_config** entries for:
   - `supported_allergies`
   - `supported_diets`
   - `supported_equipment`
   - `rate_limits`

### Step 9: Verify RLS Policies

Ensure `supabase/migrations/20260120120003_enable_rls_policies.sql` includes read policies for:

- `units`
- `product_categories`
- `staple_definitions`
- `system_config`

---

## 10. Testing Checklist

### Unit Tests (Service Layer)

- [ ] `getAllUnits` returns correctly typed array
- [ ] `getAllCategories` returns sorted by display_order
- [ ] `getAllStapleDefinitions` returns only active staples with nested product
- [ ] `getSystemConfig` aggregates all config values correctly
- [ ] `getSystemConfig` handles missing config keys with defaults

### Integration Tests (API Routes)

- [ ] GET /api/units returns 401 without authentication
- [ ] GET /api/units returns 200 with valid session
- [ ] GET /api/categories returns sorted data
- [ ] GET /api/staples returns nested product structure
- [ ] GET /api/config returns complete configuration object
- [ ] All endpoints return correct Cache-Control headers

### Manual Testing

- [ ] Verify response structure matches API specification
- [ ] Test with expired session token
- [ ] Verify database connection error handling
- [ ] Check response times are acceptable (< 100ms)

---

## 11. File Summary

| File Path                            | Action | Description                            |
| ------------------------------------ | ------ | -------------------------------------- |
| `src/lib/services/lookup.service.ts` | Create | Service for units, categories, staples |
| `src/lib/services/config.service.ts` | Create | Service for system configuration       |
| `src/lib/utils/db.ts`                | Update | Add `ensureNumber` helper if needed    |
| `src/app/api/units/route.ts`         | Create | GET /api/units route handler           |
| `src/app/api/categories/route.ts`    | Create | GET /api/categories route handler      |
| `src/app/api/staples/route.ts`       | Create | GET /api/staples route handler         |
| `src/app/api/config/route.ts`        | Create | GET /api/config route handler          |
