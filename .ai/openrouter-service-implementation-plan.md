# OpenRouter Service Implementation Plan

This document provides a comprehensive implementation plan for replacing the current mock OpenRouter client with a fully functional integration to the OpenRouter.ai API.

---

## 1. Service Description

The OpenRouter service (`src/lib/services/openrouter.client.ts`) is responsible for interacting with the OpenRouter.ai API to provide AI-powered features in the Mealer application:

1. **Receipt Scanning** - Uses vision-capable LLMs to extract product items from receipt images
2. **Ingredient Substitutions** - Generates intelligent substitution suggestions based on user's inventory and preferences
3. **Recipe Parsing** - Extracts ingredients from HTML content or raw text using text completion models

The service abstracts multiple LLM providers (OpenAI, Anthropic, Google) behind a single API, enabling cost optimization and avoiding vendor lock-in.

### Key Responsibilities

- Managing API authentication and request configuration
- Constructing properly formatted messages (system, user, vision content)
- Handling structured JSON responses via `response_format`
- Implementing retry logic with exponential backoff
- Error handling and mapping to application-specific error types
- Timeout management for different operation types

---

## 2. Constructor Description

The OpenRouter service uses a functional module pattern (not a class) to align with the existing codebase conventions. Configuration is managed through a centralized config object.

### Configuration Object

```typescript
interface OpenRouterConfig {
  /** API key for OpenRouter authentication */
  apiKey: string;

  /** Base URL for OpenRouter API */
  baseUrl: string;

  /** Model identifier for vision tasks (receipt scanning) */
  visionModel: string;

  /** Model identifier for text completion tasks */
  textModel: string;

  /** Timeout for vision API calls in milliseconds */
  visionTimeout: number;

  /** Timeout for text completion calls in milliseconds */
  textTimeout: number;

  /** Maximum retry attempts for transient failures */
  maxRetries: number;

  /** Base delay for exponential backoff in milliseconds */
  baseRetryDelay: number;

  /** Application site URL for OpenRouter headers */
  siteUrl: string;

  /** Application name for OpenRouter headers */
  siteName: string;
}
```

### Configuration Initialization

```typescript
const OPENROUTER_CONFIG: OpenRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  baseUrl: "https://openrouter.ai/api/v1",
  visionModel: process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-2.0-flash-001",
  textModel: process.env.OPENROUTER_TEXT_MODEL ?? "openai/gpt-4o-mini",
  visionTimeout: 30000,
  textTimeout: 15000,
  maxRetries: 3,
  baseRetryDelay: 1000,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://mealer.app",
  siteName: "Mealer",
};
```

---

## 3. Public Methods and Fields

### 3.1 Receipt Scanning

```typescript
/**
 * Scans a receipt image using a vision-capable LLM to extract product items.
 *
 * @param imageBase64 - Base64 encoded image data (may include data URL prefix)
 * @param imageType - MIME type of the image (e.g., "image/jpeg")
 * @returns Promise resolving to extracted receipt items with confidence scores
 * @throws ExternalServiceError if the API call fails after retries
 *
 * @example
 * const result = await scanReceiptImage(base64Image, "image/jpeg");
 * console.log(result.items); // [{ name: "Mleko", quantity: 1, unit: "l", confidence: 0.95 }]
 */
export async function scanReceiptImage(imageBase64: string, imageType: string): Promise<LLMReceiptScanResult>;
```

### 3.2 Ingredient Substitutions

```typescript
/**
 * Generates ingredient substitution suggestions using AI.
 *
 * @param context - User context including inventory, allergies, diets, and equipment
 * @param ingredients - Recipe ingredients to analyze
 * @returns Promise resolving to analysis for each ingredient
 * @throws ExternalServiceError if the API call fails after retries
 *
 * @example
 * const analysis = await generateSubstitutions(userContext, ingredients);
 * console.log(analysis[0].substitution?.suggestion);
 */
export async function generateSubstitutions(
  context: SubstitutionContext,
  ingredients: RecipeIngredientCommand[]
): Promise<IngredientAnalysisDTO[]>;
```

