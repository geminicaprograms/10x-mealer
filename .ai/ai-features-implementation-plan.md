# API Endpoint Implementation Plan: AI Features

This document provides a comprehensive implementation plan for the AI Features endpoints:

- `POST /api/ai/scan-receipt` - Receipt scanning via vision LLM
- `POST /api/ai/substitutions` - Ingredient substitution suggestions
- `GET /api/ai/usage` - AI usage statistics

---

## 1. Endpoint Overview

### 1.1 POST /api/ai/scan-receipt

Accepts a base64-encoded receipt image and processes it using a vision-capable LLM (via OpenRouter.ai) to extract product items. Returns extracted items with optional product catalog matches, quantity suggestions, and confidence scores.

### 1.2 POST /api/ai/substitutions

Analyzes recipe ingredients against the user's inventory to identify available, partial, and missing ingredients. Uses AI to suggest substitutions from available inventory items, considering user allergies, diets, and available equipment.

### 1.3 GET /api/ai/usage

Returns the current user's AI feature usage statistics for the current day, including scans and substitutions consumed vs. daily limits.

---

## 2. Request Details

### 2.1 POST /api/ai/scan-receipt

- **HTTP Method:** POST
- **URL Structure:** `/api/ai/scan-receipt`
- **Parameters:**
  - Required: None (all data in body)
  - Optional: None
- **Request Body:**

```json
{
  "image": "base64_encoded_image_data",
  "image_type": "image/jpeg"
}
```

| Field        | Type   | Required | Constraints                                                                 |
| ------------ | ------ | -------- | --------------------------------------------------------------------------- |
| `image`      | string | Yes      | Valid base64-encoded string, max 10MB decoded                               |
| `image_type` | enum   | Yes      | One of: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` |

### 2.2 POST /api/ai/substitutions

- **HTTP Method:** POST
- **URL Structure:** `/api/ai/substitutions`
- **Parameters:**
  - Required: None (all data in body)
  - Optional: None
- **Request Body:**

```json
{
  "recipe_ingredients": [
    {
      "name": "śmietana 30%",
      "quantity": 200,
      "unit": "ml"
    }
  ]
}
```

| Field                           | Type   | Required | Constraints                           |
| ------------------------------- | ------ | -------- | ------------------------------------- |
| `recipe_ingredients`            | array  | Yes      | Min 1, max 30 items                   |
| `recipe_ingredients[].name`     | string | Yes      | Non-empty string                      |
| `recipe_ingredients[].quantity` | number | No       | Positive number if provided           |
| `recipe_ingredients[].unit`     | string | No       | Any string (flexible for AI matching) |

### 2.3 GET /api/ai/usage

- **HTTP Method:** GET
- **URL Structure:** `/api/ai/usage`
- **Parameters:**
  - Required: None
  - Optional: None
- **Request Body:** None

---

## 3. Used Types

### 3.1 Existing Types (from `src/types.ts`)

```typescript
// Request/Command Types
export type ReceiptImageType = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
export interface ReceiptScanCommand {
  image: string;
  image_type: ReceiptImageType;
}

export interface RecipeIngredientCommand {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface SubstitutionsCommand {
  recipe_ingredients: RecipeIngredientCommand[];
}

// Response Types
export interface ReceiptScanResponseDTO {
  items: ReceiptScanItemDTO[];
  usage: {
    scans_used_today: number;
    scans_remaining: number;
  };
}

export interface ReceiptScanItemDTO {
  name: string;
  matched_product: ReceiptMatchedProductDTO | null;
  quantity: number | null;
  suggested_unit: UnitBriefDTO | null;
  confidence: number;
}

export interface SubstitutionsResponseDTO {
  analysis: IngredientAnalysisDTO[];
  warnings: SubstitutionWarningDTO[];
  usage: {
    substitutions_used_today: number;
    substitutions_remaining: number;
  };
}

export interface IngredientAnalysisDTO {
  ingredient: string;
  status: IngredientStatus;
  matched_inventory_item: MatchedInventoryItemDTO | null;
  substitution: SubstitutionSuggestionDTO | null;
  allergy_warning: string | null;
}

export interface AIUsageDTO {
  date: string;
  receipt_scans: AIUsageCounterDTO;
  substitutions: AIUsageCounterDTO;
}

export interface AIUsageCounterDTO {
  used: number;
  limit: number;
  remaining: number;
}
```

### 3.2 New Internal Types (for `ai.service.ts`)

```typescript
/** Result of rate limit check */
export interface RateLimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/** Parsed receipt item from LLM response */
export interface LLMReceiptItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  confidence: number;
}

