# API Endpoint Implementation Plan: Inventory Management

## 1. Endpoint Overview

The Inventory API provides comprehensive management of a user's food inventory in the Mealer application. It supports both quantitative items (with specific amounts) and staple items (simple have/don't have toggles). The API includes five endpoints:

| Endpoint                | Method | Purpose                                                       |
| ----------------------- | ------ | ------------------------------------------------------------- |
| `/api/inventory`        | GET    | List inventory items with filtering, sorting, and pagination  |
| `/api/inventory`        | POST   | Batch create inventory items (up to 50 per request)           |
| `/api/inventory/:id`    | PUT    | Update a single inventory item                                |
| `/api/inventory`        | DELETE | Batch delete inventory items (up to 50 per request)           |
| `/api/inventory/deduct` | POST   | Deduct quantities from items (used for "Cooked This" feature) |

All endpoints require authentication and enforce user-level data isolation through Supabase Row Level Security (RLS).

---

## 2. Request Details

### 2.1 GET /api/inventory

**HTTP Method:** GET  
**URL Structure:** `/api/inventory`

**Query Parameters:**

| Parameter      | Type    | Required | Default      | Description                                    |
| -------------- | ------- | -------- | ------------ | ---------------------------------------------- |
| `is_staple`    | boolean | No       | -            | Filter by staple status                        |
| `is_available` | boolean | No       | -            | Filter by availability (for staples)           |
| `category_id`  | integer | No       | -            | Filter by product category ID                  |
| `search`       | string  | No       | -            | Search by product name or custom name          |
| `sort_by`      | string  | No       | `created_at` | Sort field: `name`, `created_at`, `updated_at` |
| `sort_order`   | string  | No       | `desc`       | Sort direction: `asc` or `desc`                |
| `page`         | integer | No       | 1            | Page number (1-based)                          |
| `limit`        | integer | No       | 50           | Items per page (max: 100)                      |

---

### 2.2 POST /api/inventory

**HTTP Method:** POST  
**URL Structure:** `/api/inventory`

**Request Body:**

```typescript
{
  items: Array<{
    product_id?: number | null; // Reference to product_catalog
    custom_name?: string | null; // Custom product name
    quantity?: number | null; // Amount (null for staples)
    unit_id?: number | null; // Reference to units table
    is_staple?: boolean; // Default: false
  }>;
}
```

**Validation Rules:**

- Maximum 50 items per request
- Either `product_id` OR `custom_name` must be provided (not both null)
- If `is_staple` is `true`, `quantity` and `unit_id` must be null
- `quantity` must be a positive number if provided
- `unit_id` must reference a valid unit in the database
- `product_id` must reference a valid product in the database

---

### 2.3 PUT /api/inventory/:id

**HTTP Method:** PUT  
**URL Structure:** `/api/inventory/:id`

**Path Parameters:**

- `id` - UUID of the inventory item

**Request Body:**

```typescript
{
  quantity?: number | null;    // New amount
  unit_id?: number | null;     // New unit reference
  is_available?: boolean;      // Availability toggle (for staples)
}
```

**Validation Rules:**

- Item must exist and belong to the authenticated user
- Cannot change `is_staple`, `product_id`, or `custom_name`
- `quantity` must be positive if provided
- `unit_id` must reference a valid unit if provided
- Staple items cannot have quantity or unit_id set

---

### 2.4 DELETE /api/inventory

**HTTP Method:** DELETE  
**URL Structure:** `/api/inventory`

**Request Body:**

```typescript
{
  ids: string[]  // Array of inventory item UUIDs
}
```

**Validation Rules:**

- Maximum 50 items per request
- All items must belong to the authenticated user

---

### 2.5 POST /api/inventory/deduct

**HTTP Method:** POST  
**URL Structure:** `/api/inventory/deduct`

**Request Body:**

```typescript
{
  deductions: Array<{
    inventory_item_id: string; // UUID of the inventory item
    quantity: number; // Amount to deduct
  }>;
}
```

**Validation Rules:**

