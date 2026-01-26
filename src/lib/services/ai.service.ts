/**
 * AI Service Module
 *
 * Core business logic for AI-powered features in the Mealer application:
 * - Receipt scanning and product extraction
 * - Ingredient substitution suggestions
 * - AI usage tracking and rate limiting
 *
 * This module provides:
 * - Zod validation schemas for API request validation
 * - Rate limiting functions for AI feature usage
 * - Product and unit matching utilities
 * - Ingredient-to-inventory fuzzy matching
 * - Warning generation for allergies and diet conflicts
 *
 * @module ai.service
 *
 * @example
 * ```typescript
 * // Check rate limit before processing
 * const rateLimitResult = await checkRateLimit(supabase, userId, "receipt_scans");
 * if (!rateLimitResult.allowed) {
 *   return rateLimitedError("Daily limit exceeded");
 * }
 *
 * // After successful processing, increment usage
 * await incrementUsage(supabase, userId, "receipt_scans");
 *
 * // Get usage statistics for response
 * const usage = await getAIUsage(supabase, userId);
 * ```
 */

import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase/server";
import type {
  AIUsageDTO,
  AIUsageCounterDTO,
  RateLimitsConfigDTO,
  ReceiptMatchedProductDTO,
  UnitBriefDTO,
  IngredientStatus,
  MatchedInventoryItemDTO,
  InventoryItemDTO,
  RecipeIngredientCommand,
  SubstitutionWarningDTO,
  SubstitutionWarningType,
  ProfileDTO,
} from "@/types";
import { ensureNumber } from "@/lib/utils/db";
import type { Json } from "@/db/supabase/database.types";

// =============================================================================
// Constants
// =============================================================================

/** Maximum decoded image size in bytes (10MB) */
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum number of recipe ingredients allowed per request */
const MAX_RECIPE_INGREDIENTS = 30;

/** Maximum length of ingredient name */
const MAX_INGREDIENT_NAME_LENGTH = 200;

/** Default rate limits if not configured in database */
const DEFAULT_RATE_LIMITS: RateLimitsConfigDTO = {
  receipt_scans_per_day: 5,
  substitutions_per_day: 10,
};

// =============================================================================
// Zod Validation Schemas
// =============================================================================

/**
 * Supported image MIME types for receipt scanning
 */
const receiptImageTypeSchema = z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

/**
 * Validation schema for POST /api/ai/scan-receipt request body
 */
export const receiptScanSchema = z.object({
  image: z
    .string()
    .min(1, "Image data is required")
    .refine((val) => isValidBase64(val), { message: "Invalid base64 encoding" })
    .refine((val) => estimateBase64Size(val) <= MAX_IMAGE_SIZE_BYTES, {
      message: `Image size exceeds ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit`,
    }),
  image_type: receiptImageTypeSchema,
});

export type ReceiptScanInput = z.infer<typeof receiptScanSchema>;

/**
 * Validation schema for a single recipe ingredient
 */
const recipeIngredientSchema = z.object({
  name: z
    .string()
    .min(1, "Ingredient name is required")
    .max(MAX_INGREDIENT_NAME_LENGTH, `Ingredient name must be at most ${MAX_INGREDIENT_NAME_LENGTH} characters`)
    .transform((val) => val.trim()),
  quantity: z.number().positive("Quantity must be positive").nullable().optional().default(null),
  unit: z.string().nullable().optional().default(null),
});

/**
 * Validation schema for POST /api/ai/substitutions request body
 */
export const substitutionsSchema = z.object({
  recipe_ingredients: z
    .array(recipeIngredientSchema)
    .min(1, "At least one ingredient is required")
    .max(MAX_RECIPE_INGREDIENTS, `Maximum ${MAX_RECIPE_INGREDIENTS} ingredients allowed`),
});

export type SubstitutionsInput = z.infer<typeof substitutionsSchema>;

// =============================================================================
// Internal Types
// =============================================================================

/** Result of rate limit check */
export interface RateLimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/** Type of AI feature for rate limiting */
export type AIFeatureType = "receipt_scans" | "substitutions";

/** Simplified inventory item for AI context */
export interface InventoryItemForAI {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  is_available: boolean;
}

/** Context passed to substitution LLM */
export interface SubstitutionContext {
  inventory_items: InventoryItemForAI[];
  user_allergies: string[];
  user_diets: string[];
  user_equipment: string[];
}

