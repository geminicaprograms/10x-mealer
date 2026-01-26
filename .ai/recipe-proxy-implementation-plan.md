# API Endpoint Implementation Plan: Recipe Proxy

## 1. Endpoint Overview

The Recipe Proxy feature consists of two endpoints that enable users to parse recipe ingredients from external sources:

1. **POST /api/recipes/parse** - Fetches a recipe from an external URL and extracts ingredients using AI. Acts as a server-side proxy to bypass CORS restrictions when scraping recipe websites.

2. **POST /api/recipes/parse-text** - Parses raw recipe text (copy-pasted ingredients) to extract structured ingredient data. Serves as a fallback when URL parsing fails or is unavailable.

Both endpoints use AI/LLM capabilities to intelligently parse Polish recipe ingredients, extracting product names, quantities, and units from unstructured text.

---

## 2. Request Details

### 2.1 POST /api/recipes/parse

- **HTTP Method:** POST
- **URL Structure:** `/api/recipes/parse`
- **Content-Type:** `application/json`
- **Authentication:** Required (Supabase session cookie or Bearer token)

**Parameters:**

| Parameter | Type   | Required | Constraints                      | Description                     |
| --------- | ------ | -------- | -------------------------------- | ------------------------------- |
| url       | string | Yes      | Valid URL format, allowed domain | URL of the recipe page to parse |

**Request Body Example:**

```json
{
  "url": "https://www.kwestiasmaku.com/przepis/123"
}
```

### 2.2 POST /api/recipes/parse-text

- **HTTP Method:** POST
- **URL Structure:** `/api/recipes/parse-text`
- **Content-Type:** `application/json`
- **Authentication:** Required (Supabase session cookie or Bearer token)

**Parameters:**

| Parameter | Type   | Required | Constraints                      | Description              |
| --------- | ------ | -------- | -------------------------------- | ------------------------ |
| text      | string | Yes      | Non-empty, max 10,000 characters | Raw recipe text to parse |

**Request Body Example:**

```json
{
  "text": "Składniki:\n- 500g filetu z kurczaka\n- 200 ml śmietany 30%\n- 2 cebule\n- sól i pieprz do smaku"
}
```

---

## 3. Used Types

### 3.1 Existing Types (from `src/types.ts`)

```typescript
/** Request payload for POST /api/recipes/parse */
export interface RecipeParseCommand {
  url: string;
}

/** Single parsed ingredient from recipe */
export interface ParsedIngredientDTO {
  name: string;
  quantity: number | null;
  unit: string | null;
  original_text: string;
  is_staple?: boolean;
}

/** Response for POST /api/recipes/parse */
export interface RecipeParseResponseDTO {
  title: string;
  source_url: string;
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}

/** Request payload for POST /api/recipes/parse-text */
export interface RecipeParseTextCommand {
  text: string;
}

/** Response for POST /api/recipes/parse-text */
export interface RecipeParseTextResponseDTO {
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}
```

### 3.2 New Internal Types (to be added to `recipe.service.ts`)

```typescript
/** Result of URL fetch operation */
export interface FetchedContent {
  html: string;
  title: string;
  contentLength: number;
}

/** LLM response for recipe parsing */
export interface LLMRecipeParseResult {
  title: string;
  ingredients: ParsedIngredientDTO[];
  confidence: number;
}

/** LLM response for text parsing */
export interface LLMTextParseResult {
  ingredients: ParsedIngredientDTO[];
  confidence: number;
}

/** Domain allowlist entry */
export interface AllowedDomain {
  domain: string;
  selectors?: {
    title?: string;
    ingredients?: string;
  };
}
```

---

## 4. Response Details

### 4.1 POST /api/recipes/parse

**Success Response (200 OK):**

```json
{
  "title": "Kurczak w sosie śmietanowym",
  "source_url": "https://www.kwestiasmaku.com/przepis/123",
  "ingredients": [
    {
      "name": "filet z kurczaka",
      "quantity": 500,
      "unit": "g",
      "original_text": "500g filetu z kurczaka"
    },
    {
      "name": "śmietana 30%",
      "quantity": 200,
      "unit": "ml",
      "original_text": "200 ml śmietany 30%"
    }
  ],
  "parsing_confidence": 0.88
}
```

