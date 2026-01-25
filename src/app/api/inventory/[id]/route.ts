import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  inventoryItemUpdateSchema,
  getInventoryItemById,
  updateInventoryItem,
  validateUnitIds,
} from "@/lib/services/inventory.service";
import { unauthorizedError, notFoundError, validationError, internalError } from "@/lib/api/errors";
import type { InventoryItemDTO, ErrorResponseDTO, ValidationErrorDetailDTO } from "@/types";

/**
 * PUT /api/inventory/:id
 *
 * Updates a single inventory item.
 * Cannot change product_id, custom_name, or is_staple.
 *
 * @param request - Next.js request object with JSON body
 * @param params - Route parameters containing the item ID
 * @returns InventoryItemDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 404, 500)
 *
 * @security Requires authentication via Supabase session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<InventoryItemDTO | ErrorResponseDTO>> {
  try {
    // 1. Get and validate item ID from path
    const { id: itemId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) {
      return validationError("Invalid item ID format");
    }

    // 2. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 3. Validate with Zod schema
    const parseResult = inventoryItemUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Validation failed", details);
    }

    const input = parseResult.data;

    // 4. Check if request body has any fields to update
    if (Object.keys(input).length === 0) {
      return validationError("At least one field is required for update");
    }

    // 5. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 6. Fetch existing item (RLS will filter by user)
    const existingItem = await getInventoryItemById(supabase, itemId);

    if (!existingItem) {
      return notFoundError("Inventory item not found");
    }

    // 7. Validate update constraints for staple items
    if (existingItem.is_staple) {
      if (input.quantity !== undefined && input.quantity !== null) {
        return validationError("Cannot set quantity on staple items", [
          { field: "quantity", message: "Staple items cannot have quantity" },
        ]);
      }
      if (input.unit_id !== undefined && input.unit_id !== null) {
        return validationError("Cannot set unit_id on staple items", [
          { field: "unit_id", message: "Staple items cannot have unit_id" },
        ]);
      }
    }

    // 8. Validate unit_id if provided
    if (input.unit_id !== undefined && input.unit_id !== null) {
      const validUnitIds = await validateUnitIds(supabase, [input.unit_id]);
      if (!validUnitIds.has(input.unit_id)) {
        return validationError("Invalid unit_id", [
          { field: "unit_id", message: `unit_id ${input.unit_id} not found in units table` },
        ]);
      }
    }

    // 9. Update item
    const updatedItem = await updateInventoryItem(supabase, itemId, input);

    if (!updatedItem) {
      return notFoundError("Inventory item not found");
    }

    // 10. Return updated item
    return NextResponse.json(updatedItem, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return internalError();
  }
}