/** LLM response for receipt scanning */
export interface LLMReceiptScanResult {
  items: LLMReceiptItem[];
  raw_text?: string;
}

/** Context passed to substitution LLM */
export interface SubstitutionContext {
  inventory_items: InventoryItemForAI[];
  user_allergies: string[];
  user_diets: string[];
  user_equipment: string[];
}

/** Simplified inventory item for AI context */
export interface InventoryItemForAI {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  is_available: boolean;
}
```

---

## 4. Response Details

### 4.1 POST /api/ai/scan-receipt

**Success Response (200 OK):**

```json
{
  "items": [
    {
      "name": "Kurczak filet",
      "matched_product": {
        "id": 123,
        "name_pl": "Kurczak"
      },
      "quantity": 500,
      "suggested_unit": {
        "id": 1,
        "name_pl": "gram",
        "abbreviation": "g"
      },
      "confidence": 0.95
    }
  ],
  "usage": {
    "scans_used_today": 3,
    "scans_remaining": 2
  }
}
```

**Error Responses:**

| Status | Code                     | Description                                             |
| ------ | ------------------------ | ------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`       | Invalid image format, corrupted data, or missing fields |
| 401    | `UNAUTHORIZED`           | User not authenticated                                  |
| 422    | `VALIDATION_ERROR`       | Image quality too low for processing                    |
| 429    | `RATE_LIMITED`           | Daily rate limit exceeded                               |
| 500    | `INTERNAL_ERROR`         | Unexpected server error                                 |
| 502    | `EXTERNAL_SERVICE_ERROR` | OpenRouter.ai API failure                               |

### 4.2 POST /api/ai/substitutions

**Success Response (200 OK):**

```json
{
  "analysis": [
    {
      "ingredient": "śmietana 30%",
      "status": "missing",
      "matched_inventory_item": null,
      "substitution": {
        "available": true,
        "suggestion": "Użyj jogurtu greckiego (200ml)...",
        "substitute_item": {
          "id": "uuid",
          "name": "Jogurt grecki",
          "quantity": 500,
          "unit": "g"
        }
      },
      "allergy_warning": null
    }
  ],
  "warnings": [
    {
      "type": "allergy",
      "message": "Przepis zawiera gluten - masz alergię na gluten!"
    }
  ],
  "usage": {
    "substitutions_used_today": 5,
    "substitutions_remaining": 5
  }
}
```

**Error Responses:**

| Status | Code                     | Description                       |
| ------ | ------------------------ | --------------------------------- |
| 400    | `VALIDATION_ERROR`       | Invalid payload structure         |
| 401    | `UNAUTHORIZED`           | User not authenticated            |
| 403    | `FORBIDDEN`              | User has not completed onboarding |
| 429    | `RATE_LIMITED`           | Daily rate limit exceeded         |
| 500    | `INTERNAL_ERROR`         | Unexpected server error           |
| 502    | `EXTERNAL_SERVICE_ERROR` | OpenRouter.ai API failure         |

### 4.3 GET /api/ai/usage

**Success Response (200 OK):**

```json
{
  "date": "2026-01-22",
  "receipt_scans": {
    "used": 3,
    "limit": 5,
    "remaining": 2
  },
  "substitutions": {
    "used": 5,
    "limit": 10,
    "remaining": 5
  }
}
```

**Error Responses:**

| Status | Code             | Description             |
| ------ | ---------------- | ----------------------- |
| 401    | `UNAUTHORIZED`   | User not authenticated  |
| 500    | `INTERNAL_ERROR` | Unexpected server error |

