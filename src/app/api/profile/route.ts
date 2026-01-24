import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getProfileByUserId } from "@/lib/services/profile.service";
import { unauthorizedError, notFoundError, internalError } from "@/lib/api/errors";
import type { ProfileDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/profile
 *
 * Retrieves the authenticated user's profile containing preferences
 * for allergies, diets, equipment, and onboarding status.
 *
 * @returns ProfileDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 404, 500)
 *
 * @security Requires authentication via Supabase session cookie
 */
export async function GET(): Promise<NextResponse<ProfileDTO | ErrorResponseDTO>> {
  try {
    const supabase = await createClient();

    // Get authenticated user - validates JWT server-side
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Handle authentication errors or missing user
    if (authError || !user) {
      return unauthorizedError();
    }

    // Fetch user's profile from database
    const profile = await getProfileByUserId(supabase, user.id);

    // Handle missing profile (rare - should be auto-created by database trigger)
    if (!profile) {
      console.warn(`Profile not found for user ${user.id}. This may indicate a trigger failure.`);
      return notFoundError("Profile not found");
    }

    // Return profile with no-cache headers to ensure fresh data
    return NextResponse.json(profile, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    // Log the full error for debugging
    console.error("Error fetching profile:", error);

    // Return generic error to client (don't expose internal details)
    return internalError();
  }
}