- All items must belong to the authenticated user
- Items must not be staples (staples don't have quantities)
- `quantity` must be positive
- Deduction cannot exceed current item quantity (item deleted if reaches 0)

---

## 3. Used Types

### 3.1 DTOs (Data Transfer Objects)

All DTOs are already defined in `src/types.ts`:

```typescript
// Core inventory item DTO with expanded relations
interface InventoryItemDTO {
  id: string;
  product_id: number | null;
  product: ProductBriefDTO | null;
  custom_name: string | null;
  quantity: number | null;
  unit: UnitBriefDTO | null;
  is_staple: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

// Nested DTOs for related data
interface ProductBriefDTO {
  id: number;
  name_pl: string;
  category: CategoryBriefDTO | null;
}

interface CategoryBriefDTO {
  id: number;
  name_pl: string;
}

interface UnitBriefDTO {
  id: number;
  name_pl: string;
  abbreviation: string;
}

// Pagination info
interface PaginationDTO {
  page: number;
  limit: number;
  total_items: number;
}
```

### 3.2 Command Models

```typescript
// Query params for GET
interface InventoryListQueryParams {
  is_staple?: boolean;
  is_available?: boolean;
  category_id?: number;
  search?: string;
  sort_by?: "name" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// POST /api/inventory
interface InventoryCreateCommand {
  items: InventoryItemCreateCommand[];
}

interface InventoryItemCreateCommand {
  product_id?: number | null;
  custom_name?: string | null;
  quantity?: number | null;
  unit_id?: number | null;
  is_staple?: boolean;
}

// PUT /api/inventory/:id
interface InventoryItemUpdateCommand {
  quantity?: number | null;
  unit_id?: number | null;
  is_available?: boolean;
}

// DELETE /api/inventory
interface InventoryDeleteCommand {
  ids: string[];
}

// POST /api/inventory/deduct
interface InventoryDeductCommand {
  deductions: InventoryDeductionItemCommand[];
}

interface InventoryDeductionItemCommand {
  inventory_item_id: string;
  quantity: number;
}
```

### 3.3 Response Types

```typescript
// GET response
interface InventoryListResponseDTO {
  data: InventoryItemDTO[];
  pagination: PaginationDTO;
}

// POST response
interface InventoryCreateResponseDTO {
  created: InventoryItemDTO[];
  errors: BatchOperationErrorByIndexDTO[];
  summary: BatchCreateSummaryDTO;
}

// DELETE response
interface InventoryDeleteResponseDTO {
  deleted: string[];
  errors: BatchOperationErrorByIdDTO[];
  summary: BatchDeleteSummaryDTO;
}

// Deduct response
interface InventoryDeductResponseDTO {
  updated: InventoryDeductionResultDTO[];
  errors: BatchOperationErrorByIdDTO[];
  summary: BatchDeductSummaryDTO;
}

interface InventoryDeductionResultDTO {
  id: string;
  previous_quantity: number;
  deducted: number;
  new_quantity: number;
  deleted: boolean;
}
```

---

## 4. Data Flow

### 4.1 GET /api/inventory

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Client    │────>│  Route Handler   │────>│ Inventory Service │────>│    Supabase      │
│             │     │  (Parse Query)   │     │ (Build Query)     │     │   (inventory_    │
└─────────────┘     └──────────────────┘     └───────────────────┘     │    items +       │
                                                      │                │    joins)        │
                                                      │                └──────────────────┘
                                                      ▼
                                             ┌───────────────────┐
                                             │  Map to DTOs      │
                                             │  (with relations) │
                                             └───────────────────┘
```

**Steps:**

1. Parse and validate query parameters
2. Authenticate user via Supabase
3. Build database query with filters, sorting, and pagination
4. Execute query with JOINs to product_catalog, product_categories, and units
5. Get total count for pagination
6. Map database rows to DTOs
7. Return paginated response

### 4.2 POST /api/inventory

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Client    │────>│  Route Handler   │────>│ Inventory Service │────>│   Validation     │
│  (items[])  │     │  (Parse JSON)    │     │                   │     │  (FK checks)     │
└─────────────┘     └──────────────────┘     └───────────────────┘     └──────────────────┘
                                                      │                          │
                                                      │                          ▼
                                                      │                 ┌──────────────────┐
                                                      │<────────────────│  Batch Insert    │
                                                      │                 │  (per-item)      │
                                                      ▼                 └──────────────────┘
                                             ┌───────────────────┐
                                             │ Collect Results   │
                                             │ (created/errors)  │
                                             └───────────────────┘
```

**Steps:**

1. Parse and validate request body with Zod
2. Authenticate user
3. Validate foreign key references (product_ids, unit_ids) in batch
4. Process each item individually to capture per-item errors
5. Insert valid items with user_id
6. Fetch created items with relations for response
7. Return created items, errors, and summary

### 4.3 PUT /api/inventory/:id

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Client    │────>│  Route Handler   │────>│ Inventory Service │────>│  Fetch Item      │
│  (update)   │     │  (Parse Body)    │     │                   │     │  (check owner)   │
└─────────────┘     └──────────────────┘     └───────────────────┘     └──────────────────┘
                                                      │                          │
                                                      │                          ▼
                                                      │                 ┌──────────────────┐
                                                      │<────────────────│  Validate &      │
                                                      │                 │  Update          │
                                                      ▼                 └──────────────────┘
                                             ┌───────────────────┐
                                             │  Return Updated   │
                                             │  Item DTO         │
                                             └───────────────────┘
```

**Steps:**

1. Parse and validate request body
2. Authenticate user
3. Fetch existing item (verify ownership via RLS)
4. Validate update constraints (staple rules, FK references)
5. Update item with new timestamp
6. Fetch updated item with relations
7. Return updated DTO

### 4.4 DELETE /api/inventory

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Client    │────>│  Route Handler   │────>│ Inventory Service │────>│  Verify IDs      │
│   (ids[])   │     │  (Parse Body)    │     │                   │     │  (batch check)   │
└─────────────┘     └──────────────────┘     └───────────────────┘     └──────────────────┘
                                                      │                          │
                                                      │                          ▼
                                                      │                 ┌──────────────────┐
                                                      │<────────────────│  Batch Delete    │
                                                      │                 │  (RLS enforced)  │
                                                      ▼                 └──────────────────┘
                                             ┌───────────────────┐
                                             │ Collect Results   │
                                             │ (deleted/errors)  │
                                             └───────────────────┘
```

**Steps:**

1. Parse and validate request body
2. Authenticate user
3. Verify all IDs exist and belong to user
4. Execute batch delete
5. Track successful deletions and failures
6. Return results with summary

### 4.5 POST /api/inventory/deduct

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Client    │────>│  Route Handler   │────>│ Inventory Service │────>│  Fetch Items     │
│ (deductions)│     │  (Parse Body)    │     │                   │     │  (verify owner)  │
└─────────────┘     └──────────────────┘     └───────────────────┘     └──────────────────┘
                                                      │                          │
                                                      │                          ▼
                                                      │                 ┌──────────────────┐
                                                      │                 │ Validate each    │
                                                      │<────────────────│ (not staple,     │
                                                      │                 │  qty sufficient) │
                                                      │                 └──────────────────┘
                                                      ▼
                                             ┌───────────────────┐
                                             │ Update or Delete  │
                                             │ (if qty = 0)      │
                                             └───────────────────┘
```

**Steps:**

1. Parse and validate request body
2. Authenticate user
3. Fetch all referenced items in batch
4. Validate each deduction (not staple, sufficient quantity)
5. Calculate new quantities
6. Update items or delete if quantity reaches 0
7. Return results with previous/new quantities

---

## 5. Security Considerations

### 5.1 Authentication

- All endpoints require authentication via Supabase session
- Use `createClient()` from `@/db/supabase/server` to get authenticated client
- Verify user with `supabase.auth.getUser()` (server-side JWT validation)
- Support both cookie-based auth (browser) and Bearer token (API testing)

```typescript
const supabase = await createClient();
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  return unauthorizedError();
}
```

### 5.2 Authorization

- Row Level Security (RLS) policies enforce user-level data isolation
- All `inventory_items` queries automatically filtered by `user_id`
- Additional application-level checks for specific business rules:
  - Item ownership verification before updates
  - Cannot modify other users' items even with valid UUIDs

### 5.3 Input Validation

- Use Zod schemas for all input validation
- Validate before any database operations
- Sanitize search strings to prevent SQL injection (Supabase handles this, but validate format)
- Validate UUIDs format for item IDs
- Validate numeric bounds (quantity > 0, page >= 1, limit 1-100)

### 5.4 Data Exposure Prevention

- Never expose internal error details to clients
- Log full errors server-side for debugging
- Return generic error messages for 500 errors
- Don't reveal whether items exist for other users (return 404, not 403)

### 5.5 Foreign Key Validation

- Validate `product_id` references exist in `product_catalog` before insert
- Validate `unit_id` references exist in `units` table before insert/update
- Return specific validation errors for invalid references

---

## 6. Error Handling

### 6.1 HTTP Status Codes

| Status Code               | Scenario                                                           |
| ------------------------- | ------------------------------------------------------------------ |
| 200 OK                    | GET success, PUT success, DELETE all items deleted, deduct success |
| 201 Created               | POST all items created successfully                                |
| 207 Multi-Status          | Partial success on batch operations                                |
| 400 Bad Request           | Invalid JSON, validation errors, invalid query params              |
| 401 Unauthorized          | Missing or invalid authentication                                  |
| 403 Forbidden             | Item does not belong to user (PUT only)                            |
| 404 Not Found             | Item not found (PUT, DELETE single, deduct)                        |
| 422 Unprocessable Entity  | All batch operations failed validation                             |
| 500 Internal Server Error | Unexpected server-side errors                                      |

### 6.2 Error Response Format

Use existing error utilities from `@/lib/api/errors`:

```typescript
// Standard error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "items[0].quantity", "message": "Must be a positive number" }
    ]
  }
}

