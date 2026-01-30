/**
 * OpenRouter Service
 *
 * This module provides functions to interact with the OpenRouter.ai API for AI-powered features:
 * - Receipt scanning using vision-capable LLMs
 * - Ingredient substitution suggestions using text completion
 * - Recipe parsing from HTML and text content
 *
 * The service abstracts multiple LLM providers (OpenAI, Anthropic, Google) behind a single API,
 * enabling cost optimization and avoiding vendor lock-in.
 *
 * @module openrouter.service
 *
 * @example
 * ```typescript
 * // Scan a receipt image
 * const result = await scanReceiptImage(base64Image, "image/jpeg");
 * console.log(result.items); // Extracted products with quantities
 *
 * // Generate substitutions for recipe ingredients
 * const analysis = await generateSubstitutions(userContext, recipeIngredients);
 * console.log(analysis); // Ingredient status and substitution suggestions
 * ```
 */

import type { RecipeIngredientCommand, IngredientAnalysisDTO, ParsedIngredientDTO } from "@/types";
import type { SubstitutionContext } from "./ai.service";

// =============================================================================
// Configuration
// =============================================================================

/**
 * OpenRouter API configuration interface.
 */
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

/**
 * OpenRouter API configuration.
 * Values are loaded from environment variables with sensible defaults.
 */
const OPENROUTER_CONFIG: OpenRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  baseUrl: "https://openrouter.ai/api/v1",
  visionModel: process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-2.0-flash-001",
  textModel: process.env.OPENROUTER_TEXT_MODEL ?? "openai/gpt-4o-mini",
  visionTimeout: 45000,
  textTimeout: 45000,
  maxRetries: 3,
  baseRetryDelay: 1000,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://mealer.app",
  siteName: "Mealer",
};

// =============================================================================
// OpenRouter API Types
// =============================================================================

/**
 * OpenRouter API message format.
 */
interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenRouterContentPart[];
}

/**
 * Content part for multimodal messages.
 */
interface OpenRouterContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

/**
 * Response format configuration for structured JSON output.
 */
interface OpenRouterResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
}

/**
 * OpenRouter API request body.
 */
interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  response_format?: OpenRouterResponseFormat;
  max_tokens?: number;
  temperature?: number;
}

/**
 * OpenRouter API response.
 */
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

// =============================================================================
// Exported Types
// =============================================================================

/**
 * Represents a single item extracted from a receipt by the vision LLM.
 *
 * @property name - Product name as read from the receipt
 * @property quantity - Extracted quantity (may be null if not detected)
 * @property unit - Unit of measurement hint (e.g., "g", "kg", "szt")
 * @property confidence - Confidence score from 0 to 1 indicating extraction certainty
 */
export interface LLMReceiptItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  confidence: number;
}

/**
 * Complete result from the receipt scanning LLM operation.
 *
 * @property items - Array of extracted product items
 * @property raw_text - Optional raw OCR text for debugging purposes
 */
export interface LLMReceiptScanResult {
  items: LLMReceiptItem[];
  raw_text?: string;
}

/**
 * Result from recipe parsing from HTML content.
 */
export interface LLMRecipeParseResult {
  title: string;
  ingredients: ParsedIngredientDTO[];
  confidence: number;
}

/**
 * Result from recipe parsing from text content.
 */
export interface LLMTextParseResult {
  ingredients: ParsedIngredientDTO[];
  confidence: number;
}

/**
 * Custom error class for external service failures.
 * Thrown when OpenRouter API calls fail due to network issues, rate limiting, or API errors.
 *
 * @example
 * ```typescript
 * try {
 *   await scanReceiptImage(image, type);
 * } catch (error) {
 *   if (error instanceof ExternalServiceError) {
 *     console.error(`API failed with status ${error.statusCode}: ${error.message}`);
 *   }
 * }
 * ```
 */