/** Result of ingredient matching against inventory */
export interface IngredientMatchResult {
  ingredient: string;
  status: IngredientStatus;
  matchedItem: MatchedInventoryItemDTO | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates if a string is valid base64 encoded data.
 *
 * @param value - String to validate
 * @returns True if valid base64
 */
export function isValidBase64(value: string): boolean {
  // Check for data URL format and extract the base64 part
  const base64Data = value.includes(",") ? value.split(",")[1] : value;

  if (!base64Data || base64Data.length === 0) {
    return false;
  }

  // Basic base64 pattern validation
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Pattern.test(base64Data);
}

/**
 * Estimates the decoded size of a base64 encoded string in bytes.
 *
 * @param base64 - Base64 encoded string (may include data URL prefix)
 * @returns Estimated size in bytes
 */
export function estimateBase64Size(base64: string): number {
  // Extract base64 data from data URL if present
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;

  if (!base64Data) {
    return 0;
  }

  // Remove padding characters for accurate calculation
  const padding = (base64Data.match(/=+$/) || [""])[0].length;
  // Each base64 character represents 6 bits, so 4 characters = 3 bytes
  return Math.floor((base64Data.length * 3) / 4) - padding;
}

/**
 * Gets today's date in YYYY-MM-DD format (UTC).
 *
 * @returns Date string in ISO format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// =============================================================================
// Rate Limit Functions
// =============================================================================

/**
 * Fetches rate limits from system_config table.
 *
 * @param supabase - Authenticated Supabase client
 * @returns Rate limits configuration
 */
export async function getRateLimits(supabase: SupabaseClient): Promise<RateLimitsConfigDTO> {
  const { data, error } = await supabase.from("system_config").select("value").eq("key", "rate_limits").single();

  if (error || !data) {
    return { ...DEFAULT_RATE_LIMITS };
  }

  const value = data.value as Record<string, Json | undefined> | null;
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_RATE_LIMITS };
  }

  return {
    receipt_scans_per_day: ensureNumber(value.receipt_scans_per_day, DEFAULT_RATE_LIMITS.receipt_scans_per_day),
    substitutions_per_day: ensureNumber(value.substitutions_per_day, DEFAULT_RATE_LIMITS.substitutions_per_day),
  };
}

/**
 * Fetches today's AI usage for a user.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID to fetch usage for
 * @returns Usage counts for today (0 if no record exists)
 */
