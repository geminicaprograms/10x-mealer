# API Endpoint Implementation Plan: Products (Autocomplete)

## 1. Endpoint Overview

This plan covers two related endpoints for the product catalog feature:

1. **GET /api/products/search** - Search the product catalog for autocomplete functionality. Returns products matching a search query with optional category filtering.

2. **GET /api/products/:id** - Retrieve a single product by its ID for detailed view or reference.

Both endpoints serve the inventory management feature by enabling users to search and select products from a curated catalog when adding items to their inventory.

---

## 2. Request Details

### 2.1 GET /api/products/search

- **HTTP Method:** GET
- **URL Structure:** `/api/products/search?q={query}&category_id={id}&limit={n}`
- **Parameters:**

| Parameter     | Type    | Required | Default | Constraints                     | Description                   |
| ------------- | ------- | -------- | ------- | ------------------------------- | ----------------------------- |
| `q`           | string  | Yes      | -       | Minimum 2 characters            | Search query for autocomplete |
| `category_id` | integer | No       | -       | Must be positive integer if set | Filter by product category    |
| `limit`       | integer | No       | 10      | Range: 1-20                     | Maximum number of results     |

### 2.2 GET /api/products/:id

- **HTTP Method:** GET
- **URL Structure:** `/api/products/{id}`
- **Path Parameters:**

| Parameter | Type    | Required | Description                           |
| --------- | ------- | -------- | ------------------------------------- |
| `id`      | integer | Yes      | Product catalog ID (positive integer) |

---

## 3. Used Types

### 3.1 Existing DTOs (from `src/types.ts`)

```typescript
/** Product DTO with expanded relations for search and detail endpoints */
interface ProductDTO {
  id: number;
  name_pl: string;
  category: CategoryBriefDTO | null;
  default_unit: UnitBriefDTO | null;
  aliases: string[];
}

/** Abbreviated category DTO for nested references */
interface CategoryBriefDTO {
  id: number;
  name_pl: string;
}

/** Abbreviated unit DTO for nested references */
interface UnitBriefDTO {
  id: number;
  name_pl: string;
  abbreviation: string;
}

/** Response for GET /api/products/search */
interface ProductSearchResponseDTO {
  data: ProductDTO[];
}
```

### 3.2 New Query Parameter Types (to add to service)

```typescript
/** Validated query parameters for GET /api/products/search */
interface ProductSearchQueryParams {
  q: string;
  category_id?: number;
  limit: number;
}
```

### 3.3 Zod Validation Schemas (to implement in service)

```typescript
// Schema for search query parameters
const productSearchQuerySchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters"),
  category_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

// Schema for product ID path parameter
const productIdSchema = z.coerce.number().int().positive();
```

---

## 4. Response Details