// Batch operation errors (in successful response body)
{
  "created": [...],
  "errors": [
    { "index": 1, "error": "Invalid unit_id reference" },
    { "index": 3, "error": "product_id not found" }
  ],
  "summary": { "total": 5, "created": 3, "failed": 2 }
}
```

### 6.3 Error Scenarios by Endpoint

**GET /api/inventory:**

- 400: Invalid query parameter format
- 401: Not authenticated
- 500: Database error

**POST /api/inventory:**

- 400: Invalid JSON, schema validation error
- 401: Not authenticated
- 207: Some items failed (with per-item errors)
- 422: All items failed validation
- 500: Database error

**PUT /api/inventory/:id:**

- 400: Invalid JSON, schema validation error, constraint violation
- 401: Not authenticated
- 403: Item belongs to another user
- 404: Item not found
- 500: Database error

**DELETE /api/inventory:**

- 400: Invalid JSON, too many items
- 401: Not authenticated
- 207: Some deletions failed
- 422: All deletions failed
- 500: Database error

**POST /api/inventory/deduct:**

- 400: Invalid JSON, schema validation error
- 401: Not authenticated
- 207: Some deductions failed
- 422: All deductions failed (e.g., all items are staples)
- 500: Database error

---

## 7. Performance Considerations

### 7.1 Database Query Optimization

- **Pagination:** Use offset-based pagination with reasonable defaults (limit: 50, max: 100)
  - Consider cursor-based pagination for very large inventories in future

- **JOINs:** Use efficient LEFT JOINs for related data:
  ```sql
  SELECT ii.*,
         pc.id as product_id, pc.name_pl,
         pcat.id as category_id, pcat.name_pl as category_name,
         u.id as unit_id, u.name_pl as unit_name, u.abbreviation
  FROM inventory_items ii
  LEFT JOIN product_catalog pc ON ii.product_id = pc.id
  LEFT JOIN product_categories pcat ON pc.category_id = pcat.id
  LEFT JOIN units u ON ii.unit_id = u.id
  WHERE ii.user_id = $1
  ```

### 7.2 Batch Operation Efficiency

- **Bulk FK validation:** Validate all `product_id` and `unit_id` references in single queries before processing

  ```typescript
  const productIds = items.map((i) => i.product_id).filter(Boolean);
  const validProducts = await supabase.from("product_catalog").select("id").in("id", productIds);
  ```

- **Batch insert:** Use Supabase's batch insert capability

  ```typescript
  const { data, error } = await supabase.from("inventory_items").insert(validItems).select();
  ```

- **Batch delete:** Delete multiple items in single query
  ```typescript
  const { error } = await supabase.from("inventory_items").delete().in("id", validIds);
  ```

### 7.3 Search Optimization

- For `search` parameter, use PostgreSQL's pattern matching:
  ```sql
  WHERE (pc.name_pl ILIKE '%search%' OR ii.custom_name ILIKE '%search%')
  ```
- Consider using `product_catalog.search_vector` (TSVECTOR) for more advanced full-text search if needed

### 7.4 Caching Considerations

- Add `Cache-Control: no-store, max-age=0` headers for inventory responses
- Inventory data changes frequently and should always be fresh
- Consider caching lookup tables (units, categories) on client side

---

## 8. Implementation Steps

### Step 1: Create Zod Validation Schemas

Create `src/lib/services/inventory.service.ts` with validation schemas:

```typescript
import { z } from "zod";