**Error Responses:**

| Status | Code                   | Description                              |
| ------ | ---------------------- | ---------------------------------------- |
| 400    | VALIDATION_ERROR       | Invalid URL format                       |
| 401    | UNAUTHORIZED           | User not authenticated                   |
| 403    | FORBIDDEN              | Domain not in allowlist                  |
| 404    | NOT_FOUND              | Recipe page not found (HTTP 404)         |
| 422    | VALIDATION_ERROR       | Could not extract ingredients from page  |
| 502    | EXTERNAL_SERVICE_ERROR | Failed to fetch external URL or LLM fail |

### 4.2 POST /api/recipes/parse-text

**Success Response (200 OK):**

```json
{
  "ingredients": [
    {
      "name": "filet z kurczaka",
      "quantity": 500,
      "unit": "g",
      "original_text": "500g filetu z kurczaka"
    },
    {
      "name": "śmietana 30%",
      "quantity": 200,
      "unit": "ml",
      "original_text": "200 ml śmietany 30%"
    },
    {
      "name": "cebula",
      "quantity": 2,
      "unit": "szt.",
      "original_text": "2 cebule"
    },
    {
      "name": "sól",
      "quantity": null,
      "unit": null,
      "original_text": "sól i pieprz do smaku",
      "is_staple": true
    }
  ],
  "parsing_confidence": 0.82
}
```

**Error Responses:**

| Status | Code                   | Description                             |
| ------ | ---------------------- | --------------------------------------- |
| 400    | VALIDATION_ERROR       | Empty text or exceeds character limit   |
| 401    | UNAUTHORIZED           | User not authenticated                  |
| 422    | VALIDATION_ERROR       | Could not extract ingredients from text |
| 502    | EXTERNAL_SERVICE_ERROR | LLM parsing service failed              |

---

## 5. Data Flow

### 5.1 POST /api/recipes/parse Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Request                                 │
│                    POST /api/recipes/parse { url: "..." }                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           1. Parse JSON Body                                │
│                     Return 400 if invalid JSON                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        2. Validate with Zod Schema                          │
│               - URL format validation                                       │
│               Return 400 if validation fails                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3. Authenticate User                                 │
│               - Verify Supabase session                                     │
│               Return 401 if not authenticated                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     4. Validate Domain Allowlist                            │
│               - Check URL against allowed domains                           │
│               - Check for SSRF patterns (localhost, private IPs)            │
│               Return 403 if domain not allowed                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      5. Fetch External Content                              │
│               - Make HTTP GET request to URL                                │
│               - Enforce timeout (10s)                                       │
│               - Enforce max content size (5MB)                              │
│               Return 404 if page not found                                  │
│               Return 502 if fetch fails                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     6. Extract Content from HTML                            │
│               - Parse HTML to extract recipe content                        │
│               - Use domain-specific selectors if available                  │
│               - Extract title and ingredient sections                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    7. Parse Ingredients with LLM                            │
│               - Send extracted content to OpenRouter                        │
│               - Parse Polish ingredients to structured format               │
│               Return 422 if no ingredients extracted                        │
│               Return 502 if LLM fails                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         8. Return Response                                  │
│               - RecipeParseResponseDTO with 200 OK                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 POST /api/recipes/parse-text Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Request                                 │
│                POST /api/recipes/parse-text { text: "..." }                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           1. Parse JSON Body                                │
│                     Return 400 if invalid JSON                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        2. Validate with Zod Schema                          │
│               - Non-empty text                                              │
│               - Max 10,000 characters                                       │
│               Return 400 if validation fails                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3. Authenticate User                                 │
│               - Verify Supabase session                                     │
│               Return 401 if not authenticated                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    4. Parse Ingredients with LLM                            │
│               - Send raw text to OpenRouter                                 │
│               - Parse Polish ingredients to structured format               │
│               - Identify staples (salt, pepper, etc.)                       │
│               Return 422 if no ingredients extracted                        │
│               Return 502 if LLM fails                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         5. Return Response                                  │
│               - RecipeParseTextResponseDTO with 200 OK                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Considerations