---

## 5. Data Flow

### 5.1 POST /api/ai/scan-receipt

```
Client Request
      │
      ▼
┌─────────────────────────┐
│  Route Handler          │
│  src/app/api/ai/        │
│  scan-receipt/route.ts  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 1. Parse & Validate     │──────► 400 on invalid input
│    (Zod schema)         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Authenticate User    │──────► 401 if not authenticated
│    (Supabase session)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Check Rate Limit     │──────► 429 if exceeded
│    (ai_usage_log +      │
│     system_config)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Call Vision LLM      │──────► 502 on external failure
│    (OpenRouter.ai)      │──────► 422 if unprocessable
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Match Products       │
│    (product_catalog)    │
│    Full-text search     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 6. Get Suggested Units  │
│    (units table)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 7. Increment Usage      │
│    (ai_usage_log)       │
└───────────┬─────────────┘
            │
            ▼
      200 Response
```

### 5.2 POST /api/ai/substitutions

```
Client Request
      │
      ▼
┌─────────────────────────┐
│  Route Handler          │
│  src/app/api/ai/        │
│  substitutions/route.ts │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 1. Parse & Validate     │──────► 400 on invalid input
│    (Zod schema)         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Authenticate User    │──────► 401 if not authenticated
│    (Supabase session)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Check Onboarding     │──────► 403 if incomplete
│    (profiles table)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Check Rate Limit     │──────► 429 if exceeded
│    (ai_usage_log +      │
│     system_config)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Fetch User Context   │
│    - Inventory items    │
│    - Profile (allergies,│
│      diets, equipment)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 6. Match Ingredients    │
│    to Inventory         │
│    (fuzzy matching)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 7. Call AI for          │──────► 502 on external failure
│    Substitutions        │
│    (OpenRouter.ai)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 8. Generate Warnings    │
│    (allergy/diet check) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 9. Increment Usage      │
│    (ai_usage_log)       │
└───────────┬─────────────┘
            │
            ▼
      200 Response
```

### 5.3 GET /api/ai/usage

```
Client Request
      │
      ▼
┌─────────────────────────┐
│  Route Handler          │
│  src/app/api/ai/        │
│  usage/route.ts         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 1. Authenticate User    │──────► 401 if not authenticated
│    (Supabase session)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Fetch Rate Limits    │
│    (system_config)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Fetch Today's Usage  │
│    (ai_usage_log)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Calculate Remaining  │
└───────────┬─────────────┘
            │
            ▼
      200 Response
```

---

## 6. Security Considerations

### 6.1 Authentication

- All endpoints require valid Supabase session
- Use `createClient()` from `@/db/supabase/server` for authenticated client
- Return 401 `UNAUTHORIZED` if `supabase.auth.getUser()` fails

### 6.2 Authorization

- **Row Level Security (RLS):** `ai_usage_log` table has RLS enabled; users can only access their own records
- **Onboarding Gate:** Substitutions endpoint requires `onboarding_status = 'completed'`

### 6.3 Rate Limiting

- **Receipt scans:** Default 5 per day (configurable via `system_config`)
- **Substitutions:** Default 10 per day (configurable via `system_config`)
- Rate limits are per-user, tracked in `ai_usage_log` with composite key `(user_id, usage_date)`
- Check rate limit BEFORE processing to prevent wasted LLM calls

### 6.4 Input Validation

1. **Image validation (scan-receipt):**
   - Validate base64 string format (regex pattern)
   - Check decoded size ≤ 10MB
   - Validate MIME type is in allowed list
   - Consider scanning for malicious content patterns

2. **Ingredients validation (substitutions):**
   - Limit array size to 30 items
   - Sanitize ingredient names (trim, max length 200)
   - Validate quantity is positive if provided

### 6.5 External Service Security

- Store OpenRouter API key in environment variable (`OPENROUTER_API_KEY`)
- Use HTTPS for all external API calls
- Set reasonable timeouts (30s for vision, 15s for text)
- Implement retry logic with exponential backoff
- Never log full image data or API responses containing user data