// GET query params schema
export const inventoryListQuerySchema = z.object({
  is_staple: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  is_available: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  category_id: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), "Must be a positive integer"),
  search: z.string().max(100).optional(),
  sort_by: z.enum(["name", "created_at", "updated_at"]).optional().default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => Number.isInteger(v) && v >= 1, "Must be >= 1"),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 100, "Must be between 1 and 100"),
});

// Single item create schema
export const inventoryItemCreateSchema = z
  .object({
    product_id: z.number().int().positive().nullable().optional(),
    custom_name: z.string().min(1).max(200).nullable().optional(),
    quantity: z.number().positive().nullable().optional(),
    unit_id: z.number().int().positive().nullable().optional(),
    is_staple: z.boolean().optional().default(false),
  })
  .refine((data) => data.product_id != null || data.custom_name != null, {
    message: "Either product_id or custom_name must be provided",
  })
  .refine((data) => !data.is_staple || (data.quantity == null && data.unit_id == null), {
    message: "Staple items cannot have quantity or unit_id",
  });

// Batch create schema
export const inventoryCreateSchema = z.object({
  items: z.array(inventoryItemCreateSchema).min(1).max(50),
});

// Update schema
export const inventoryItemUpdateSchema = z.object({
  quantity: z.number().positive().nullable().optional(),
  unit_id: z.number().int().positive().nullable().optional(),
  is_available: z.boolean().optional(),
});