export class ExternalServiceError extends Error {
  /**
   * Creates a new ExternalServiceError.
   *
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code from the failed request (if available)
   * @param originalError - The underlying error that caused this failure
   */
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "ExternalServiceError";
  }
}

// =============================================================================
// Error Handling
// =============================================================================

/** HTTP status codes that should trigger a retry */
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Maps OpenRouter API errors to ExternalServiceError.
 *
 * @param response - Fetch Response object
 * @param body - Parsed error body (if available)
 * @returns ExternalServiceError with appropriate message
 */
function handleOpenRouterError(response: Response, body: unknown): ExternalServiceError {
  const status = response.status;

  // Log the full error response for debugging
  console.error("[OpenRouter] API error:", {
    status,
    statusText: response.statusText,
    body: JSON.stringify(body, null, 2),
  });

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

// =============================================================================
// Retry Logic
// =============================================================================

/**
 * Executes a function with retry logic and exponential backoff.
 *
 * Implements exponential backoff with jitter for transient failures.
 * Only retries on specific HTTP status codes (429, 500, 502, 503, 504).
 *
 * @param fn - Async function to execute
 * @param maxRetries - Maximum number of retry attempts (defaults to config value)
 * @param baseDelay - Base delay between retries in ms (defaults to config value)
 * @returns Promise resolving to the function result
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => makeOpenRouterRequest(params),
 *   3,  // max retries
 *   1000 // base delay
 * );
 * ```
 */
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

      // Don't retry non-retryable errors or if we've exhausted retries
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

// =============================================================================
// Core API Request Function
// =============================================================================

/**
 * Makes a request to the OpenRouter Chat Completions API.
 *
 * Handles:
 * - Request timeout via AbortController
 * - Authorization headers
 * - Response validation
 * - Error mapping
 *
 * @param params - Request parameters
 * @returns Promise resolving to the API response
 * @throws ExternalServiceError on failure
 *
 * @example
 * ```typescript
 * const response = await makeOpenRouterRequest({
 *   model: "google/gemini-2.0-flash-001",
 *   messages: [{ role: "user", content: "Hello" }],
 *   maxTokens: 1000,
 *   timeout: 15000,
 * });
 * ```
 */
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
    // Log unexpected errors for debugging
    console.error("[OpenRouter] Unexpected error:", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ExternalServiceError("AI service request failed", undefined, error);
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Response Parsing
// =============================================================================

/**
 * Validates and parses LLM response content.
 * Handles common issues like markdown code blocks in JSON responses.
 *
 * @param content - Raw response content string
 * @param context - Context for error messages (e.g., "receipt_scan")
 * @returns Parsed response object
 * @throws ExternalServiceError if parsing fails
 */
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

// =============================================================================
// Prompts and Schemas
// =============================================================================

/**
 * System prompt for receipt scanning.
 * Instructs the LLM to extract food products from receipt images.
 */
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

/**
 * JSON schema for receipt scanning structured response.
 * Note: With strict mode, ALL properties must be in required array.
 * Use type: ["string", "null"] for nullable fields instead of making them optional.
 */
const RECEIPT_SCAN_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nazwa produktu" },
          quantity: {
            type: ["number", "null"],
            description: "Ilość produktu",
          },
          unit: {
            type: ["string", "null"],
            description: "Jednostka miary",
          },
          confidence: {
            type: "number",
            description: "Pewność odczytu",
          },
        },
        required: ["name", "quantity", "unit", "confidence"],
        additionalProperties: false,
      },
    },
    raw_text: {
      type: ["string", "null"],
      description: "Odczytany tekst z paragonu (opcjonalnie)",
    },
  },
  required: ["items", "raw_text"],
  additionalProperties: false,
};

/**
 * System prompt for ingredient substitutions.
 * Template variables {allergies}, {diets}, {equipment} are replaced at runtime.
 */
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

/**
 * JSON schema for substitutions structured response.
 * Note: With strict mode, ALL properties must be in required array.
 * Use type: ["string", "null"] for nullable fields instead of making them optional.
 */