export async function getUserUsageToday(
  supabase: SupabaseClient,
  userId: string
): Promise<{ receipt_scan_count: number; substitution_count: number }> {
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from("ai_usage_log")
    .select("receipt_scan_count, substitution_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

  if (error || !data) {
    return { receipt_scan_count: 0, substitution_count: 0 };
  }

  return {
    receipt_scan_count: data.receipt_scan_count,
    substitution_count: data.substitution_count,
  };
}

/**
 * Checks if user is within rate limit for a specific AI feature.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID to check
 * @param featureType - Type of AI feature
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  featureType: AIFeatureType
): Promise<RateLimitCheckResult> {
  const [rateLimits, usage] = await Promise.all([getRateLimits(supabase), getUserUsageToday(supabase, userId)]);

  const limit = featureType === "receipt_scans" ? rateLimits.receipt_scans_per_day : rateLimits.substitutions_per_day;

  const used = featureType === "receipt_scans" ? usage.receipt_scan_count : usage.substitution_count;

  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  };
}

/**
 * Increments usage counter for a specific AI feature.
 * Creates a new record if one doesn't exist for today.
 * Uses an optimistic insert-first pattern with update fallback.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID to increment usage for
 * @param featureType - Type of AI feature
 * @returns Updated usage count
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  featureType: AIFeatureType
): Promise<number> {
  const today = getTodayDateString();
  const isReceiptScan = featureType === "receipt_scans";

  // First, try to get existing record
  const { data: existing } = await supabase
    .from("ai_usage_log")
    .select("receipt_scan_count, substitution_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

  if (existing) {
    // Record exists - increment the appropriate counter
    const newReceiptCount = isReceiptScan ? existing.receipt_scan_count + 1 : existing.receipt_scan_count;
    const newSubstitutionCount = isReceiptScan ? existing.substitution_count : existing.substitution_count + 1;

    const { error: updateError } = await supabase
      .from("ai_usage_log")
      .update({
        receipt_scan_count: newReceiptCount,
        substitution_count: newSubstitutionCount,
      })
      .eq("user_id", userId)
      .eq("usage_date", today);

    if (updateError) {
      console.error("Failed to update AI usage:", updateError);
      throw updateError;
    }

    return isReceiptScan ? newReceiptCount : newSubstitutionCount;
  }

  // No record exists - create new one
  const newRecord = {
    user_id: userId,
    usage_date: today,
    receipt_scan_count: isReceiptScan ? 1 : 0,
    substitution_count: isReceiptScan ? 0 : 1,
  };

  const { error: insertError } = await supabase.from("ai_usage_log").insert(newRecord);

  if (insertError) {
    // Handle potential race condition - another request may have created the record
    // Try updating instead
    if (insertError.code === "23505") {
      // Unique constraint violation - record was created by another request
      return incrementUsage(supabase, userId, featureType);
    }
    console.error("Failed to insert AI usage:", insertError);
    throw insertError;
  }

  return 1;
}

/**
 * Gets complete AI usage statistics for a user.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID to get usage for
 * @returns Complete AI usage DTO
 */
export async function getAIUsage(supabase: SupabaseClient, userId: string): Promise<AIUsageDTO> {
  const [rateLimits, usage] = await Promise.all([getRateLimits(supabase), getUserUsageToday(supabase, userId)]);

  const receiptScans: AIUsageCounterDTO = {
    used: usage.receipt_scan_count,
    limit: rateLimits.receipt_scans_per_day,
    remaining: Math.max(0, rateLimits.receipt_scans_per_day - usage.receipt_scan_count),
  };

  const substitutions: AIUsageCounterDTO = {
    used: usage.substitution_count,
    limit: rateLimits.substitutions_per_day,
    remaining: Math.max(0, rateLimits.substitutions_per_day - usage.substitution_count),
  };

  return {
    date: getTodayDateString(),
    receipt_scans: receiptScans,
    substitutions,
  };
}

// =============================================================================
// Product Matching Functions
// =============================================================================

/**
 * Matches an extracted product name to the product catalog using full-text search.
 *
 * @param supabase - Authenticated Supabase client
 * @param name - Product name to search for
 * @returns Matched product or null if not found
 */
export async function matchProductByName(
  supabase: SupabaseClient,
  name: string
): Promise<ReceiptMatchedProductDTO | null> {
  // First try full-text search
  const { data: ftsData, error: ftsError } = await supabase
    .from("product_catalog")
    .select("id, name_pl")
    .textSearch("search_vector", name, { type: "websearch", config: "polish" })
    .limit(1)
    .single();

  if (!ftsError && ftsData) {
    return { id: ftsData.id, name_pl: ftsData.name_pl };
  }

  // Fallback to ILIKE pattern matching
  const { data: ilikeData, error: ilikeError } = await supabase
    .from("product_catalog")
    .select("id, name_pl")
    .ilike("name_pl", `%${name}%`)
    .limit(1)
    .single();

  if (!ilikeError && ilikeData) {
    return { id: ilikeData.id, name_pl: ilikeData.name_pl };
  }

  return null;
}

/**
 * Suggests a unit for an extracted item based on product defaults or LLM hint.
 *
 * @param supabase - Authenticated Supabase client
 * @param productId - Product ID to get default unit from (if matched)
 * @param llmHint - Unit hint from LLM extraction (if provided)
 * @returns Suggested unit or null
 */
export async function suggestUnitForItem(
  supabase: SupabaseClient,
  productId: number | null,
  llmHint: string | null
): Promise<UnitBriefDTO | null> {
  // If we have a matched product, try to get its default unit
  if (productId) {
    const { data: productData } = await supabase
      .from("product_catalog")
      .select("default_unit_id")
      .eq("id", productId)
      .single();

    if (productData?.default_unit_id) {
      const { data: unitData } = await supabase
        .from("units")
        .select("id, name_pl, abbreviation")
        .eq("id", productData.default_unit_id)
        .single();

      if (unitData) {
        return {
          id: unitData.id,
          name_pl: unitData.name_pl,
          abbreviation: unitData.abbreviation,
        };
      }
    }
  }

  // Try to match unit from LLM hint
  if (llmHint) {
    const { data: unitData } = await supabase
      .from("units")
      .select("id, name_pl, abbreviation")
      .or(`name_pl.ilike.%${llmHint}%,abbreviation.ilike.%${llmHint}%`)
      .limit(1)
      .single();

    if (unitData) {
      return {
        id: unitData.id,
        name_pl: unitData.name_pl,
        abbreviation: unitData.abbreviation,
      };
    }
  }

  return null;
}

// =============================================================================
// Ingredient Matching Functions
// =============================================================================

/**
 * Converts inventory items to a simplified format for AI context.
 *
 * @param items - Inventory items to convert
 * @returns Simplified inventory items for AI
 */
export function convertInventoryForAI(items: InventoryItemDTO[]): InventoryItemForAI[] {
  return items.map((item) => ({
    id: item.id,
    name: item.custom_name ?? item.product?.name_pl ?? "Unknown",
    quantity: item.quantity,
    unit: item.unit?.abbreviation ?? item.unit?.name_pl ?? null,
    is_available: item.is_available,
  }));
}

/**
 * Calculates Levenshtein distance between two strings (case-insensitive).
 * Used for fuzzy matching ingredients to inventory.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Distance between strings
 */
function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  const matrix: number[][] = [];

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

/**
 * Calculates similarity score between two strings (0-1).
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (1 = identical, 0 = completely different)
 */
function stringSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLength;
}

