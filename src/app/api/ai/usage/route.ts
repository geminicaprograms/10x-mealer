import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { getAIUsage } from "@/lib/services/ai.service";
import { unauthorizedError, internalError } from "@/lib/api/errors";
import type { AIUsageDTO, ErrorResponseDTO } from "@/types";

/**
 * GET /api/ai/usage
 *
 * Returns the current user's AI feature usage statistics for the current day,
 * including scans and substitutions consumed vs. daily limits.
 *
 * @returns AIUsageDTO on success (200)
 * @returns ErrorResponseDTO on error (401, 500)
 *
 * @security Requires authentication via Supabase session cookie or Bearer token
 *
 * @example
 * // Success response:
 * {
 *   "date": "2026-01-26",
 *   "receipt_scans": {
 *     "used": 3,
 *     "limit": 5,
 *     "remaining": 2
 *   },
 *   "substitutions": {
 *     "used": 5,
 *     "limit": 10,
 *     "remaining": 5
 *   }
 * }
 */
export async function GET(): Promise<NextResponse<AIUsageDTO | ErrorResponseDTO>> {
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

    // Fetch AI usage statistics
    const usage = await getAIUsage(supabase, user.id);

    return NextResponse.json(usage, { status: 200 });
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return internalError();
  }
}