const SUBSTITUTIONS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    analysis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ingredient: { type: "string" },
          status: {
            type: "string",
            enum: ["available", "partial", "missing"],
          },
          matched_inventory_item: {
            type: ["object", "null"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              quantity: { type: ["number", "null"] },
              unit: { type: ["string", "null"] },
            },
            required: ["id", "name", "quantity", "unit"],
            additionalProperties: false,
          },
          substitution: {
            type: ["object", "null"],
            properties: {
              available: { type: "boolean" },
              suggestion: { type: "string" },
              substitute_item: {
                type: ["object", "null"],
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  quantity: { type: ["number", "null"] },
                  unit: { type: ["string", "null"] },
                },
                required: ["id", "name", "quantity", "unit"],
                additionalProperties: false,
              },
            },
            required: ["available", "suggestion", "substitute_item"],
            additionalProperties: false,
          },
          allergy_warning: { type: ["string", "null"] },
        },
        required: ["ingredient", "status", "matched_inventory_item", "substitution", "allergy_warning"],
        additionalProperties: false,
      },
    },
  },
  required: ["analysis"],
  additionalProperties: false,
};

/**
 * System prompt for parsing recipes from HTML content.
 * Extracts ingredients from web page text content.
 */
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

/**
 * System prompt for parsing recipes from raw text.
 * Handles various text formats (lists, comma-separated, etc.).
 */
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

/**
 * JSON schema for recipe parsing from HTML structured response.
 * Note: With strict mode, ALL properties must be in required array.
 * Use type: ["string", "null"] for nullable fields instead of making them optional.
 */
const RECIPE_PARSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    title: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          original_text: { type: "string" },
          is_staple: { type: ["boolean", "null"] },
        },
        required: ["name", "quantity", "unit", "original_text", "is_staple"],
        additionalProperties: false,
      },
    },
    confidence: { type: "number" },
  },
  required: ["title", "ingredients", "confidence"],
  additionalProperties: false,
};

/**
 * JSON schema for recipe parsing from text structured response.
 * Note: With strict mode, ALL properties must be in required array.
 * Use type: ["string", "null"] for nullable fields instead of making them optional.
 */
const TEXT_PARSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          original_text: { type: "string" },
          is_staple: { type: ["boolean", "null"] },
        },
        required: ["name", "quantity", "unit", "original_text", "is_staple"],
        additionalProperties: false,
      },
    },
    confidence: { type: "number" },
  },
  required: ["ingredients", "confidence"],
  additionalProperties: false,
};

// =============================================================================
// Mock Data for Development
// =============================================================================

/**
 * Mock receipt items for development/testing when API key is not configured.
 */
const MOCK_RECEIPT_ITEMS: LLMReceiptItem[] = [
  { name: "Mleko 3.2%", quantity: 1, unit: "l", confidence: 0.95 },
  { name: "Chleb pszenny", quantity: 1, unit: "szt", confidence: 0.92 },
  { name: "Masło extra", quantity: 200, unit: "g", confidence: 0.88 },
  { name: "Jajka M", quantity: 10, unit: "szt", confidence: 0.94 },
  { name: "Ser żółty gouda", quantity: 300, unit: "g", confidence: 0.87 },
  { name: "Pomidory", quantity: 500, unit: "g", confidence: 0.85 },
  { name: "Ogórki zielone", quantity: 3, unit: "szt", confidence: 0.83 },
  { name: "Kurczak filet", quantity: 600, unit: "g", confidence: 0.91 },
  { name: "Ryż biały", quantity: 1, unit: "kg", confidence: 0.89 },
  { name: "Makaron spaghetti", quantity: 500, unit: "g", confidence: 0.93 },
];

/**
 * Returns mock receipt scan result for development/testing.
 */
