/**
 * OpenRouter API Client
 *
 * This module provides functions to interact with the OpenRouter.ai API for AI-powered features:
 * - Receipt scanning using vision-capable LLMs
 * - Ingredient substitution suggestions using text completion
 *
 * Currently implements mock versions for development/testing.
 * See TODO comments in each function for implementation guidance.
 *
 * @module openrouter.client
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

import type { RecipeIngredientCommand, IngredientAnalysisDTO, MatchedInventoryItemDTO } from "@/types";
import type { SubstitutionContext, InventoryItemForAI } from "./ai.service";

// =============================================================================
// Types
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
// Configuration
// =============================================================================

/**
 * OpenRouter API configuration.
 * In production, these values come from environment variables.
 */
const OPENROUTER_CONFIG = {
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  baseUrl: "https://openrouter.ai/api/v1",
  visionModel: process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-pro-vision",
  textModel: process.env.OPENROUTER_TEXT_MODEL ?? "openai/gpt-4-turbo",
  visionTimeout: 30000, // 30 seconds
  textTimeout: 15000, // 15 seconds
};

// =============================================================================
// Mock Data for Development
// =============================================================================

/**
 * Mock receipt items for development/testing.
 * Returns a semi-random selection based on seed data.
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
  { name: "Oliwa z oliwek", quantity: 500, unit: "ml", confidence: 0.86 },
  { name: "Cebula biała", quantity: 1, unit: "kg", confidence: 0.84 },
  { name: "Czosnek", quantity: 1, unit: "szt", confidence: 0.82 },
  { name: "Jogurt naturalny", quantity: 400, unit: "g", confidence: 0.9 },
  { name: "Szynka wędzona", quantity: 200, unit: "g", confidence: 0.88 },
];

/**
 * Mock substitution suggestions for development/testing.
 */
const MOCK_SUBSTITUTION_SUGGESTIONS: Record<string, string> = {
  śmietana: "Użyj jogurtu greckiego jako zamiennika - ma podobną konsystencję i dodaje kremowości.",
  masło: "Możesz zastąpić olejem roślinnym lub margaryną w proporcji 1:1.",
  jajko: "Jeden banan lub 3 łyżki aquafaby (wody z ciecierzycy) mogą zastąpić jedno jajko.",
  mleko: "Mleko roślinne (owsiane, migdałowe) jest dobrym zamiennikiem.",
  mąka: "Jeśli potrzebujesz bezglutenowej, użyj mąki ryżowej lub z tapioki.",
  cukier: "Miód lub syrop klonowy w ilości o 25% mniejszej.",
  ser: "Tofu lub ser wegański dla diety roślinnej.",
  śmietanka: "Mleko kokosowe pełnotłuste daje podobny efekt w sosach.",
};

// =============================================================================
// OpenRouter API Functions
// =============================================================================

/**
 * Scans a receipt image using a vision-capable LLM to extract product items.
 *
 * @param imageBase64 - Base64 encoded image data
 * @param imageType - MIME type of the image
 * @returns Extracted receipt items with confidence scores
 * @throws ExternalServiceError if the API call fails
 *
 * @todo Implement actual OpenRouter API call:
 * 1. Create request body with model, messages (including image as base64 data URL)
 * 2. Make POST request to OPENROUTER_CONFIG.baseUrl + "/chat/completions"
 * 3. Include headers: Authorization (Bearer token), HTTP-Referer, X-Title
 * 4. Parse structured JSON response from LLM
 * 5. Handle rate limiting, timeouts, and API errors
 * 6. Implement retry logic with exponential backoff for transient failures
 */
