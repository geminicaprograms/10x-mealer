import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { searchProducts, productSearchQuerySchema } from "@/lib/services/product.service";
import { unauthorizedError, validationError, internalError } from "@/lib/api/errors";
import type { ProductSearchResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * GET /api/products/search
 *
 * Searches the product catalog for autocomplete functionality.
 * Returns products matching the search query with optional category filtering.
 *
 * @param request - Next.js request object with query parameters
 * @returns ProductSearchResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 500)
 *
 * Query Parameters:
 * - q (required): Search query, minimum 2 characters
 * - category_id (optional): Filter by product category ID
 * - limit (optional): Maximum results to return (1-20, default 10)
 *
 * @security Requires authentication via Supabase session
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProductSearchResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse query parameters from URL
    const { searchParams } = new URL(request.url);
    const rawParams = {
      q: searchParams.get("q") ?? undefined,
      category_id: searchParams.get("category_id") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    // 2. Validate query parameters with Zod
    const parseResult = productSearchQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "q",
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const params = parseResult.data;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Execute search
    const products = await searchProducts(supabase, params);

    // 5. Return successful response
    const response: ProductSearchResponseDTO = {
      data: products,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300", // 5 minutes cache for autocomplete
      },
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return internalError();
  }
}