function getMockReceiptScanResult(): LLMReceiptScanResult {
  const numItems = Math.floor(Math.random() * 5) + 3;
  const shuffled = [...MOCK_RECEIPT_ITEMS].sort(() => Math.random() - 0.5);
  const selectedItems = shuffled.slice(0, numItems);

  const itemsWithVariance = selectedItems.map((item) => ({
    ...item,
    confidence: Math.min(0.99, Math.max(0.7, item.confidence + (Math.random() - 0.5) * 0.1)),
  }));

  return {
    items: itemsWithVariance,
    raw_text: "Mock receipt scan result",
  };
}

/**
 * Returns mock substitutions result for development/testing.
 */
function getMockSubstitutionsResult(
  context: SubstitutionContext,
  ingredients: RecipeIngredientCommand[]
): IngredientAnalysisDTO[] {
  return ingredients.map((ingredient) => {
    // Try to find a matching item in inventory
    const matchedItem = context.inventory_items.find(
      (item) =>
        item.is_available &&
        (item.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
          ingredient.name.toLowerCase().includes(item.name.toLowerCase()))
    );

    let status: "available" | "partial" | "missing" = "missing";
    if (matchedItem) {
      if (ingredient.quantity && matchedItem.quantity) {
        status = matchedItem.quantity >= ingredient.quantity ? "available" : "partial";
      } else {
        status = "available";
      }
    }

    // Check for allergy warning
    let allergyWarning: string | null = null;
    for (const allergy of context.user_allergies) {
      if (ingredient.name.toLowerCase().includes(allergy.toLowerCase())) {
        allergyWarning = `Ten składnik może zawierać ${allergy}!`;
        break;
      }
    }

    return {
      ingredient: ingredient.name,
      status,
      matched_inventory_item: matchedItem
        ? {
            id: matchedItem.id,
            name: matchedItem.name,
            quantity: matchedItem.quantity,
            unit: matchedItem.unit,
          }
        : null,
      substitution:
        status === "missing" || status === "partial"
          ? {
              available: false,
              suggestion: `Brak zamiennika dla ${ingredient.name} w inwentarzu.`,
              substitute_item: null,
            }
          : null,
      allergy_warning: allergyWarning,
    };
  });
}

/**
 * Mock ingredients for recipe parsing development/testing.
 */
const MOCK_RECIPE_INGREDIENTS: ParsedIngredientDTO[] = [
  { name: "filet z kurczaka", quantity: 500, unit: "g", original_text: "500g filetu z kurczaka" },
  { name: "śmietana 30%", quantity: 200, unit: "ml", original_text: "200 ml śmietany 30%" },
  { name: "cebula", quantity: 2, unit: "szt.", original_text: "2 cebule" },
  { name: "czosnek", quantity: 3, unit: "ząbki", original_text: "3 ząbki czosnku" },
  { name: "masło", quantity: 50, unit: "g", original_text: "50g masła" },
  { name: "pieczarki", quantity: 200, unit: "g", original_text: "200g pieczarek" },
  { name: "sól", quantity: null, unit: null, original_text: "sól do smaku", is_staple: true },
  { name: "pieprz", quantity: null, unit: null, original_text: "pieprz do smaku", is_staple: true },
];

/**
 * Returns mock recipe parse result for development/testing.
 */
function getMockRecipeParseResult(pageTitle: string): LLMRecipeParseResult {
  const numItems = Math.floor(Math.random() * 4) + 4;
  const shuffled = [...MOCK_RECIPE_INGREDIENTS].sort(() => Math.random() - 0.5);
  const selectedIngredients = shuffled.slice(0, numItems);

  return {
    title: pageTitle || "Przepis kulinarny",
    ingredients: selectedIngredients,
    confidence: 0.75 + Math.random() * 0.2,
  };
}

/**
 * Returns mock text parse result for development/testing.
 */