export async function scanReceiptImage(imageBase64: string, imageType: string): Promise<LLMReceiptScanResult> {
  // TODO: Implement actual OpenRouter API call for receipt scanning
  // For now, return mock data for development/testing

  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check if API key is configured (for future implementation)
  if (!OPENROUTER_CONFIG.apiKey) {
    console.warn("OpenRouter API key not configured, using mock data");
  }

  // Return semi-random selection of mock items (3-7 items)
  const numItems = Math.floor(Math.random() * 5) + 3;
  const shuffled = [...MOCK_RECEIPT_ITEMS].sort(() => Math.random() - 0.5);
  const selectedItems = shuffled.slice(0, numItems);

  // Add slight variance to confidence scores
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
 * Finds the best matching inventory item for a given ingredient name.
 *
 * @param ingredientName - Name of ingredient to match
 * @param inventory - Available inventory items
 * @returns Best matching item or null
 */
function findBestMatchingItem(ingredientName: string, inventory: InventoryItemForAI[]): InventoryItemForAI | null {
  const nameLower = ingredientName.toLowerCase();

  // First try exact match
  const exactMatch = inventory.find((item) => item.name.toLowerCase() === nameLower && item.is_available);
  if (exactMatch) return exactMatch;

  // Then try partial match
  const partialMatch = inventory.find(
    (item) =>
      (item.name.toLowerCase().includes(nameLower) || nameLower.includes(item.name.toLowerCase())) && item.is_available
  );
  return partialMatch ?? null;
}

/**
 * Generates a substitution suggestion based on ingredient name.
 *
 * @param ingredientName - Name of the missing ingredient
 * @param inventory - Available inventory items
 * @returns Substitution suggestion text
 */
function generateSubstitutionSuggestion(ingredientName: string, inventory: InventoryItemForAI[]): string {
  const nameLower = ingredientName.toLowerCase();

  // Check if we have a pre-defined suggestion
  for (const [key, suggestion] of Object.entries(MOCK_SUBSTITUTION_SUGGESTIONS)) {
    if (nameLower.includes(key)) {
      return suggestion;
    }
  }

  // Generate generic suggestion based on available items
  const availableItems = inventory.filter((i) => i.is_available).map((i) => i.name);
  if (availableItems.length > 0) {
    return `Sprawdź czy któryś z dostępnych produktów (${availableItems.slice(0, 3).join(", ")}) może być zamiennikiem.`;
  }

  return "Brak dostępnych zamienników w Twoim inwentarzu.";
}

/**
 * Generates ingredient substitution suggestions using AI.
 *
 * @param context - User context including inventory, allergies, diets, and equipment
 * @param ingredients - Recipe ingredients to analyze
 * @returns Analysis for each ingredient with substitution suggestions
 * @throws ExternalServiceError if the API call fails
 *
 * @todo Implement actual OpenRouter API call:
 * 1. Create prompt with user context (inventory, allergies, diets, equipment)
 * 2. Include recipe ingredients with quantities and units
 * 3. Request structured JSON response with analysis for each ingredient
 * 4. Make POST request to OPENROUTER_CONFIG.baseUrl + "/chat/completions"
 * 5. Parse and validate LLM response
 * 6. Handle rate limiting, timeouts, and API errors
 * 7. Ensure suggestions respect user allergies and dietary restrictions
 */
export async function generateSubstitutions(
  context: SubstitutionContext,
  ingredients: RecipeIngredientCommand[]
): Promise<IngredientAnalysisDTO[]> {
  // TODO: Implement actual OpenRouter API call for substitution generation
  // For now, return mock data for development/testing

  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Check if API key is configured (for future implementation)
  if (!OPENROUTER_CONFIG.apiKey) {
    console.warn("OpenRouter API key not configured, using mock data");
  }

  const analysis: IngredientAnalysisDTO[] = [];

  for (const ingredient of ingredients) {
    const matchedItem = findBestMatchingItem(ingredient.name, context.inventory_items);

    let status: "available" | "partial" | "missing" = "missing";
    let matchedInventoryItem: MatchedInventoryItemDTO | null = null;

    if (matchedItem) {
      // Determine if we have enough quantity
      if (ingredient.quantity && matchedItem.quantity) {
        status = matchedItem.quantity >= ingredient.quantity ? "available" : "partial";
      } else {
        status = "available";
      }

      matchedInventoryItem = {
        id: matchedItem.id,
        name: matchedItem.name,
        quantity: matchedItem.quantity,
        unit: matchedItem.unit,
      };
    }

    // Generate substitution if missing or partial
    const needsSubstitution = status === "missing" || status === "partial";
    const suggestionText = needsSubstitution
      ? generateSubstitutionSuggestion(ingredient.name, context.inventory_items)
      : null;

    // Find potential substitute item from inventory
    let substituteItem: MatchedInventoryItemDTO | null = null;
    if (needsSubstitution) {
      const substitute = context.inventory_items.find(
        (item) =>
          item.is_available && item.name.toLowerCase() !== ingredient.name.toLowerCase() && item.id !== matchedItem?.id
      );
      if (substitute) {
        substituteItem = {
          id: substitute.id,
          name: substitute.name,
          quantity: substitute.quantity,
          unit: substitute.unit,
        };
      }
    }

    // Check for allergy warnings
    let allergyWarning: string | null = null;
    for (const allergy of context.user_allergies) {
      if (ingredient.name.toLowerCase().includes(allergy.toLowerCase())) {
        allergyWarning = `Ten składnik może zawierać ${allergy}!`;
        break;
      }
    }

    analysis.push({
      ingredient: ingredient.name,
      status,
      matched_inventory_item: matchedInventoryItem,
      substitution: needsSubstitution
        ? {
            available: substituteItem !== null,
            suggestion: suggestionText ?? "",
            substitute_item: substituteItem,
          }
        : null,
      allergy_warning: allergyWarning,
    });
  }

  return analysis;
}