// Delete schema
export const inventoryDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

// Deduction item schema
export const inventoryDeductionItemSchema = z.object({
  inventory_item_id: z.string().uuid(),
  quantity: z.number().positive(),
});

// Deduct schema
export const inventoryDeductSchema = z.object({
  deductions: z.array(inventoryDeductionItemSchema).min(1),
});
```

### Step 2: Implement Service Functions

Add service functions to `src/lib/services/inventory.service.ts`:

```typescript
// Foreign key validation
export async function validateProductIds(supabase: SupabaseClient, productIds: number[]): Promise<Set<number>>;

export async function validateUnitIds(supabase: SupabaseClient, unitIds: number[]): Promise<Set<number>>;

// Data access functions
export async function listInventoryItems(
  supabase: SupabaseClient,
  userId: string,
  params: InventoryListQueryParams
): Promise<{ items: InventoryItemDTO[]; total: number }>;

export async function getInventoryItemById(supabase: SupabaseClient, itemId: string): Promise<InventoryItemDTO | null>;

export async function createInventoryItems(
  supabase: SupabaseClient,
  userId: string,
  items: InventoryItemCreateCommand[]
): Promise<InventoryCreateResponseDTO>;

export async function updateInventoryItem(
  supabase: SupabaseClient,
  itemId: string,
  data: InventoryItemUpdateCommand
): Promise<InventoryItemDTO | null>;

export async function deleteInventoryItems(
  supabase: SupabaseClient,
  userId: string,
  ids: string[]
): Promise<InventoryDeleteResponseDTO>;

export async function deductInventoryQuantities(
  supabase: SupabaseClient,
  userId: string,
  deductions: InventoryDeductionItemCommand[]
): Promise<InventoryDeductResponseDTO>;

// Mapping helpers
export function mapInventoryRowToDTO(row: InventoryItemRow & Relations): InventoryItemDTO;
```

### Step 3: Implement Route Handlers

Create `src/app/api/inventory/route.ts`:

```typescript
// GET handler - list inventory
export async function GET(request: NextRequest): Promise<NextResponse<InventoryListResponseDTO | ErrorResponseDTO>>;

// POST handler - batch create
export async function POST(request: NextRequest): Promise<NextResponse<InventoryCreateResponseDTO | ErrorResponseDTO>>;