/** Similarity threshold for considering a match */
const SIMILARITY_THRESHOLD = 0.6;

/**
 * Matches recipe ingredients to user's inventory items.
 *
 * @param ingredients - Recipe ingredients to match
 * @param inventory - User's inventory items
 * @returns Map of ingredient name to match result
 */
export function matchIngredientsToInventory(
  ingredients: RecipeIngredientCommand[],
  inventory: InventoryItemForAI[]
): Map<string, IngredientMatchResult> {
  const results = new Map<string, IngredientMatchResult>();

  for (const ingredient of ingredients) {
    let bestMatch: InventoryItemForAI | null = null;
    let bestSimilarity = 0;

    for (const item of inventory) {
      const similarity = stringSimilarity(ingredient.name, item.name);
      if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
        bestSimilarity = similarity;
        bestMatch = item;
      }
    }

    let status: IngredientStatus = "missing";
    let matchedItem: MatchedInventoryItemDTO | null = null;

    if (bestMatch && bestMatch.is_available) {
      // Check if quantity is sufficient
      if (ingredient.quantity && bestMatch.quantity) {
        status = bestMatch.quantity >= ingredient.quantity ? "available" : "partial";
      } else {
        status = "available";
      }

      matchedItem = {
        id: bestMatch.id,
        name: bestMatch.name,
        quantity: bestMatch.quantity,
        unit: bestMatch.unit,
      };
    }

    results.set(ingredient.name, {
      ingredient: ingredient.name,
      status,
      matchedItem,
    });
  }

  return results;
}

// =============================================================================
// Warning Generation Functions
// =============================================================================

/** Common allergens and their keywords (Polish) */
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten: ["mąka", "chleb", "makaron", "pszenica", "żyto", "jęczmień", "owies"],
  laktoza: ["mleko", "ser", "jogurt", "śmietana", "masło", "kefir", "twaróg"],
  orzechy: ["orzechy", "migdały", "orzeszki", "pistacje", "orzech"],
  jaja: ["jajko", "jajka", "jajo"],
  ryby: ["ryba", "dorsz", "łosoś", "tuńczyk", "śledź", "makrela"],
  skorupiaki: ["krewetki", "kraby", "langusty", "małże", "homary"],
  soja: ["soja", "tofu", "sos sojowy", "miso"],
  seler: ["seler", "selera"],
  gorczyca: ["gorczyca", "musztarda"],
  sezam: ["sezam", "tahini"],
};

/** Diet restrictions and forbidden ingredients (Polish) */
const DIET_KEYWORDS: Record<string, string[]> = {
  wegetariańska: ["mięso", "kurczak", "wołowina", "wieprzowina", "szynka", "boczek", "kiełbasa"],
  wegańska: ["mięso", "kurczak", "mleko", "ser", "jajko", "masło", "śmietana", "miód"],
  bezglutenowa: ["mąka", "chleb", "makaron", "pszenica"],
  bezlaktozowa: ["mleko", "ser", "jogurt", "śmietana", "masło"],
};

/**
 * Generates warnings based on user allergies and diets.
 *
 * @param ingredients - Recipe ingredients to check
 * @param profile - User's profile with allergies and diets
 * @returns Array of warning DTOs
 */
export function generateWarnings(
  ingredients: RecipeIngredientCommand[],
  profile: ProfileDTO
): SubstitutionWarningDTO[] {
  const warnings: SubstitutionWarningDTO[] = [];
  const ingredientNames = ingredients.map((i) => i.name.toLowerCase());

  // Check for allergens
  for (const allergy of profile.allergies) {
    const keywords = ALLERGEN_KEYWORDS[allergy.toLowerCase()] || [allergy.toLowerCase()];

    for (const ingredientName of ingredientNames) {
      for (const keyword of keywords) {
        if (ingredientName.includes(keyword)) {
          warnings.push({
            type: "allergy" as SubstitutionWarningType,
            message: `Przepis zawiera składnik "${ingredientName}" - możliwa alergia na ${allergy}!`,
          });
          break;
        }
      }
    }
  }

  // Check for diet restrictions
  for (const diet of profile.diets) {
    const keywords = DIET_KEYWORDS[diet.toLowerCase()] || [];

    for (const ingredientName of ingredientNames) {
      for (const keyword of keywords) {
        if (ingredientName.includes(keyword)) {
          warnings.push({
            type: "diet" as SubstitutionWarningType,
            message: `Przepis zawiera składnik "${ingredientName}" - niezgodny z dietą ${diet}!`,
          });
          break;
        }
      }
    }
  }

  return warnings;
}
