import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getAllStapleDefinitions } from "@/lib/services/lookup.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { StaplesResponseDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/staples
 *
 * Retrieves all active staple definitions with product information.
 * Staples are common pantry items (salt, pepper, oil, etc.) that users
 * can quickly add to their inventory.
 *
 * @returns StaplesResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 *
 * @example
 * // Success response:
 * {
 *   "data": [
 *     {
 *       "id": 1,
 *       "product": { "id": 100, "name_pl": "Sól" },
 *       "is_active": true
 *     },
 *     {
 *       "id": 2,
 *       "product": { "id": 101, "name_pl": "Pieprz czarny" },
 *       "is_active": true
 *     }
 *   ]
 * }
 */
export async function GET(): Promise<NextResponse<StaplesResponseDTO | ErrorResponseDTO>> {
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

    // Fetch all active staple definitions
    const staples = await getAllStapleDefinitions(supabase);

    return NextResponse.json(
      { data: staples },
      {
        status: 200,
        headers: {
          // Cache for 1 hour, serve stale while revalidating for up to 24 hours
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching staples:", error);
    return internalError();
  }
}
