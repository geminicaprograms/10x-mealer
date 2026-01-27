import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  deleteAccountSchema,
  verifyConfirmationText,
  verifyUserPassword,
  deleteUserAccount,
  signOutUser,
} from "@/lib/services/auth.service";
import { unauthorizedError, validationError, forbiddenError, internalError } from "@/lib/api/errors";
import type { DeleteAccountResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/auth/delete-account
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires password verification and explicit confirmation text.
 *
 * @security Requires authentication + password re-verification
 *
 * Request body:
 * - password: string (required) - User's current password
 * - confirmation: string (required) - Must be exactly "USUŃ MOJE KONTO"
 *
 * Responses:
 * - 200: Account deleted successfully
 * - 400: Validation error (missing/invalid fields)
 * - 401: Not authenticated
 * - 403: Invalid password or confirmation
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<DeleteAccountResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const parseResult = deleteAccountSchema.safeParse(body);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const { password, confirmation } = parseResult.data;

    // 3. Create Supabase client and authenticate
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Verify confirmation text
    if (!verifyConfirmationText(confirmation)) {
      console.warn("Account deletion failed: confirmation mismatch", {
        userId: user.id,
      });
      return forbiddenError("Invalid password or confirmation");
    }

    // 5. Verify password (requires user email)
    if (!user.email) {
      console.error("User has no email address", { userId: user.id });
      return internalError();
    }

    const passwordValid = await verifyUserPassword(supabase, user.email, password);

    if (!passwordValid) {
      console.warn("Account deletion failed: password mismatch", {
        userId: user.id,
      });
      return forbiddenError("Invalid password or confirmation");
    }

    // 6. Delete user account (cascades to all related data)
    await deleteUserAccount(user.id);

    // 7. Sign out to clear session
    await signOutUser(supabase);

    // 8. Return success response
    const response: DeleteAccountResponseDTO = {
      message: "Konto zostało usunięte pomyślnie",
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return internalError();
  }
}