### 3.3 Recipe Parsing from HTML

```typescript
/**
 * Parses recipe ingredients from HTML content using AI.
 *
 * @param content - Extracted text content from the recipe page
 * @param pageTitle - Title of the recipe page
 * @returns Promise resolving to parsed recipe with ingredients
 * @throws ExternalServiceError if the API call fails after retries
 *
 * @example
 * const recipe = await parseRecipeFromHTML(htmlContent, "Kurczak w sosie");
 * console.log(recipe.ingredients);
 */
export async function parseRecipeFromHTML(content: string, pageTitle: string): Promise<LLMRecipeParseResult>;
```

### 3.4 Recipe Parsing from Text

```typescript
/**
 * Parses recipe ingredients from raw text using AI.
 *
 * @param text - Raw recipe text (e.g., copy-pasted ingredient list)
 * @returns Promise resolving to parsed ingredients
 * @throws ExternalServiceError if the API call fails after retries
 *
 * @example
 * const result = await parseRecipeFromText("500g kurczaka\n200ml śmietany");
 * console.log(result.ingredients);
 */
export async function parseRecipeFromText(text: string): Promise<LLMTextParseResult>;
```

### 3.5 Exported Types

```typescript
/** Single item extracted from a receipt */
export interface LLMReceiptItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  confidence: number;
}

/** Complete result from receipt scanning */
export interface LLMReceiptScanResult {
  items: LLMReceiptItem[];
  raw_text?: string;
}

/** Custom error for external service failures */
export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "ExternalServiceError";
  }
}
```

---

## 4. Private Methods and Fields

### 4.1 Core API Request Function

```typescript
/**
 * Makes a request to the OpenRouter Chat Completions API.
 *
 * @param params - Request parameters
 * @returns Promise resolving to the API response
 * @throws ExternalServiceError on failure
 */
async function makeOpenRouterRequest<T>(params: {
  model: string;
  messages: OpenRouterMessage[];
  responseFormat?: OpenRouterResponseFormat;
  maxTokens?: number;
  temperature?: number;
  timeout: number;
}): Promise<T>;
```

### 4.2 Retry Logic

```typescript
/**
 * Executes a function with retry logic and exponential backoff.
 *
 * @param fn - Async function to execute
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay between retries in ms
 * @returns Promise resolving to the function result
 * @throws Last error if all retries fail
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries: number, baseDelay: number): Promise<T>;
```

### 4.3 Message Construction Helpers

```typescript
/**
 * Creates a system message for the LLM.
 */
function createSystemMessage(content: string): OpenRouterMessage;

/**
 * Creates a user message with text content.
 */
function createUserMessage(content: string): OpenRouterMessage;

/**
 * Creates a user message with vision content (text + image).
 */
function createVisionMessage(text: string, imageBase64: string, imageType: string): OpenRouterMessage;
```

### 4.4 Response Format Builders

```typescript
/**
 * Creates a response_format object for structured JSON output.
 *
 * @param name - Schema name identifier
 * @param schema - JSON schema object
 * @returns OpenRouter response_format configuration
 */
function createResponseFormat(name: string, schema: JSONSchema): OpenRouterResponseFormat;
```

### 4.5 Prompt Templates

```typescript
/** System prompts for different AI tasks */
const SYSTEM_PROMPTS = {
  receiptScan: string;
  substitutions: string;
  recipeParseHTML: string;
  recipeParseText: string;
};

/** JSON schemas for structured responses */
const RESPONSE_SCHEMAS = {
  receiptScan: JSONSchema;
  substitutions: JSONSchema;
  recipeParse: JSONSchema;
  textParse: JSONSchema;
};
```

### 4.6 Internal Types