function getMockTextParseResult(text: string): LLMTextParseResult {
  // Estimate ingredients based on line count
  const lineCount = text.split(/[\n,;]+/).filter((line) => line.trim().length > 0).length;
  const numItems = Math.min(Math.max(lineCount, 2), 8);

  const shuffled = [...MOCK_RECIPE_INGREDIENTS].sort(() => Math.random() - 0.5);
  const selectedIngredients = shuffled.slice(0, numItems);

  return {
    ingredients: selectedIngredients,
    confidence: 0.7 + Math.random() * 0.2,
  };
}

// =============================================================================
// Configuration Validation
// =============================================================================

/**
 * Determines if mock data should be used instead of real API calls.
 * Mock data is used when:
 * - API key is not configured
 * - USE_AI_MOCKS environment variable is explicitly set to "true"
 */
const USE_MOCKS = !OPENROUTER_CONFIG.apiKey || process.env.USE_AI_MOCKS === "true";

/**
 * Check if OpenRouter API is configured and available.
 *
 * @returns True if API key is configured and mocks are not forced
 */
export function isOpenRouterConfigured(): boolean {
  return Boolean(OPENROUTER_CONFIG.apiKey) && process.env.USE_AI_MOCKS !== "true";
}

/**
 * Check if the service is currently using mock data.
 *
 * @returns True if mock data is being used
 */
export function isUsingMockData(): boolean {
  return USE_MOCKS;
}

/**
 * Validates OpenRouter configuration at module load.
 * Logs warnings for missing configuration but doesn't throw.
 */