### 6.1 SSRF (Server-Side Request Forgery) Protection

**Critical**: The URL parsing endpoint must prevent SSRF attacks.

**Implementation:**

1. **Domain Allowlist** - Only allow requests to whitelisted recipe domains:

   ```typescript
   const ALLOWED_DOMAINS = [
     "kwestiasmaku.com",
     "www.kwestiasmaku.com",
     "przepisy.pl",
     "www.przepisy.pl",
     "aniagotuje.pl",
     "www.aniagotuje.pl",
     "kuchnialidla.pl",
     "www.kuchnialidla.pl",
     "mojegotowanie.pl",
     "www.mojegotowanie.pl",
   ];
   ```

2. **Block Private IP Ranges** - Reject URLs resolving to:
   - `127.0.0.0/8` (localhost)
   - `10.0.0.0/8` (private)
   - `172.16.0.0/12` (private)
   - `192.168.0.0/16` (private)
   - `169.254.0.0/16` (link-local)
   - `::1` (IPv6 localhost)

3. **URL Validation**:
   - Must use `https://` protocol only
   - Must be valid URL format
   - No URL with embedded credentials

### 6.2 Authentication

- Both endpoints require authenticated users via Supabase session
- Validate session using `supabase.auth.getUser()`
- Return 401 for unauthenticated requests

### 6.3 Input Validation

- URL format validation using Zod schema with URL refinement
- Text length limits (max 10,000 characters)
- Sanitize extracted HTML content before LLM processing

### 6.4 Resource Limits

| Resource              | Limit  | Purpose                     |
| --------------------- | ------ | --------------------------- |
| HTTP request timeout  | 10s    | Prevent hanging connections |
| Max HTML content size | 5MB    | Prevent memory exhaustion   |
| Max text input        | 10,000 | Limit LLM input size        |
| Max ingredients       | 50     | Reasonable recipe limit     |

### 6.5 Rate Limiting (Future Consideration)

Consider implementing rate limiting similar to AI features:

- Daily limit per user for URL parsing
- Prevents abuse of external fetching

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

### 7.2 Error Scenarios and Responses

| Scenario                | Status | Code                   | Message                                          |
| ----------------------- | ------ | ---------------------- | ------------------------------------------------ |
| Invalid JSON body       | 400    | VALIDATION_ERROR       | "Invalid JSON in request body"                   |
| Missing URL field       | 400    | VALIDATION_ERROR       | "Validation failed" + details                    |
| Invalid URL format      | 400    | VALIDATION_ERROR       | "Invalid URL format"                             |
| Empty text              | 400    | VALIDATION_ERROR       | "Text is required"                               |
| Text too long           | 400    | VALIDATION_ERROR       | "Text exceeds 10,000 character limit"            |
| Not authenticated       | 401    | UNAUTHORIZED           | "Authentication required"                        |
| Domain not allowed      | 403    | FORBIDDEN              | "Domain not supported for recipe parsing"        |
| Recipe page not found   | 404    | NOT_FOUND              | "Recipe page not found"                          |
| No ingredients found    | 422    | VALIDATION_ERROR       | "Could not extract ingredients from content"     |
| Failed to fetch URL     | 502    | EXTERNAL_SERVICE_ERROR | "Failed to fetch recipe page"                    |
| LLM service unavailable | 502    | EXTERNAL_SERVICE_ERROR | "Recipe parsing service temporarily unavailable" |
| Unexpected error        | 500    | INTERNAL_ERROR         | "An unexpected error occurred"                   |

### 7.3 Error Logging

Log errors to console with context for debugging:

```typescript
console.error("Recipe parse error:", {
  endpoint: "/api/recipes/parse",
  url: requestUrl,
  userId: user.id,
  error: error.message,
  stack: error.stack,
});
```

---

## 8. Performance Considerations

### 8.1 Potential Bottlenecks

