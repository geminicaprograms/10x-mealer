import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getProductById, productIdSchema } from "@/lib/services/product.service";
import { unauthorizedError, validationError, notFoundError, internalError } from "@/lib/api/errors";
import type { ProductDTO, ErrorResponseDTO } from "@/types";

/**
 * Route params type for Next.js 15 dynamic routes.
 * The params object is a Promise in the App Router.
 */
interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/:id
 *
 * Retrieves a single product by its ID with expanded relations.
 * Used for detailed product view or reference lookups.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing the product ID
 * @returns ProductDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 404, 500)
 *
 * Path Parameters:
 * - id (required): Product catalog ID (positive integer)
 *
 * @security Requires authentication via Supabase session
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ProductDTO | ErrorResponseDTO>> {
  try {
    // 1. Extract and validate path parameter
    const { id: rawId } = await params;
    const parseResult = productIdSchema.safeParse(rawId);

    if (!parseResult.success) {
      return validationError("Invalid product ID");
    }

    const productId = parseResult.data;

    // 2. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 3. Fetch product from database
    const product = await getProductById(supabase, productId);

    // 4. Handle not found case
    if (!product) {
      return notFoundError("Product not found");
    }

    // 5. Return successful response
    return NextResponse.json(product, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300", // 5 minutes cache for product details
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return internalError();
  }
}
