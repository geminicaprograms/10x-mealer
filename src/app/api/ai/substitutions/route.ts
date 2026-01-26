import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  substitutionsSchema,
  checkRateLimit,
  incrementUsage,
  convertInventoryForAI,
  generateWarnings,
} from "@/lib/services/ai.service";
import { generateSubstitutions, ExternalServiceError } from "@/lib/services/openrouter.client";
import { getProfileByUserId } from "@/lib/services/profile.service";
import { listInventoryItems } from "@/lib/services/inventory.service";
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  rateLimitedError,
  internalError,
  externalServiceError,
} from "@/lib/api/errors";
import type { SubstitutionsResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/ai/substitutions
 *
 * Analyzes recipe ingredients against the user's inventory to identify available,
 * partial, and missing ingredients. Uses AI to suggest substitutions from available
 * inventory items, considering user allergies, diets, and available equipment.
 *
 * @param request - Request containing recipe ingredients
 * @returns SubstitutionsResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 403, 429, 500, 502)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 * @security Requires completed onboarding
 *
 * @example
 * // Request body:
 * {
 *   "recipe_ingredients": [
 *     { "name": "śmietana 30%", "quantity": 200, "unit": "ml" }
 *   ]
 * }
 *
 * // Success response:
 * {
 *   "analysis": [
 *     {
 *       "ingredient": "śmietana 30%",
 *       "status": "missing",
 *       "matched_inventory_item": null,
 *       "substitution": {
 *         "available": true,
 *         "suggestion": "Użyj jogurtu greckiego...",
 *         "substitute_item": { "id": "uuid", "name": "Jogurt grecki", "quantity": 500, "unit": "g" }
 *       },
 *       "allergy_warning": null
 *     }
 *   ],
 *   "warnings": [
 *     { "type": "allergy", "message": "Przepis zawiera gluten - masz alergię na gluten!" }
 *   ],
 *   "usage": {
 *     "substitutions_used_today": 5,
 *     "substitutions_remaining": 5
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<SubstitutionsResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const validationResult = substitutionsSchema.safeParse(body);
    if (!validationResult.success) {
      const details: ValidationErrorDetailDTO[] = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const { recipe_ingredients } = validationResult.data;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Fetch profile and check onboarding status
    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) {
      return internalError("Profile not found");
    }

    if (profile.onboarding_status !== "completed") {
      return forbiddenError("Complete onboarding before using AI features");
    }

    // 5. Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, user.id, "substitutions");
    if (!rateLimitResult.allowed) {
      return rateLimitedError("Daily substitution limit exceeded. Try again tomorrow");
    }

    // 6. Fetch user's inventory and profile data in parallel
    const inventoryResult = await listInventoryItems(supabase, user.id, {
      is_available: true, // Only get available items for substitution context
      limit: 100, // Get more items for better substitution matching
    });

    // 7. Build AI context
    const inventoryForAI = convertInventoryForAI(inventoryResult.items);
    const substitutionContext = {
      inventory_items: inventoryForAI,
      user_allergies: profile.allergies,
      user_diets: profile.diets,
      user_equipment: profile.equipment,
    };

    // 8. Call AI to generate substitutions
    let analysis;
    try {
      analysis = await generateSubstitutions(substitutionContext, recipe_ingredients);
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        return externalServiceError(error.message);
      }
      throw error;
    }

    // 9. Generate warnings based on allergies and diets
    const warnings = generateWarnings(recipe_ingredients, profile);

    // 10. Increment usage counter
    await incrementUsage(supabase, user.id, "substitutions");

    // 11. Get updated usage for response
    const updatedRateLimit = await checkRateLimit(supabase, user.id, "substitutions");

    // 12. Return response
    const response: SubstitutionsResponseDTO = {
      analysis,
      warnings,
      usage: {
        substitutions_used_today: updatedRateLimit.used,
        substitutions_remaining: updatedRateLimit.remaining,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in substitutions:", error);
    return internalError();
  }
}