1. **External HTTP Fetch** - Network latency to recipe websites
2. **LLM API Call** - OpenRouter response time (1-5 seconds typical)
3. **HTML Parsing** - Large HTML documents may be slow to process

### 8.2 Optimization Strategies

1. **Timeouts**:
   - External fetch: 10 seconds
   - LLM call: 30 seconds

2. **Content Streaming**:
   - Don't load entire HTML into memory
   - Stream and abort if size limit exceeded

3. **Caching (Future Enhancement)**:
   - Cache parsed recipes by URL (with TTL)
   - Reduces repeated fetches for same recipes

4. **Efficient HTML Parsing**:
   - Extract only relevant sections (ingredients, title)
   - Use fast HTML parser (cheerio or node-html-parser)

5. **LLM Prompt Optimization**:
   - Send only relevant extracted text, not full HTML
   - Use structured output format to reduce token usage

### 8.3 Expected Performance

| Operation        | Expected Time |
| ---------------- | ------------- |
| URL validation   | < 10ms        |
| External fetch   | 500ms - 3s    |
| HTML parsing     | 50ms - 200ms  |
| LLM parsing      | 1s - 5s       |
| **Total (URL)**  | **2s - 8s**   |
| **Total (Text)** | **1s - 5s**   |

---

## 9. Implementation Steps

### Step 1: Create Recipe Service (`src/lib/services/recipe.service.ts`)

Create the service module with:

1. **Constants**:
   - `ALLOWED_DOMAINS` array with supported recipe websites
   - `MAX_TEXT_LENGTH = 10000`
   - `MAX_HTML_SIZE = 5 * 1024 * 1024` (5MB)
   - `FETCH_TIMEOUT = 10000` (10 seconds)

2. **Zod Schemas**:

   ```typescript
   export const recipeParseSchema = z.object({
     url: z
       .string()
       .url("Invalid URL format")
       .refine((url) => url.startsWith("https://"), {
         message: "Only HTTPS URLs are allowed",
       })
       .refine((url) => isAllowedDomain(url), {
         message: "Domain not supported for recipe parsing",
       }),
   });

   export const recipeParseTextSchema = z.object({
     text: z
       .string()
       .min(1, "Text is required")
       .max(MAX_TEXT_LENGTH, `Text exceeds ${MAX_TEXT_LENGTH} character limit`)
       .transform((val) => val.trim()),
   });
   ```

3. **Domain Validation Functions**:
   - `isAllowedDomain(url: string): boolean`
   - `isPrivateIP(hostname: string): boolean`
   - `validateUrlSecurity(url: string): { valid: boolean; error?: string }`

4. **HTML Fetching Function**:

   ```typescript
   export async function fetchRecipeContent(url: string): Promise<FetchedContent>;
   ```

   - Uses native `fetch` with AbortController for timeout
   - Checks Content-Length header
   - Handles 404 and other HTTP errors
   - Returns extracted HTML content

5. **HTML Content Extraction**:
   ```typescript
   export function extractRecipeContent(html: string, domain: string): string;
   ```

   - Uses cheerio or similar for HTML parsing
   - Domain-specific selectors for better extraction
   - Falls back to generic extraction if no selectors

### Step 2: Extend OpenRouter Client (`src/lib/services/openrouter.client.ts`)

Add new functions:

1. **parseRecipeFromHTML**:

   ```typescript
   export async function parseRecipeFromHTML(content: string, pageTitle: string): Promise<LLMRecipeParseResult>;
   ```

   - Sends extracted recipe content to LLM
   - Uses structured output format for ingredients
   - Returns title, ingredients array, and confidence score
   - For now implement as MOCK and return slightly random title and list of ingredients based on seed data.
     Add TODO with description of what needs to be done.

2. **parseRecipeFromText**:

   ```typescript
   export async function parseRecipeFromText(text: string): Promise<LLMTextParseResult>;
   ```

   - Parses raw text input
   - Identifies staple ingredients (salt, pepper, etc.)
   - Returns ingredients array and confidence score
   - For now implement as MOCK and return slightly random title and list of ingredients based on seed data.
     Add TODO with description of what needs to be done.

