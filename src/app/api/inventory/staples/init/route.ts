import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { staplesInitSchema, initializeStaples } from "@/lib/services/inventory.service";
import { unauthorizedError, validationError, internalError } from "@/lib/api/errors";
import type { StaplesInitResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/inventory/staples/init
 *
 * Initializes user's staples from system staple definitions.
 * Staples are common pantry items (salt, pepper, oil, etc.) that users typically have on hand.
 *
 * Request Body (optional):
 * - overwrite: boolean (default: false)
 *   - false: Only creates staples that don't exist
 *   - true: Creates missing staples AND resets all staples to is_available=true
 *
 * @param request - Next.js request object with optional JSON body
 * @returns StaplesInitResponseDTO on success (200, 201)
 * @returns ErrorResponseDTO on error (400, 401, 500)
 *
 * @security Requires authentication via Supabase session
 */
export async function POST(request: NextRequest): Promise<NextResponse<StaplesInitResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body (handle empty body)
    let body: unknown = {};
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        const text = await request.text();
        if (text.trim()) {
          body = JSON.parse(text);
        }
      } catch {
        return validationError("Invalid JSON in request body");
      }
    }

    // 2. Validate with Zod schema
    const parseResult = staplesInitSchema.safeParse(body);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const input = parseResult.data;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Initialize staples
    const result = await initializeStaples(supabase, user.id, {
      overwrite: input.overwrite,
    });

    // 5. Determine response status
    // 201 Created: All staples were newly created (none skipped, not in overwrite mode)
    // 200 OK: Some staples existed or in overwrite mode
    const status = result.created > 0 && result.skipped === 0 && !input.overwrite ? 201 : 200;

    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error initializing staples:", error);
    return internalError();
  }
}