```typescript
/** OpenRouter API message format */
interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenRouterContentPart[];
}

/** Content part for multimodal messages */
interface OpenRouterContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

/** Response format configuration */
interface OpenRouterResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: JSONSchema;
  };
}

/** OpenRouter API response */
interface OpenRouterChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

---

## 5. Error Handling

### 5.1 Error Categories

| Category                | HTTP Status     | Handling Strategy                    |
| ----------------------- | --------------- | ------------------------------------ |
| **Authentication**      | 401, 403        | Throw immediately, log API key issue |
| **Rate Limiting**       | 429             | Retry with exponential backoff       |
| **Server Errors**       | 500, 502, 503   | Retry with exponential backoff       |
| **Timeout**             | -               | Retry once, then throw               |
| **Invalid Response**    | 200 (malformed) | Throw with parsing context           |
| **Model Not Available** | 400             | Throw with model info                |
| **Content Filtered**    | 400             | Throw, return to user                |
| **Network Errors**      | -               | Retry with exponential backoff       |

### 5.2 Error Response Handling

```typescript
/**
 * Maps OpenRouter API errors to ExternalServiceError.
 */
function handleOpenRouterError(response: Response, body: unknown): ExternalServiceError {
  const status = response.status;

  // Authentication errors
  if (status === 401 || status === 403) {
    console.error("OpenRouter authentication failed - check API key");
    return new ExternalServiceError("AI service authentication failed", status);
  }

  // Rate limiting
  if (status === 429) {
    return new ExternalServiceError("AI service rate limit exceeded", status);
  }

  // Server errors
  if (status >= 500) {
    return new ExternalServiceError("AI service temporarily unavailable", status);
  }

  // Client errors
  return new ExternalServiceError("AI service request failed", status, body);
}
```

### 5.3 Retry Strategy

```typescript
const RETRYABLE_ERRORS = [429, 500, 502, 503, 504];

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = OPENROUTER_CONFIG.maxRetries,
  baseDelay: number = OPENROUTER_CONFIG.baseRetryDelay
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable =
        error instanceof ExternalServiceError && error.statusCode && RETRYABLE_ERRORS.includes(error.statusCode);

      // Don't retry non-retryable errors or if we've exhausted retries
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### 5.4 Response Validation

````typescript
/**
 * Validates and parses LLM response content.
 * Handles common issues like markdown code blocks in JSON responses.
 */
function parseStructuredResponse<T>(content: string, context: string): T {
  // Remove potential markdown code blocks
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error(`Failed to parse ${context} response:`, {
      content: content.substring(0, 500),
      error,
    });
    throw new ExternalServiceError(`Invalid response format from AI service (${context})`, undefined, error);
  }
}
````

---

## 6. Security Considerations

### 6.1 API Key Management

- **Environment Variable**: Store `OPENROUTER_API_KEY` in `.env.local`, never in code
- **Server-Side Only**: Never expose the API key to the client; all OpenRouter calls happen in API routes
- **Key Validation**: Check for API key presence at startup and log warnings

```typescript
if (!OPENROUTER_CONFIG.apiKey) {
  console.warn("OPENROUTER_API_KEY not configured - AI features will use mock data");
}
```

### 6.2 Request Headers

```typescript
const headers = {
  Authorization: `Bearer ${OPENROUTER_CONFIG.apiKey}`,
  "Content-Type": "application/json",
  "HTTP-Referer": OPENROUTER_CONFIG.siteUrl,
  "X-Title": OPENROUTER_CONFIG.siteName,
};
```

### 6.3 Input Sanitization

- **Image Data**: Validate base64 encoding before sending to API
- **Text Content**: Limit text length to prevent token abuse
- **Prompt Injection**: Use separate system/user messages; never interpolate user input into system prompts

```typescript
// Good: User input in user message
const messages = [
  { role: "system", content: SYSTEM_PROMPTS.recipeParseText },
  { role: "user", content: `Parse: ${userText.substring(0, 10000)}` },
];

// Bad: User input in system message
// const systemPrompt = `Parse this: ${userText}`; // NEVER DO THIS
```