### 4.1 GET /api/products/search

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": 123,
      "name_pl": "Kurczak",
      "category": {
        "id": 4,
        "name_pl": "Mięso i drób"
      },
      "default_unit": {
        "id": 1,
        "name_pl": "gram",
        "abbreviation": "g"
      },
      "aliases": ["kurczę", "drób"]
    }
  ]
}
```

**Error Responses:**

| Status | Code             | Scenario                                  |
| ------ | ---------------- | ----------------------------------------- |
| 400    | VALIDATION_ERROR | Query `q` missing or shorter than 2 chars |
| 400    | VALIDATION_ERROR | Invalid `category_id` or `limit` value    |
| 401    | UNAUTHORIZED     | User not authenticated                    |
| 500    | INTERNAL_ERROR   | Database or server error                  |

### 4.2 GET /api/products/:id

**Success Response (200 OK):**

```json
{
  "id": 123,
  "name_pl": "Kurczak",
  "category": {
    "id": 4,
    "name_pl": "Mięso i drób"
  },
  "default_unit": {
    "id": 1,
    "name_pl": "gram",
    "abbreviation": "g"
  },
  "aliases": ["kurczę", "drób"]
}
```

**Error Responses:**

| Status | Code             | Scenario                     |
| ------ | ---------------- | ---------------------------- |
| 400    | VALIDATION_ERROR | Invalid product ID format    |
| 401    | UNAUTHORIZED     | User not authenticated       |
| 404    | NOT_FOUND        | Product with given ID absent |
| 500    | INTERNAL_ERROR   | Database or server error     |

---

## 5. Data Flow

### 5.1 GET /api/products/search

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Client Request │────>│  Route Handler   │────>│  product.service.ts │
│  GET /search?q= │     │  (auth + parse)  │     │  searchProducts()   │
└─────────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                            │
                        ┌──────────────────────────────────-┘
                        ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Supabase Query:                                                      │
│  SELECT pc.*, cat.id, cat.name_pl, u.id, u.name_pl, u.abbreviation    │
│  FROM product_catalog pc                                              │
│  LEFT JOIN product_categories cat ON pc.category_id = cat.id          │
│  LEFT JOIN units u ON pc.default_unit_id = u.id                       │
│  WHERE pc.search_vector @@ plainto_tsquery('polish', $query)          │
│    OR pc.name_pl ILIKE $pattern                                       │
│  [AND pc.category_id = $category_id]                                  │
│  ORDER BY ts_rank(pc.search_vector, ...) DESC, pc.name_pl             │
│  LIMIT $limit                                                         │
└───────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────┐     ┌──────────────────┐
│  JSON Response  │<────│  Map to DTOs     │
│  { data: [...] }│     │  ProductDTO[]    │
└─────────────────┘     └──────────────────┘
```

### 5.2 GET /api/products/:id

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Client Request │────>│  Route Handler   │────>│  product.service.ts │
│  GET /products/1│     │  (auth + parse)  │     │  getProductById()   │
└─────────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                            │
                        ┌───────────────────────────────────┘
                        ▼