function validateConfig(): void {
  if (!OPENROUTER_CONFIG.apiKey) {
    console.warn("[OpenRouter] OPENROUTER_API_KEY not configured - AI features will use mock data");
  } else if (process.env.USE_AI_MOCKS === "true") {
    console.info("[OpenRouter] USE_AI_MOCKS=true - AI features will use mock data");
  } else {
    console.info("[OpenRouter] API key configured - AI features are enabled");
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

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * Scans a receipt image using a vision-capable LLM to extract product items.
 *
 * @param imageBase64 - Base64 encoded image data (may include data URL prefix)
 * @param imageType - MIME type of the image (e.g., "image/jpeg")
 * @returns Promise resolving to extracted receipt items with confidence scores
 * @throws ExternalServiceError if the API call fails after retries
 *
 * @example
 * ```typescript
 * const result = await scanReceiptImage(base64Image, "image/jpeg");
 * console.log(result.items); // [{ name: "Mleko", quantity: 1, unit: "l", confidence: 0.95 }]
 * ```
 */
export async function scanReceiptImage(imageBase64: string, imageType: string): Promise<LLMReceiptScanResult> {
  // Use mock data if API is not configured or mocks are forced
  if (USE_MOCKS) {
    console.warn("[OpenRouter] Using mock data for receipt scanning");
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getMockReceiptScanResult();
  }

  // Prepare image data URL - extract base64 if data URL prefix is present
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

/**
 * Generates ingredient substitution suggestions using AI.
 *
 * @param context - User context including inventory, allergies, diets, and equipment
 * @param ingredients - Recipe ingredients to analyze
 * @returns Promise resolving to analysis for each ingredient
 * @throws ExternalServiceError if the API call fails after retries
 *
 * @example
 * ```typescript
 * const analysis = await generateSubstitutions(userContext, ingredients);
 * console.log(analysis[0].substitution?.suggestion);
 * ```
 */
export async function generateSubstitutions(
  context: SubstitutionContext,
  ingredients: RecipeIngredientCommand[]
): Promise<IngredientAnalysisDTO[]> {
  // Use mock data if API is not configured or mocks are forced
  if (USE_MOCKS) {
    console.warn("[OpenRouter] Using mock data for substitutions");
    await new Promise((resolve) => setTimeout(resolve, 300));
    return getMockSubstitutionsResult(context, ingredients);
  }

  // Build context-aware system prompt by replacing template variables
  const systemPrompt = SUBSTITUTIONS_SYSTEM_PROMPT.replace("{allergies}", context.user_allergies.join(", ") || "brak")
    .replace("{diets}", context.user_diets.join(", ") || "brak")
    .replace("{equipment}", context.user_equipment.join(", ") || "standardowy");

  // Format inventory for the prompt - only include available items
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

  // Make API request with retry
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

  // Parse and return structured response
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ExternalServiceError("Empty response from AI service");
  }

  const result = parseStructuredResponse<{ analysis: IngredientAnalysisDTO[] }>(content, "substitutions");

  return result.analysis;
}

/**
 * Parses recipe ingredients from HTML content using AI.
 *
 * @param content - Extracted text content from the recipe page
 * @param pageTitle - Title of the recipe page
 * @returns Promise resolving to parsed recipe with ingredients
 * @throws ExternalServiceError if the API call fails after retries
 *
 * @example
 * ```typescript
 * const recipe = await parseRecipeFromHTML(htmlContent, "Kurczak w sosie");
 * console.log(recipe.ingredients);
 * ```
 */
export async function parseRecipeFromHTML(content: string, pageTitle: string): Promise<LLMRecipeParseResult> {
  // Use mock data if API is not configured or mocks are forced
  if (USE_MOCKS) {
    console.warn("[OpenRouter] Using mock data for recipe parsing");
    await new Promise((resolve) => setTimeout(resolve, 800));
    return getMockRecipeParseResult(pageTitle);
  }

  // Truncate content to avoid token limits (approximately 15k characters)
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

  // Make API request with retry
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

  // Parse and return structured response
  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) {
    throw new ExternalServiceError("Empty response from AI service");
  }

  return parseStructuredResponse<LLMRecipeParseResult>(responseContent, "recipe_parse");
}

/**
 * Parses recipe ingredients from raw text using AI.
 *
 * @param text - Raw recipe text (e.g., copy-pasted ingredient list)
 * @returns Promise resolving to parsed ingredients
 * @throws ExternalServiceError if the API call fails after retries
 *
 * @example
 * ```typescript
 * const result = await parseRecipeFromText("500g kurczaka\n200ml śmietany");
 * console.log(result.ingredients);
 * ```
 */
export async function parseRecipeFromText(text: string): Promise<LLMTextParseResult> {
  // Use mock data if API is not configured or mocks are forced
  if (USE_MOCKS) {
    console.warn("[OpenRouter] Using mock data for text parsing");
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getMockTextParseResult(text);
  }

  // Truncate text to avoid token limits (approximately 5k characters for text input)
  const truncatedText = text.substring(0, 5000);

  const messages: OpenRouterMessage[] = [
    { role: "system", content: RECIPE_PARSE_TEXT_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Przeanalizuj poniższy tekst i wyodrębnij składniki:

${truncatedText}`,
    },
  ];

  // Make API request with retry
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

  // Parse and return structured response
  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) {
    throw new ExternalServiceError("Empty response from AI service");
  }

  return parseStructuredResponse<LLMTextParseResult>(responseContent, "text_parse");
}

// =============================================================================
// Internal exports for testing
// =============================================================================

export const __internal = {
  // Core functions
  makeOpenRouterRequest,
  withRetry,
  parseStructuredResponse,
  handleOpenRouterError,
  // Configuration
  OPENROUTER_CONFIG,
  RETRYABLE_STATUS_CODES,
  USE_MOCKS,
  // Prompts
  RECEIPT_SCAN_SYSTEM_PROMPT,
  SUBSTITUTIONS_SYSTEM_PROMPT,
  RECIPE_PARSE_HTML_SYSTEM_PROMPT,
  RECIPE_PARSE_TEXT_SYSTEM_PROMPT,
  // Schemas
  RECEIPT_SCAN_SCHEMA,
  SUBSTITUTIONS_SCHEMA,
  RECIPE_PARSE_SCHEMA,
  TEXT_PARSE_SCHEMA,
  // Mock functions
  getMockReceiptScanResult,
  getMockSubstitutionsResult,
  getMockRecipeParseResult,
  getMockTextParseResult,
};
