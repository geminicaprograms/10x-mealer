import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getSystemConfig } from "@/lib/services/config.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { SystemConfigDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/config
 *
 * Retrieves system configuration including supported profile values
 * (allergies, diets, equipment) and rate limits for AI features.
 *
 * @returns SystemConfigDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 *
 * @example
 * // Success response:
 * {
 *   "supported_allergies": ["gluten", "laktoza", "orzechy", ...],
 *   "supported_diets": ["wegetariańska", "wegańska", "bezglutenowa", ...],
 *   "supported_equipment": ["piekarnik", "kuchenka mikrofalowa", "blender", ...],
 *   "rate_limits": {
 *     "receipt_scans_per_day": 5,
 *     "substitutions_per_day": 10
 *   }
 * }
 */
export async function GET(): Promise<NextResponse<SystemConfigDTO | ErrorResponseDTO>> {
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

    // Fetch system configuration
    const config = await getSystemConfig(supabase);

    // Config may change more frequently than lookup tables (e.g., rate limits)
    // Use shorter cache time: 5 minutes max-age, 1 hour stale-while-revalidate
    return NextResponse.json(config, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return internalError();
  }
}
