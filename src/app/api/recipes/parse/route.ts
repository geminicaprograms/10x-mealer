import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  recipeParseSchema,
  validateUrlSecurity,
  fetchRecipeContent,
  extractRecipeContent,
  getDomainFromUrl,
  ContentFetchError,
} from "@/lib/services/recipe.service";
import { parseRecipeFromHTML, ExternalServiceError } from "@/lib/services/openrouter.service";
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
  unprocessableEntityError,
  internalError,
  externalServiceError,
} from "@/lib/api/errors";
import type { RecipeParseResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/recipes/parse
 *
 * Fetches a recipe from an external URL and extracts ingredients using AI.
 * Acts as a server-side proxy to bypass CORS restrictions when scraping recipe websites.
 *
 * Security features:
 * - Domain allowlist (only trusted Polish recipe websites)
 * - SSRF protection (blocks private IPs, localhost, etc.)
 * - HTTPS-only URLs
 * - Content size limits (5MB max)
 * - Request timeout (10 seconds)
 *
 * @param request - Request containing the recipe URL to parse
 * @returns RecipeParseResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 403, 404, 422, 500, 502)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 *
 * @example
 * // Request body:
 * {
 *   "url": "https://www.kwestiasmaku.com/przepis/kurczak-w-sosie"
 * }
 *
 * // Success response:
 * {
 *   "title": "Kurczak w sosie śmietanowym",
 *   "source_url": "https://www.kwestiasmaku.com/przepis/kurczak-w-sosie",
 *   "ingredients": [
 *     {
 *       "name": "filet z kurczaka",
 *       "quantity": 500,
 *       "unit": "g",
 *       "original_text": "500g filetu z kurczaka"
 *     }
 *   ],
 *   "parsing_confidence": 0.88
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<RecipeParseResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema (URL format + HTTPS check)
    const validationResult = recipeParseSchema.safeParse(body);
    if (!validationResult.success) {
      const details: ValidationErrorDetailDTO[] = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const { url } = validationResult.data;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Validate domain allowlist and SSRF protection
    const securityCheck = validateUrlSecurity(url);
    if (!securityCheck.valid) {
      // Use 403 for domain not allowed, as per implementation plan
      return forbiddenError(securityCheck.error ?? "Domain not supported for recipe parsing");
    }

    // 5. Fetch external content
    let fetchedContent;
    try {
      fetchedContent = await fetchRecipeContent(url);
    } catch (error) {
      console.error("Recipe fetch error:", {
        endpoint: "/api/recipes/parse",
        url,
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof ContentFetchError) {
        if (error.statusCode === 404) {
          return notFoundError("Recipe page not found");
        }
        return externalServiceError("Failed to fetch recipe page");
      }
      throw error;
    }

    // 6. Extract recipe content from HTML
    const domain = getDomainFromUrl(url);
    const extractedContent = extractRecipeContent(fetchedContent.html, domain);

    // Log extracted content for debugging
    console.log("Recipe content extraction:", {
      endpoint: "/api/recipes/parse",
      url,
      domain,
      fetchedHtmlLength: fetchedContent.html.length,
      extractedContentLength: extractedContent?.length ?? 0,
      extractedContentPreview: extractedContent?.substring(0, 200) ?? "null",
    });

    if (!extractedContent || extractedContent.trim().length < 50) {
      return unprocessableEntityError("Could not extract recipe content from page");
    }

    // 7. Parse ingredients with LLM
    let parseResult;
    try {
      parseResult = await parseRecipeFromHTML(extractedContent, fetchedContent.title);
    } catch (error) {
      console.error("Recipe LLM parsing error:", {
        endpoint: "/api/recipes/parse",
        url,
        userId: user.id,
        contentLength: extractedContent.length,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof ExternalServiceError) {
        return externalServiceError("Recipe parsing service temporarily unavailable");
      }
      throw error;
    }

    // 8. Validate parsing result
    if (!parseResult.ingredients || parseResult.ingredients.length === 0) {
      return unprocessableEntityError("Could not extract ingredients from content");
    }

    // 9. Return response
    const response: RecipeParseResponseDTO = {
      title: parseResult.title,
      source_url: url,
      ingredients: parseResult.ingredients,
      parsing_confidence: parseResult.confidence,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in recipe URL parsing:", error);
    return internalError();
  }
}
