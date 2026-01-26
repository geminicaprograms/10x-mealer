import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getAllUnits } from "@/lib/services/lookup.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { UnitsResponseDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/units
 *
 * Retrieves all measurement units for use in inventory tracking.
 * Units are ordered by type (weight, volume, count) and then by name.
 *
 * @returns UnitsResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 *
 * @example
 * // Success response:
 * {
 *   "data": [
 *     { "id": 1, "name_pl": "gram", "abbreviation": "g", "unit_type": "weight", "base_unit_multiplier": 1 },
 *     { "id": 8, "name_pl": "szklanka", "abbreviation": "szkl.", "unit_type": "volume", "base_unit_multiplier": 250 }
 *   ]
 * }
 */
export async function GET(): Promise<NextResponse<UnitsResponseDTO | ErrorResponseDTO>> {
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

    // Fetch all units
    const units = await getAllUnits(supabase);

    return NextResponse.json(
      { data: units },
      {
        status: 200,
        headers: {
          // Cache for 1 hour, serve stale while revalidating for up to 24 hours
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching units:", error);
    return internalError();
  }
}