### 6.6 Data Protection

- Do not persist receipt images after processing
- Log only error codes and non-sensitive metadata
- Ensure LLM responses are sanitized before returning to client

---

## 7. Error Handling

### 7.1 Error Response Format

All errors follow the standard `ErrorResponseDTO` format:

```typescript
interface ErrorResponseDTO {
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetailDTO[];
  };
}
```

### 7.2 Error Scenarios

| Scenario                  | Status | Code                     | Message                                                          |
| ------------------------- | ------ | ------------------------ | ---------------------------------------------------------------- |
| Missing/invalid JSON body | 400    | `VALIDATION_ERROR`       | "Invalid JSON in request body"                                   |
| Missing required field    | 400    | `VALIDATION_ERROR`       | Field-specific message in details                                |
| Invalid image type        | 400    | `VALIDATION_ERROR`       | "Unsupported image type. Allowed: jpeg, png, webp, heic, heif"   |
| Image too large           | 400    | `VALIDATION_ERROR`       | "Image size exceeds 10MB limit"                                  |
| No auth session           | 401    | `UNAUTHORIZED`           | "Authentication required"                                        |
| Onboarding not complete   | 403    | `FORBIDDEN`              | "Complete onboarding before using AI features"                   |
| Image unreadable by AI    | 422    | `VALIDATION_ERROR`       | "Unable to process image. Ensure the receipt is clearly visible" |
| Daily limit exceeded      | 429    | `RATE_LIMITED`           | "Daily scan limit exceeded. Try again tomorrow"                  |
| Database error            | 500    | `INTERNAL_ERROR`         | "An unexpected error occurred"                                   |
| OpenRouter API error      | 502    | `EXTERNAL_SERVICE_ERROR` | "AI service temporarily unavailable"                             |
| OpenRouter timeout        | 502    | `EXTERNAL_SERVICE_ERROR` | "AI service request timed out"                                   |

### 7.3 Error Handling Strategy

```typescript
// Pattern for route handlers
try {
  // 1. Validate input
  // 2. Authenticate
  // 3. Business logic
  // 4. Return success response
} catch (error) {
  // Log with context for debugging
  console.error("Error in [endpoint]:", {
    error,
    userId: user?.id,
    // Other non-sensitive context
  });

  // Return appropriate error response
  if (error instanceof ExternalServiceError) {
    return externalServiceError(error.message);
  }
  return internalError();
}
```

---

## 8. Performance Considerations

### 8.1 Potential Bottlenecks

1. **LLM API Latency:** Vision models take 5-15 seconds; text completion 2-5 seconds
2. **Product Matching:** Full-text search on `product_catalog` for each extracted item
3. **Inventory Fetching:** Loading full inventory for substitution context

### 8.2 Optimization Strategies

1. **Parallel Operations:**
   - Fetch rate limits and validate input concurrently
   - For substitutions, fetch inventory and profile in parallel
   - Match multiple products concurrently using `Promise.all()`

2. **Database Efficiency:**
   - Use PostgreSQL full-text search (`search_vector`) for product matching
   - Index `ai_usage_log(user_id, usage_date)` for fast rate limit checks
   - Select only needed columns, not entire rows

3. **Caching:**
   - Cache `system_config` rate limits (short TTL, e.g., 5 minutes)
   - Cache units table (rarely changes)
   - Consider caching product catalog for fuzzy matching

4. **LLM Optimization:**
   - Use appropriate model for task (cheaper/faster for simple tasks)
   - Optimize prompts for minimal token usage
   - Set reasonable `max_tokens` limits
   - Implement request timeout (30s) to prevent hanging

5. **Response Streaming (Future):**
   - Consider streaming responses for substitutions as AI generates them

### 8.3 Database Indexes

Ensure these indexes exist for optimal performance:

```sql
-- Rate limit checks
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_date
ON ai_usage_log(user_id, usage_date);

-- Product matching (already exists via search_vector)
CREATE INDEX IF NOT EXISTS idx_product_catalog_search
ON product_catalog USING GIN(search_vector);

-- Inventory filtering for substitutions
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_available
ON inventory_items(user_id, is_available);
```