3. **LLM Prompt Design**:
   - Polish language context
   - Extract: name, quantity, unit, original text
   - Identify common Polish units (g, kg, ml, l, szt., łyżka, szklanka)
   - Mark staples where appropriate

### Step 3: Create API Route Handler for URL Parsing

**File:** `src/app/api/recipes/parse/route.ts`

```typescript
export async function POST(request: NextRequest): Promise<NextResponse<RecipeParseResponseDTO | ErrorResponseDTO>>;
```

Implementation:

1. Parse JSON body
2. Validate with `recipeParseSchema`
3. Authenticate user via Supabase
4. Validate URL security (domain + SSRF checks)
5. Fetch external content
6. Extract recipe content from HTML
7. Parse ingredients with LLM
8. Return `RecipeParseResponseDTO`

### Step 4: Create API Route Handler for Text Parsing

**File:** `src/app/api/recipes/parse-text/route.ts`

```typescript
export async function POST(request: NextRequest): Promise<NextResponse<RecipeParseTextResponseDTO | ErrorResponseDTO>>;
```

Implementation:

1. Parse JSON body
2. Validate with `recipeParseTextSchema`
3. Authenticate user via Supabase
4. Parse ingredients with LLM
5. Return `RecipeParseTextResponseDTO`

### Step 5: Add Dependencies

Install required packages:

```bash
pnpm add cheerio
pnpm add -D @types/cheerio
```

Note: `cheerio` is used for HTML parsing (lightweight, no DOM required).

### Step 6: Add Configuration (Optional)

Add environment variables to `.env.local`:

```env
# Recipe Parsing Configuration (optional overrides)
RECIPE_FETCH_TIMEOUT=10000
RECIPE_MAX_HTML_SIZE=5242880
```

Add to system_config table (optional for runtime configuration):

```sql
INSERT INTO system_config (key, value, description)
VALUES (
  'recipe_allowed_domains',
  '["kwestiasmaku.com", "przepisy.pl", "aniagotuje.pl"]',
  'Allowed domains for recipe URL parsing'
);
```

### Step 7: Write Tests

Create test file: `scripts/test-recipe-endpoints.sh` or integrate into existing test script.

Test cases:

1. Valid URL from allowed domain
2. Invalid URL format
3. URL from non-allowed domain
4. Unauthenticated request
5. 404 response from recipe site
6. Valid text parsing
7. Empty text
8. Text exceeding limit
9. Text with no recognizable ingredients

### Step 8: Update Test Script

Add to `scripts/test-ai-endpoints.sh`:

```bash
# Test recipe parsing endpoints
echo "Testing POST /api/recipes/parse..."
curl -X POST "$BASE_URL/api/recipes/parse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url": "https://www.kwestiasmaku.com/example"}'

echo "Testing POST /api/recipes/parse-text..."
curl -X POST "$BASE_URL/api/recipes/parse-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text": "500g kurczaka\n200ml śmietany"}'
```

---

## 10. File Structure Summary

```
src/
├── app/
│   └── api/
│       └── recipes/
│           ├── parse/
│           │   └── route.ts          # URL parsing endpoint
│           └── parse-text/
│               └── route.ts          # Text parsing endpoint
├── lib/
│   └── services/
│       ├── recipe.service.ts         # NEW: Recipe parsing service
│       └── openrouter.client.ts      # EXTEND: Add recipe parsing functions
└── types.ts                          # Existing types (no changes needed)
```

---

## 11. Checklist

- [ ] Create `src/lib/services/recipe.service.ts` with validation and fetching logic
- [ ] Extend `src/lib/services/openrouter.client.ts` with recipe parsing functions
- [ ] Create `src/app/api/recipes/parse/route.ts` endpoint
- [ ] Create `src/app/api/recipes/parse-text/route.ts` endpoint
- [ ] Install `cheerio` dependency for HTML parsing
- [ ] Add test cases to test script
- [ ] Test all error scenarios
- [ ] Verify SSRF protection works correctly
- [ ] Document supported recipe domains