// DELETE handler - batch delete
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<InventoryDeleteResponseDTO | ErrorResponseDTO>>;
```

Create `src/app/api/inventory/[id]/route.ts`:

```typescript
// PUT handler - update single item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<InventoryItemDTO | ErrorResponseDTO>>;
```

Create `src/app/api/inventory/deduct/route.ts`:

```typescript
// POST handler - deduct quantities
export async function POST(request: NextRequest): Promise<NextResponse<InventoryDeductResponseDTO | ErrorResponseDTO>>;
```

### Step 4: Implement GET /api/inventory

1. Parse query parameters from URL searchParams
2. Validate with `inventoryListQuerySchema`
3. Authenticate user
4. Call `listInventoryItems` service function
5. Build Supabase query with:
   - Filters (is_staple, is_available, category_id, search)
   - LEFT JOINs to product_catalog, product_categories, units
   - Sorting (handle "name" sort specially for product name or custom name)
   - Pagination (range-based)
6. Execute count query for total
7. Map results to DTOs
8. Return with pagination info

### Step 5: Implement POST /api/inventory

1. Parse JSON body
2. Validate with `inventoryCreateSchema`
3. Authenticate user
4. Extract all product_ids and unit_ids for batch validation
5. Validate foreign keys in parallel
6. Process each item:
   - Check if product_id/unit_id are valid
   - Prepare insert data with user_id
   - Track errors by index
7. Batch insert valid items
8. Fetch created items with relations
9. Return response with appropriate status (201, 207, or 422)

### Step 6: Implement PUT /api/inventory/:id

1. Validate UUID format in path
2. Parse and validate request body
3. Authenticate user
4. Fetch existing item (RLS will filter by user)
5. Return 404 if not found (covers both "not found" and "not owned")
6. Validate update constraints:
   - If item is_staple, reject quantity/unit_id changes
   - Validate unit_id if provided
7. Update item with new updated_at timestamp
8. Fetch updated item with relations
9. Return updated DTO

### Step 7: Implement DELETE /api/inventory

1. Parse and validate request body
2. Authenticate user
3. Fetch all items by IDs (filtered by RLS)
4. Track which IDs were found vs not found
5. Delete found items
6. Return results with appropriate status (200, 207, or 422)

### Step 8: Implement POST /api/inventory/deduct

1. Parse and validate request body
2. Authenticate user
3. Fetch all referenced items (filtered by RLS)
4. For each deduction:
   - Check item exists
   - Check item is not a staple
   - Check sufficient quantity
   - Calculate new quantity
5. Process deductions:
   - Update items with new quantities
   - Delete items where new quantity = 0
6. Return results with previous/new quantities and deletion status

### Step 9: Add Error Handling

1. Wrap all handlers in try-catch
2. Log errors with context (endpoint, user_id, request body)
3. Return appropriate error responses using utilities from `@/lib/api/errors`
4. Ensure no internal details leak to client

### Step 10: Testing Checklist

- [ ] GET with no filters returns paginated results
- [ ] GET with each filter type works correctly
- [ ] GET with combined filters works correctly
- [ ] GET with invalid params returns 400
- [ ] POST creates items successfully (201)
- [ ] POST with partial failures returns 207
- [ ] POST with all failures returns 422
- [ ] POST validates FK references
- [ ] POST enforces staple constraints
- [ ] PUT updates existing item (200)
- [ ] PUT returns 404 for non-existent item
- [ ] PUT validates constraints
- [ ] DELETE removes items successfully (200)
- [ ] DELETE with partial failures returns 207
- [ ] Deduct calculates quantities correctly
- [ ] Deduct deletes items at zero quantity
- [ ] All endpoints return 401 without auth
- [ ] RLS prevents cross-user data access

---

## File Structure Summary

```
src/
├── app/
│   └── api/
│       └── inventory/
│           ├── route.ts           # GET, POST, DELETE handlers
│           ├── [id]/
│           │   └── route.ts       # PUT handler
│           └── deduct/
│               └── route.ts       # POST deduct handler
├── lib/
│   └── services/
│       └── inventory.service.ts   # Validation schemas & service functions
└── types.ts                       # DTOs (already defined)
```