---

## 9. Implementation Steps

### Phase 1: Service Foundation

#### Step 1.1: Create AI Service File

Create `src/lib/services/ai.service.ts` with:

1. **Zod Validation Schemas:**

   ```typescript
   // receiptScanSchema
   // - image: z.string().min(1) with base64 validation
   // - image_type: z.enum([...])

   // substitutionsSchema
   // - recipe_ingredients: z.array(...).min(1).max(30)
   ```

2. **Rate Limit Functions:**

   ```typescript
   // checkRateLimit(supabase, userId, type: 'receipt_scans' | 'substitutions')
   // incrementUsage(supabase, userId, type: 'receipt_scans' | 'substitutions')
   // getUserUsageToday(supabase, userId)
   ```

3. **Helper Functions:**
   ```typescript
   // validateBase64Image(image: string, maxSizeBytes: number): boolean
   // estimateBase64Size(base64: string): number
   ```

#### Step 1.2: Create OpenRouter Client

Create `src/lib/services/openrouter.client.ts`:

1. **Client Configuration:**
   - API key from environment
   - Base URL: `https://openrouter.ai/api/v1`
   - Default headers and timeout settings

2. **Vision API Function:**

   ```typescript
   // scanReceiptImage(imageBase64: string, imageType: string): Promise<LLMReceiptScanResult>
   ```

   For now implement as MOCK and return slightly random list of ingredients based on seed data.
   Add TODO with description of what needs to be done.

3. **Text Completion Function:**

   ```typescript
   // generateSubstitutions(context: SubstitutionContext, ingredients: RecipeIngredientCommand[]): Promise<IngredientAnalysisDTO[]>
   ```

   For now implement as MOCK and return up to 5 substitutions based on seed data.
   Add TODO with description of what needs to be done.

4. **Error Handling:**
   - Map OpenRouter errors to `ExternalServiceError`
   - Implement timeout handling
   - Retry logic for transient failures

### Phase 2: Receipt Scanning Endpoint

#### Step 2.1: Create Route Handler

Create `src/app/api/ai/scan-receipt/route.ts`:

```typescript
export async function POST(request: NextRequest): Promise<NextResponse<ReceiptScanResponseDTO | ErrorResponseDTO>>;
```

**Implementation Flow:**

1. Parse JSON body (handle parse errors)
2. Validate with `receiptScanSchema`
3. Authenticate user via Supabase
4. Check rate limit (return 429 if exceeded)
5. Call `scanReceiptWithLLM()` service function
6. Match extracted items to `product_catalog`
7. Suggest units based on product defaults or LLM hints
8. Increment usage counter
9. Return response with items and usage

#### Step 2.2: Implement Product Matching

Add to `ai.service.ts`:

```typescript
// matchProductByName(supabase, name: string): Promise<ReceiptMatchedProductDTO | null>
// Uses full-text search with Polish configuration
// Falls back to ILIKE pattern matching
```

#### Step 2.3: Implement Unit Suggestion

Add to `ai.service.ts`:

```typescript
// suggestUnitForItem(supabase, productId: number | null, llmHint: string | null): Promise<UnitBriefDTO | null>
// Uses product's default_unit_id if matched
// Falls back to unit name matching from LLM hint
```

### Phase 3: Substitutions Endpoint

#### Step 3.1: Create Route Handler

Create `src/app/api/ai/substitutions/route.ts`:

```typescript
export async function POST(request: NextRequest): Promise<NextResponse<SubstitutionsResponseDTO | ErrorResponseDTO>>;
```

**Implementation Flow:**

1. Parse JSON body
2. Validate with `substitutionsSchema`
3. Authenticate user
4. Verify onboarding status (return 403 if pending)
5. Check rate limit (return 429 if exceeded)
6. Fetch user's inventory and profile in parallel
7. Pre-match ingredients to inventory (fuzzy matching)
8. Build AI context with inventory, allergies, diets, equipment
9. Call `generateSubstitutions()` OpenRouter function
10. Generate warnings from allergy/diet conflicts
11. Increment usage counter
12. Return analysis with warnings and usage