┌───────────────────────────────────────────────────────────────────────┐
│  Supabase Query:                                                      │
│  SELECT pc.*, cat.id, cat.name_pl, u.id, u.name_pl, u.abbreviation    │
│  FROM product_catalog pc                                              │
│  LEFT JOIN product_categories cat ON pc.category_id = cat.id          │
│  LEFT JOIN units u ON pc.default_unit_id = u.id                       │
│  WHERE pc.id = $id                                                    │
└───────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────┐     ┌──────────────────┐
│  JSON Response  │<────│  Map to DTO      │
│  ProductDTO     │     │  (or 404 error)  │
└─────────────────┘     └──────────────────┘
```

---

## 6. Security Considerations

### 6.1 Authentication

- **Both endpoints require authentication** via Supabase session cookie
- Use `supabase.auth.getUser()` to validate JWT server-side
- Return 401 UNAUTHORIZED if user is not authenticated

### 6.2 Input Validation

- **Query parameter validation** using Zod schemas to prevent:
  - SQL injection (parameterized queries only)
  - Invalid data types reaching the database
  - Excessive result limits (max 20 items)
- **Search query sanitization:**
  - Minimum 2 characters enforced
  - Use PostgreSQL's `plainto_tsquery` for safe full-text search
  - Use parameterized `ILIKE` patterns for fallback search

### 6.3 Data Exposure

- Product catalog is read-only reference data (no user-specific data)
- No sensitive information exposed in responses
- Aliases field contains only public product names

### 6.4 Rate Limiting

- Consider implementing rate limiting for search endpoint to prevent abuse
- Recommended: 60 requests per minute per user for search endpoint

---

## 7. Error Handling

### 7.1 Error Scenarios and Status Codes

| Scenario                            | Status | Error Code       | Message                                      |
| ----------------------------------- | ------ | ---------------- | -------------------------------------------- |
| Missing `q` parameter               | 400    | VALIDATION_ERROR | "Search query is required"                   |
| `q` shorter than 2 characters       | 400    | VALIDATION_ERROR | "Search query must be at least 2 characters" |
| Invalid `category_id` (non-integer) | 400    | VALIDATION_ERROR | "category_id must be a positive integer"     |
| Invalid `limit` (out of range)      | 400    | VALIDATION_ERROR | "limit must be between 1 and 20"             |
| Invalid product `id` format         | 400    | VALIDATION_ERROR | "Invalid product ID"                         |
| User not authenticated              | 401    | UNAUTHORIZED     | "Authentication required"                    |
| Product not found                   | 404    | NOT_FOUND        | "Product not found"                          |
| Database connection error           | 500    | INTERNAL_ERROR   | "An unexpected error occurred"               |
| Query execution error               | 500    | INTERNAL_ERROR   | "An unexpected error occurred"               |

### 7.2 Error Handling Pattern

```typescript
// Route handler error handling pattern
try {
  // 1. Authentication check
  // 2. Input validation
  // 3. Service call
  // 4. Return success response
} catch (error) {
  console.error("Error in product endpoint:", error);
  return internalError();
}
```

### 7.3 Logging

- Log all errors to console with context (endpoint, error details)
- Do not expose internal error details to clients
- Consider structured logging for production monitoring

---

## 8. Performance Considerations

### 8.1 Database Optimization

- **Full-text search index:** The `search_vector` column in `product_catalog` is a generated TSVECTOR with GIN index for fast full-text search
- **Category filtering:** Index on `category_id` foreign key for efficient filtering
- **Limit enforcement:** Always apply LIMIT clause to prevent large result sets

### 8.2 Query Optimization

- Use a **hybrid search strategy:**
  1. Primary: Full-text search using `search_vector` with Polish dictionary
  2. Fallback: ILIKE pattern match for partial/prefix matches
- Combine both in single query with proper ranking

### 8.3 Caching Strategy

- Product catalog changes infrequently (developer-maintained)
- Consider implementing:
  - **Client-side:** Short Cache-Control headers (e.g., 5 minutes)
  - **Edge:** CDN caching with appropriate invalidation
  - **Server-side:** In-memory caching for frequently accessed products

### 8.4 Response Size

- Limit maximum results to 20 items
- Response includes only essential fields (no heavy data)
- Average response size: < 2KB for typical searches

---

## 9. Implementation Steps

### Step 1: Create Product Service (`src/lib/services/product.service.ts`)

1. Create the service file with the following structure:
   - Import dependencies (Zod, Supabase types, DTOs)
   - Define validation schemas for query parameters and path parameters
   - Export `ProductSearchQueryParams` interface
   - Implement `searchProducts(supabase, params)` function
   - Implement `getProductById(supabase, id)` function
   - Implement `mapProductRowToDTO(row)` helper function

2. **Validation schemas:**

```typescript
import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase/server";
import type { ProductDTO, CategoryBriefDTO, UnitBriefDTO } from "@/types";

// Query parameter validation for search endpoint
export const productSearchQuerySchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters"),
  category_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type ProductSearchQueryParams = z.infer<typeof productSearchQuerySchema>;

