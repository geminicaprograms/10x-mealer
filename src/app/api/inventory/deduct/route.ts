import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import { inventoryDeductSchema, deductInventoryQuantities } from "@/lib/services/inventory.service";
import { unauthorizedError, validationError, internalError } from "@/lib/api/errors";
import type { InventoryDeductResponseDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * POST /api/inventory/deduct
 *
 * Deducts quantities from inventory items (used for "Cooked This" feature).
 * Items that reach zero quantity are automatically deleted.
 *
 * @param request - Next.js request object with JSON body
 * @returns InventoryDeductResponseDTO on success (200, 207, 422)
 * @returns ErrorResponseDTO on error (400, 401, 500)
 *
 * @security Requires authentication via Supabase session
 */
export async function POST(request: NextRequest): Promise<NextResponse<InventoryDeductResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const parseResult = inventoryDeductSchema.safeParse(body);
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

    // 4. Process deductions
    const result = await deductInventoryQuantities(supabase, user.id, input.deductions);

    // 5. Determine response status
    let status: number;
    if (result.errors.length === 0) {
      // All deductions processed successfully
      status = 200;
    } else if (result.updated.length > 0) {
      // Partial success
      status = 207;
    } else {
      // All deductions failed
      status = 422;
    }

    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error deducting inventory quantities:", error);
    return internalError();
  }
}
