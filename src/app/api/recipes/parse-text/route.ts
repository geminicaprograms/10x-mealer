import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { recipeParseTextSchema } from "@/lib/services/recipe.service";
import { parseRecipeFromText, ExternalServiceError } from "@/lib/services/openrouter.service";
import {
  unauthorizedError,
  validationError,
  unprocessableEntityError,
  internalError,
  externalServiceError,
} from "@/lib/api/errors";
import type { RecipeParseTextResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/recipes/parse-text
 *
 * Parses raw recipe text (copy-pasted ingredients) to extract structured ingredient data.
 * Uses AI/LLM capabilities to intelligently parse Polish recipe ingredients, extracting
 * product names, quantities, and units from unstructured text.
 *
 * This endpoint serves as a fallback when URL parsing fails or is unavailable.
 *
 * @param request - Request containing raw recipe text
 * @returns RecipeParseTextResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 422, 500, 502)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 *
 * @example
 * // Request body:
 * {
 *   "text": "Składniki:\n- 500g filetu z kurczaka\n- 200 ml śmietany 30%\n- 2 cebule"
 * }
 *
 * // Success response:
 * {
 *   "ingredients": [
 *     {
 *       "name": "filet z kurczaka",
 *       "quantity": 500,
 *       "unit": "g",
 *       "original_text": "500g filetu z kurczaka"
 *     },
 *     {
 *       "name": "śmietana 30%",
 *       "quantity": 200,
 *       "unit": "ml",
 *       "original_text": "200 ml śmietany 30%"
 *     },
 *     {
 *       "name": "cebula",
 *       "quantity": 2,
 *       "unit": "szt.",
 *       "original_text": "2 cebule"
 *     }
 *   ],
 *   "parsing_confidence": 0.82
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<RecipeParseTextResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const validationResult = recipeParseTextSchema.safeParse(body);
    if (!validationResult.success) {
      const details: ValidationErrorDetailDTO[] = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const { text } = validationResult.data;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Parse ingredients with LLM
    let parseResult;
    try {
      parseResult = await parseRecipeFromText(text);
    } catch (error) {
      console.error("Recipe text parsing error:", {
        endpoint: "/api/recipes/parse-text",
        userId: user.id,
        textLength: text.length,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof ExternalServiceError) {
        return externalServiceError("Recipe parsing service temporarily unavailable");
      }
      throw error;
    }

    // 5. Validate parsing result
    if (!parseResult.ingredients || parseResult.ingredients.length === 0) {
      return unprocessableEntityError("Could not extract ingredients from text");
    }

    // 6. Return response
    const response: RecipeParseTextResponseDTO = {
      ingredients: parseResult.ingredients,
      parsing_confidence: parseResult.confidence,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in recipe text parsing:", error);
    return internalError();
  }
}
