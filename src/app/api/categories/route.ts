import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getAllCategories } from "@/lib/services/lookup.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { CategoriesResponseDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/categories
 *
 * Retrieves all product categories for filtering and organization.
 * Categories are ordered by display_order for consistent UI presentation.
 *
 * @returns CategoriesResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 *
 * @example
 * // Success response:
 * {
 *   "data": [
 *     { "id": 1, "name_pl": "Warzywa", "display_order": 1 },
 *     { "id": 2, "name_pl": "Owoce", "display_order": 2 }
 *   ]
 * }
 */
export async function GET(): Promise<NextResponse<CategoriesResponseDTO | ErrorResponseDTO>> {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // Fetch all categories
    const categories = await getAllCategories(supabase);

    return NextResponse.json(
      { data: categories },
      {
        status: 200,
        headers: {
          // Cache for 1 hour, serve stale while revalidating for up to 24 hours
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return internalError();
  }
}