### 6.4 Response Handling

- **No PII Logging**: Never log full API responses that may contain user data
- **Sanitize Output**: Validate LLM responses before returning to client
- **Token Limits**: Set `max_tokens` to prevent runaway costs

### 6.5 Rate Limiting

- Application-level rate limiting is handled by `ai.service.ts`
- OpenRouter's rate limiting is handled via retry with backoff
- Log rate limit events for monitoring

---

## 7. Step-by-Step Implementation Plan

### Phase 1: Core Infrastructure

#### Step 1.1: Add Type Definitions

Add internal types to `openrouter.client.ts`:

```typescript
// OpenRouter API Types
interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenRouterContentPart[];
}

interface OpenRouterContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

interface OpenRouterResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  response_format?: OpenRouterResponseFormat;
  max_tokens?: number;
  temperature?: number;
}

interface OpenRouterChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

#### Step 1.2: Implement Core Request Function

```typescript
async function makeOpenRouterRequest(params: {
  model: string;
  messages: OpenRouterMessage[];
  responseFormat?: OpenRouterResponseFormat;
  maxTokens?: number;
  temperature?: number;
  timeout: number;
}): Promise<OpenRouterChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeout);

  try {
    const body: OpenRouterRequestBody = {
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    };

    if (params.responseFormat) {
      body.response_format = params.responseFormat;
    }

    const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_CONFIG.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_CONFIG.siteUrl,
        "X-Title": OPENROUTER_CONFIG.siteName,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw handleOpenRouterError(response, errorBody);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ExternalServiceError("AI service request timed out");
    }
    throw new ExternalServiceError("AI service request failed", undefined, error);
  } finally {
    clearTimeout(timeoutId);
  }
}
```

#### Step 1.3: Implement Retry Logic

```typescript
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = OPENROUTER_CONFIG.maxRetries,
  baseDelay: number = OPENROUTER_CONFIG.baseRetryDelay
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const isRetryable =
        error instanceof ExternalServiceError &&
        error.statusCode !== undefined &&
        RETRYABLE_STATUS_CODES.includes(error.statusCode);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(
        `OpenRouter request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

#### Step 1.4: Implement Response Parsing

````typescript
function parseStructuredResponse<T>(content: string, context: string): T {
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error(`Failed to parse ${context} response:`, {
      contentPreview: content.substring(0, 500),
      error,
    });
    throw new ExternalServiceError(`Invalid response format from AI service (${context})`, undefined, error);
  }
}
````

### Phase 2: Receipt Scanning Implementation

#### Step 2.1: Define Receipt Scanning Schema and Prompt

```typescript
const RECEIPT_SCAN_SYSTEM_PROMPT = `Jesteś ekspertem w analizie paragonów sklepowych. 
Twoim zadaniem jest wyodrębnienie produktów spożywczych z obrazu paragonu.

Dla każdego produktu określ:
- name: nazwa produktu po polsku (ustandaryzowana, np. "Mleko 3.2%", "Chleb pszenny")
- quantity: ilość (liczba, null jeśli nie podano)
- unit: jednostka miary (g, kg, l, ml, szt, null jeśli nie podano)
- confidence: pewność odczytu (0.0-1.0)

Zwróć TYLKO produkty spożywcze. Ignoruj:
- Opakowania zwrotne
- Rabaty i promocje
- Sumy i płatności
- Numery paragonu

Odpowiedz w formacie JSON zgodnym ze schematem.`;

const RECEIPT_SCAN_SCHEMA = {
  type: "object" as const,
  properties: {
    items: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const, description: "Nazwa produktu" },
          quantity: {
            type: ["number", "null"] as const,
            description: "Ilość produktu",
          },
          unit: {
            type: ["string", "null"] as const,
            description: "Jednostka miary",
          },
          confidence: {
            type: "number" as const,
            minimum: 0,
            maximum: 1,
            description: "Pewność odczytu",
          },
        },
        required: ["name", "confidence"],
        additionalProperties: false,
      },
    },
    raw_text: {
      type: "string" as const,
      description: "Odczytany tekst z paragonu (opcjonalnie)",
    },
  },
  required: ["items"],
  additionalProperties: false,
};
```

#### Step 2.2: Implement scanReceiptImage

```typescript
export async function scanReceiptImage(imageBase64: string, imageType: string): Promise<LLMReceiptScanResult> {
  // Check if API key is configured
  if (!OPENROUTER_CONFIG.apiKey) {
    console.warn("OpenRouter API key not configured, using mock data");
    return getMockReceiptScanResult();
  }

  // Prepare image data URL
  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  const imageDataUrl = `data:${imageType};base64,${base64Data}`;

  // Construct messages with vision content
  const messages: OpenRouterMessage[] = [
    {
      role: "system",
      content: RECEIPT_SCAN_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Przeanalizuj ten paragon i wyodrębnij produkty spożywcze:",
        },
        {
          type: "image_url",
          image_url: {
            url: imageDataUrl,
            detail: "high",
          },
        },
      ],
    },
  ];

  // Make API request with retry
  const response = await withRetry(() =>
    makeOpenRouterRequest({
      model: OPENROUTER_CONFIG.visionModel,
      messages,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "receipt_scan_result",
          strict: true,
          schema: RECEIPT_SCAN_SCHEMA,
        },
      },
      maxTokens: 2000,
      temperature: 0.1,
      timeout: OPENROUTER_CONFIG.visionTimeout,
    })
  );

  // Parse and return structured response
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ExternalServiceError("Empty response from AI service");
  }

  return parseStructuredResponse<LLMReceiptScanResult>(content, "receipt_scan");
}
```

### Phase 3: Substitutions Implementation

#### Step 3.1: Define Substitutions Schema and Prompt

```typescript
const SUBSTITUTIONS_SYSTEM_PROMPT = `Jesteś ekspertem kulinarnym specjalizującym się w zamiennikach składników.
Analizujesz składniki przepisu względem dostępnych produktów w spiżarni użytkownika.

Dla każdego składnika określ:
- status: "available" (jest wystarczająca ilość), "partial" (jest ale za mało), "missing" (brak)
- matched_inventory_item: pasujący produkt z inwentarza (jeśli znaleziony)
- substitution: sugestia zamiennika (jeśli potrzebna)
- allergy_warning: ostrzeżenie o alergii (jeśli dotyczy)

Uwzględnij:
- Alergie użytkownika: {allergies}
- Diety użytkownika: {diets}
- Dostępny sprzęt: {equipment}

Sugestie zamienników powinny być praktyczne i dostępne w inwentarzu użytkownika.
Odpowiedz w formacie JSON zgodnym ze schematem.`;