// Path parameter validation for product ID
export const productIdSchema = z.coerce.number().int().positive();
```

3. **Search function implementation:**

```typescript
export async function searchProducts(
  supabase: SupabaseClient,
  params: ProductSearchQueryParams
): Promise<ProductDTO[]> {
  const { q, category_id, limit } = params;

  // Build query with joins for category and unit
  let query = supabase
    .from("product_catalog")
    .select(
      `
      id,
      name_pl,
      aliases,
      category:product_categories(id, name_pl),
      default_unit:units(id, name_pl, abbreviation)
    `
    )
    .or(`name_pl.ilike.%${q}%,aliases.cs.{${q}}`)
    .order("name_pl")
    .limit(limit);

  if (category_id !== undefined) {
    query = query.eq("category_id", category_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapProductRowToDTO);
}
```

4. **Get by ID function implementation:**

```typescript
export async function getProductById(supabase: SupabaseClient, id: number): Promise<ProductDTO | null> {
  const { data, error } = await supabase
    .from("product_catalog")
    .select(
      `
      id,
      name_pl,
      aliases,
      category:product_categories(id, name_pl),
      default_unit:units(id, name_pl, abbreviation)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return mapProductRowToDTO(data);
}
```

5. **DTO mapping helper:**

```typescript
function mapProductRowToDTO(row: ProductCatalogQueryResult): ProductDTO {
  return {
    id: row.id,
    name_pl: row.name_pl,
    category: row.category as CategoryBriefDTO | null,
    default_unit: row.default_unit as UnitBriefDTO | null,
    aliases: row.aliases ?? [],
  };
}
```

### Step 2: Create Search Route Handler (`src/app/api/products/search/route.ts`)

1. Create directory structure: `src/app/api/products/search/`
2. Implement GET handler:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { searchProducts, productSearchQuerySchema } from "@/lib/services/product.service";
import { unauthorizedError, validationError, internalError } from "@/lib/api/errors";
import type { ProductSearchResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse<ProductSearchResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      q: searchParams.get("q"),
      category_id: searchParams.get("category_id"),
      limit: searchParams.get("limit"),
    };

    // 2. Validate with Zod
    const parseResult = productSearchQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Execute search
    const products = await searchProducts(supabase, parseResult.data);

    // 5. Return response
    return NextResponse.json({ data: products }, { status: 200 });
  } catch (error) {
    console.error("Error searching products:", error);
    return internalError();
  }
}
```

### Step 3: Create Product Detail Route Handler (`src/app/api/products/[id]/route.ts`)

1. Create directory structure: `src/app/api/products/[id]/`
2. Implement GET handler:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getProductById, productIdSchema } from "@/lib/services/product.service";
import { unauthorizedError, validationError, notFoundError, internalError } from "@/lib/api/errors";
import type { ProductDTO, ErrorResponseDTO } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ProductDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse and validate path parameter
    const { id: rawId } = await params;
    const parseResult = productIdSchema.safeParse(rawId);

    if (!parseResult.success) {
      return validationError("Invalid product ID");
    }

    const productId = parseResult.data;

    // 2. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 3. Fetch product
    const product = await getProductById(supabase, productId);

    // 4. Handle not found
    if (!product) {
      return notFoundError("Product not found");
    }

    // 5. Return response
    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return internalError();
  }
}
```

### Step 4: Testing Checklist

1. **Unit Tests (Service Layer):**
   - [ ] `searchProducts` returns empty array for no matches
   - [ ] `searchProducts` respects limit parameter
   - [ ] `searchProducts` filters by category_id correctly
   - [ ] `getProductById` returns null for non-existent ID
   - [ ] `getProductById` returns correct DTO for valid ID
   - [ ] DTO mapping correctly handles null category/unit

2. **Integration Tests (API Routes):**
   - [ ] Search returns 400 for missing `q` parameter
   - [ ] Search returns 400 for `q` shorter than 2 characters
   - [ ] Search returns 400 for invalid `category_id`
   - [ ] Search returns 401 for unauthenticated requests
   - [ ] Search returns 200 with valid parameters
   - [ ] Product detail returns 400 for invalid ID format
   - [ ] Product detail returns 401 for unauthenticated requests
   - [ ] Product detail returns 404 for non-existent product
   - [ ] Product detail returns 200 for valid product ID

3. **Manual Testing:**
   - [ ] Verify Polish text search works correctly
   - [ ] Verify aliases are searched
   - [ ] Verify response includes nested category and unit
   - [ ] Verify performance with typical queries

### Step 5: Documentation Updates

1. Update API documentation if needed
2. Add endpoint examples to README if applicable

---

## 10. File Structure Summary

After implementation, the following files will be created/modified:

```
src/
├── app/
│   └── api/
│       └── products/
│           ├── search/
│           │   └── route.ts        # NEW: Search endpoint handler
│           └── [id]/
│               └── route.ts        # NEW: Product detail handler
└── lib/
    └── services/
        └── product.service.ts      # NEW: Product service layer
```

---

## 11. Dependencies

No new dependencies required. Uses existing:

- `zod` - Input validation
- `@supabase/ssr` - Database client
- `next` - Route handling