#### Step 3.2: Implement Ingredient Matching

Add to `ai.service.ts`:

```typescript
// matchIngredientToInventory(ingredients: RecipeIngredientCommand[], inventory: InventoryItemDTO[]): Map<string, MatchedInventoryItemDTO | null>
// Fuzzy string matching (Levenshtein distance or similar)
// Consider quantity comparison for partial matches
```

#### Step 3.3: Implement Warning Generation

Add to `ai.service.ts`:

```typescript
// generateWarnings(ingredients: RecipeIngredientCommand[], profile: ProfileDTO): SubstitutionWarningDTO[]
// Check for known allergens in ingredient names
// Check for diet conflicts (e.g., meat for vegetarian)
```

### Phase 4: Usage Endpoint

#### Step 4.1: Create Route Handler

Create `src/app/api/ai/usage/route.ts`:

```typescript
export async function GET(request: NextRequest): Promise<NextResponse<AIUsageDTO | ErrorResponseDTO>>;
```

**Implementation Flow:**

1. Authenticate user
2. Fetch rate limits from `system_config`
3. Fetch today's usage from `ai_usage_log`
4. Calculate remaining for each feature
5. Return formatted response

### Phase 5: Testing & Validation

#### Step 5.1: Unit Tests

Create tests for:

- Zod schema validation (valid and invalid inputs)
- Rate limit logic (edge cases: first use, at limit, over limit)
- Product matching (exact match, fuzzy match, no match)
- Base64 validation and size estimation

#### Step 5.2: Integration Tests

Create tests for:

- Full endpoint flows with mocked LLM responses
- Authentication and authorization checks
- Rate limit enforcement
- Error response formats

#### Step 5.3: Manual Testing

Test scenarios:

- Upload various receipt images (clear, blurry, rotated)
- Test with different image formats
- Verify rate limits reset at midnight
- Test substitutions with various inventory states
- Verify allergy/diet warnings appear correctly

### Phase 6: Documentation & Cleanup

#### Step 6.1: Add JSDoc Comments

Document all public functions with:

- Description
- @param tags with types and descriptions
- @returns tag with return type
- @throws tag for error conditions
- @example where helpful

#### Step 6.2: Update API Documentation

Update `.ai/api-plan.md` with any implementation deviations or clarifications.

---

## 10. File Structure

After implementation, the following files will be created/modified:

```
src/
├── app/
│   └── api/
│       └── ai/
│           ├── scan-receipt/
│           │   └── route.ts          # POST handler
│           ├── substitutions/
│           │   └── route.ts          # POST handler
│           └── usage/
│               └── route.ts          # GET handler
├── lib/
│   └── services/
│       ├── ai.service.ts             # Core AI business logic
│       └── openrouter.client.ts      # OpenRouter API client
└── types.ts                          # (existing, no changes needed)
```

---

## 11. Environment Variables

Ensure these environment variables are configured:

```env
# OpenRouter AI Configuration
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_VISION_MODEL=google/gemini-pro-vision
OPENROUTER_TEXT_MODEL=openai/gpt-4-turbo

# Optional: Override default rate limits
AI_RECEIPT_SCANS_PER_DAY=5
AI_SUBSTITUTIONS_PER_DAY=10
```

---

## 12. Dependencies

No new npm dependencies required. Uses:

- `zod` - Already installed for validation
- `next` - Route handlers
- Native `fetch` - OpenRouter API calls

---

## 13. Migration Considerations

The implementation relies on existing database schema:

- `ai_usage_log` table with `(user_id, usage_date)` composite primary key
- `system_config` table with `rate_limits` key
- `product_catalog` with `search_vector` for full-text search
- `profiles` with `onboarding_status` for authorization

Ensure seed data includes:

```sql
INSERT INTO system_config (key, value, description)
VALUES (
  'rate_limits',
  '{"receipt_scans_per_day": 5, "substitutions_per_day": 10}',
  'Daily rate limits for AI features'
) ON CONFLICT (key) DO NOTHING;
```