const SUBSTITUTIONS_SCHEMA = {
  type: "object" as const,
  properties: {
    analysis: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          ingredient: { type: "string" as const },
          status: {
            type: "string" as const,
            enum: ["available", "partial", "missing"],
          },
          matched_inventory_item: {
            type: ["object", "null"] as const,
            properties: {
              id: { type: "string" as const },
              name: { type: "string" as const },
              quantity: { type: ["number", "null"] as const },
              unit: { type: ["string", "null"] as const },
            },
            required: ["id", "name"],
            additionalProperties: false,
          },
          substitution: {
            type: ["object", "null"] as const,
            properties: {
              available: { type: "boolean" as const },
              suggestion: { type: "string" as const },
              substitute_item: {
                type: ["object", "null"] as const,
                properties: {
                  id: { type: "string" as const },
                  name: { type: "string" as const },
                  quantity: { type: ["number", "null"] as const },
                  unit: { type: ["string", "null"] as const },
                },
                required: ["id", "name"],
                additionalProperties: false,
              },
            },
            required: ["available", "suggestion"],
            additionalProperties: false,
          },
          allergy_warning: { type: ["string", "null"] as const },
        },
        required: ["ingredient", "status"],
        additionalProperties: false,
      },
    },
  },
  required: ["analysis"],
  additionalProperties: false,
};
```

#### Step 3.2: Implement generateSubstitutions

```typescript
export async function generateSubstitutions(
  context: SubstitutionContext,
  ingredients: RecipeIngredientCommand[]
): Promise<IngredientAnalysisDTO[]> {
  if (!OPENROUTER_CONFIG.apiKey) {
    console.warn("OpenRouter API key not configured, using mock data");
    return getMockSubstitutionsResult(context, ingredients);
  }

  // Build context-aware system prompt
  const systemPrompt = SUBSTITUTIONS_SYSTEM_PROMPT.replace("{allergies}", context.user_allergies.join(", ") || "brak")
    .replace("{diets}", context.user_diets.join(", ") || "brak")
    .replace("{equipment}", context.user_equipment.join(", ") || "standardowy");

  // Format inventory for the prompt
  const inventoryText = context.inventory_items
    .filter((item) => item.is_available)
    .map((item) => {
      const qty = item.quantity ? `${item.quantity}${item.unit || ""}` : "";
      return `- ${item.name}${qty ? ` (${qty})` : ""} [id: ${item.id}]`;
    })
    .join("\n");

  // Format ingredients for the prompt
  const ingredientsText = ingredients
    .map((ing) => {
      const qty = ing.quantity ? `${ing.quantity}` : "";
      const unit = ing.unit || "";
      return `- ${ing.name}${qty ? ` (${qty}${unit})` : ""}`;
    })
    .join("\n");

  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Dostępne produkty w spiżarni:
${inventoryText || "Spiżarnia jest pusta."}

Składniki przepisu do przeanalizowania:
${ingredientsText}

Przeanalizuj każdy składnik i zasugeruj zamienniki jeśli potrzebne.`,
    },
  ];

  const response = await withRetry(() =>
    makeOpenRouterRequest({
      model: OPENROUTER_CONFIG.textModel,
      messages,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "substitutions_analysis",
          strict: true,
          schema: SUBSTITUTIONS_SCHEMA,
        },
      },
      maxTokens: 3000,
      temperature: 0.3,
      timeout: OPENROUTER_CONFIG.textTimeout,
    })
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ExternalServiceError("Empty response from AI service");
  }

  const result = parseStructuredResponse<{ analysis: IngredientAnalysisDTO[] }>(content, "substitutions");

  return result.analysis;
}
```

### Phase 4: Recipe Parsing Implementation

#### Step 4.1: Define Recipe Parsing Schema and Prompts

```typescript
const RECIPE_PARSE_HTML_SYSTEM_PROMPT = `Jesteś ekspertem w parsowaniu przepisów kulinarnych.
Wyodrębnij składniki z podanej treści strony z przepisem.

Dla każdego składnika określ:
- name: ustandaryzowana nazwa składnika po polsku
- quantity: ilość (liczba lub null)
- unit: jednostka (g, kg, ml, l, szt, łyżka, łyżeczka, szklanka, lub null)
- original_text: oryginalny tekst z przepisu
- is_staple: czy to produkt podstawowy (sól, pieprz, olej, itp.)

Rozpoznawaj polskie jednostki miary i ich odmiany przez przypadki.
Odpowiedz w formacie JSON zgodnym ze schematem.`;

const RECIPE_PARSE_TEXT_SYSTEM_PROMPT = `Jesteś ekspertem w parsowaniu list składników.
Przeanalizuj tekst i wyodrębnij składniki przepisu.

Obsługuj różne formaty:
- Listy punktowane
- Listy numerowane  
- Oddzielone przecinkami
- Zwykły tekst

Dla każdego składnika określ:
- name: ustandaryzowana nazwa składnika po polsku
- quantity: ilość (liczba lub null)
- unit: jednostka (g, kg, ml, l, szt, łyżka, łyżeczka, szklanka, lub null)
- original_text: oryginalny tekst
- is_staple: czy to produkt podstawowy

Odpowiedz w formacie JSON zgodnym ze schematem.`;

const RECIPE_PARSE_SCHEMA = {
  type: "object" as const,
  properties: {
    title: { type: "string" as const },
    ingredients: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          quantity: { type: ["number", "null"] as const },
          unit: { type: ["string", "null"] as const },
          original_text: { type: "string" as const },
          is_staple: { type: "boolean" as const },
        },
        required: ["name", "original_text"],
        additionalProperties: false,
      },
    },
    confidence: { type: "number" as const, minimum: 0, maximum: 1 },
  },
  required: ["title", "ingredients", "confidence"],
  additionalProperties: false,
};

const TEXT_PARSE_SCHEMA = {
  type: "object" as const,
  properties: {
    ingredients: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          quantity: { type: ["number", "null"] as const },
          unit: { type: ["string", "null"] as const },
          original_text: { type: "string" as const },
          is_staple: { type: "boolean" as const },
        },
        required: ["name", "original_text"],
        additionalProperties: false,
      },
    },
    confidence: { type: "number" as const, minimum: 0, maximum: 1 },
  },
  required: ["ingredients", "confidence"],
  additionalProperties: false,
};
```

#### Step 4.2: Implement parseRecipeFromHTML

```typescript
export async function parseRecipeFromHTML(content: string, pageTitle: string): Promise<LLMRecipeParseResult> {
  if (!OPENROUTER_CONFIG.apiKey) {
    console.warn("OpenRouter API key not configured, using mock data");
    return getMockRecipeParseResult(pageTitle);
  }

  // Truncate content to avoid token limits
  const truncatedContent = content.substring(0, 15000);

  const messages: OpenRouterMessage[] = [
    { role: "system", content: RECIPE_PARSE_HTML_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Tytuł strony: ${pageTitle}

Treść strony z przepisem:
${truncatedContent}

Wyodrębnij tytuł przepisu i wszystkie składniki.`,
    },
  ];

  const response = await withRetry(() =>
    makeOpenRouterRequest({
      model: OPENROUTER_CONFIG.textModel,
      messages,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "recipe_parse_result",
          strict: true,
          schema: RECIPE_PARSE_SCHEMA,
        },
      },
      maxTokens: 2000,
      temperature: 0.2,
      timeout: OPENROUTER_CONFIG.textTimeout,
    })
  );

  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) {
    throw new ExternalServiceError("Empty response from AI service");
  }

  return parseStructuredResponse<LLMRecipeParseResult>(responseContent, "recipe_parse");
}
```

#### Step 4.3: Implement parseRecipeFromText

```typescript
export async function parseRecipeFromText(text: string): Promise<LLMTextParseResult> {
  if (!OPENROUTER_CONFIG.apiKey) {
    console.warn("OpenRouter API key not configured, using mock data");
    return getMockTextParseResult(text);
  }

  // Truncate text to avoid token limits
  const truncatedText = text.substring(0, 5000);

  const messages: OpenRouterMessage[] = [
    { role: "system", content: RECIPE_PARSE_TEXT_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Przeanalizuj poniższy tekst i wyodrębnij składniki:

${truncatedText}`,
    },
  ];

  const response = await withRetry(() =>
    makeOpenRouterRequest({
      model: OPENROUTER_CONFIG.textModel,
      messages,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "text_parse_result",
          strict: true,
          schema: TEXT_PARSE_SCHEMA,
        },
      },
      maxTokens: 1500,
      temperature: 0.2,
      timeout: OPENROUTER_CONFIG.textTimeout,
    })
  );

  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) {
    throw new ExternalServiceError("Empty response from AI service");
  }

  return parseStructuredResponse<LLMTextParseResult>(responseContent, "text_parse");
}
```

### Phase 5: Testing and Validation

#### Step 5.1: Add Environment Variable Validation

```typescript
/**
 * Validates OpenRouter configuration at module load.
 * Logs warnings for missing configuration but doesn't throw.
 */
function validateConfig(): void {
  if (!OPENROUTER_CONFIG.apiKey) {
    console.warn("[OpenRouter] OPENROUTER_API_KEY not configured - AI features will use mock data");
  }
  if (OPENROUTER_CONFIG.visionModel === "google/gemini-2.0-flash-001" && !process.env.OPENROUTER_VISION_MODEL) {
    console.info("[OpenRouter] Using default vision model: google/gemini-2.0-flash-001");
  }
  if (OPENROUTER_CONFIG.textModel === "openai/gpt-4o-mini" && !process.env.OPENROUTER_TEXT_MODEL) {
    console.info("[OpenRouter] Using default text model: openai/gpt-4o-mini");
  }
}

// Validate on module load
validateConfig();
```

#### Step 5.2: Create Integration Tests

Create `__tests__/lib/services/openrouter.client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  scanReceiptImage,
  generateSubstitutions,
  parseRecipeFromHTML,
  parseRecipeFromText,
  ExternalServiceError,
} from "@/lib/services/openrouter.client";

describe("OpenRouter Client", () => {
  describe("scanReceiptImage", () => {
    it("returns items when API responds successfully", async () => {
      // Mock fetch or use MSW
    });

    it("throws ExternalServiceError on API failure", async () => {
      // Test error handling
    });

    it("retries on 429 rate limit error", async () => {
      // Test retry logic
    });
  });

  describe("generateSubstitutions", () => {
    it("analyzes ingredients against inventory", async () => {
      // Test substitution logic
    });

    it("respects user allergies in suggestions", async () => {
      // Test allergy handling
    });
  });

  describe("parseRecipeFromHTML", () => {
    it("extracts ingredients from HTML content", async () => {
      // Test HTML parsing
    });
  });

  describe("parseRecipeFromText", () => {
    it("parses various text formats", async () => {
      // Test text parsing
    });
  });
});
```

### Phase 6: Documentation and Cleanup

#### Step 6.1: Update Environment Variables Documentation

Add to `.env.example`:

```env
# OpenRouter AI Configuration
# Get your API key from https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional: Override default models
# Vision model for receipt scanning (must support image input)
OPENROUTER_VISION_MODEL=google/gemini-2.0-flash-001

# Text model for substitutions and recipe parsing
OPENROUTER_TEXT_MODEL=openai/gpt-4o-mini

# Application URL (used in OpenRouter headers for rate limit tracking)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Step 6.2: Add JSDoc Comments

Ensure all public functions have comprehensive JSDoc comments with:

- Description
- @param tags with types and descriptions
- @returns tag with return type
- @throws tag for error conditions
- @example where helpful

#### Step 6.3: Remove Mock Data (Optional)

Once real implementation is verified, the mock data functions can be:

1. Moved to test fixtures
2. Conditionally loaded only when `OPENROUTER_API_KEY` is not set
3. Removed entirely (keeping only for development/testing via environment flag)

```typescript
const USE_MOCKS = !OPENROUTER_CONFIG.apiKey || process.env.USE_AI_MOCKS === "true";

export async function scanReceiptImage(...): Promise<LLMReceiptScanResult> {
  if (USE_MOCKS) {
    return getMockReceiptScanResult();
  }
  // Real implementation
}
```

---

## Summary

This implementation plan provides a complete path from the current mock-based OpenRouter client to a fully functional integration. Key aspects include:

1. **Structured Responses**: Using `response_format` with JSON schemas ensures consistent, parseable outputs
2. **Polish Language Support**: All prompts are in Polish to match the application's target audience
3. **Robust Error Handling**: Comprehensive error mapping, retry logic, and timeout management
4. **Security**: API key protection, input sanitization, and safe response handling
5. **Maintainability**: Clear separation of concerns, type safety, and extensive documentation

The implementation can be done incrementally by phase, allowing for testing and validation at each step.
