import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  getProfileByUserId,
  updateProfileByUserId,
  profileUpdateSchema,
  getSupportedProfileValues,
  validateProfileValues,
} from "@/lib/services/profile.service";
import {
  unauthorizedError,
  notFoundError,
  validationError,
  unprocessableEntityError,
  internalError,
} from "@/lib/api/errors";
import type { ProfileDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

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

/**
 * PUT /api/profile
 *
 * Updates the authenticated user's profile preferences.
 * Supports partial updates - only provided fields are modified.
 *
 * @param request - Next.js request object containing JSON body
 * @returns ProfileDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 404, 422, 500)
 *
 * @security Requires authentication via Supabase session cookie
 */
export async function PUT(request: NextRequest): Promise<NextResponse<ProfileDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const parseResult = profileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const input = parseResult.data;

    // 3. Check if request body has any fields to update
    if (Object.keys(input).length === 0) {
      return validationError("At least one field is required for update");
    }

    // 4. Create Supabase client and authenticate
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 5. Fetch supported values from system_config
    const supportedValues = await getSupportedProfileValues(supabase);

    // 6. Validate values against system config
    const validationResult = validateProfileValues(input, supportedValues);
    if (!validationResult.isValid) {
      return unprocessableEntityError("Invalid values provided", validationResult.errors);
    }

    // 7. Update profile
    const updatedProfile = await updateProfileByUserId(supabase, user.id, input);

    // 8. Handle profile not found (rare - should be auto-created by trigger)
    if (!updatedProfile) {
      console.warn(`Profile not found for user ${user.id} during update.`);
      return notFoundError("Profile not found");
    }

    // 9. Return updated profile with no-cache headers
    return NextResponse.json(updatedProfile, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return internalError();
  }
}
