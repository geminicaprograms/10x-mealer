import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/db/supabase/server";
import {
  inventoryListQuerySchema,
  inventoryCreateSchema,
  inventoryDeleteSchema,
  listInventoryItems,
  createInventoryItems,
  deleteInventoryItems,
} from "@/lib/services/inventory.service";
import { unauthorizedError, validationError, internalError } from "@/lib/api/errors";
import type {
  InventoryListResponseDTO,
  InventoryCreateResponseDTO,
  InventoryDeleteResponseDTO,
  ErrorResponseDTO,
  ValidationErrorDetailDTO,
} from "@/types";

/**
 * GET /api/inventory
 *
 * Lists inventory items with filtering, sorting, and pagination.
 *
 * @param request - Next.js request object with query parameters
 * @returns InventoryListResponseDTO on success (200)
 * @returns ErrorResponseDTO on error (400, 401, 500)
 *
 * @security Requires authentication via Supabase session
 */
export async function GET(request: NextRequest): Promise<NextResponse<InventoryListResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // 2. Validate query parameters with Zod
    const parseResult = inventoryListQuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      const details: ValidationErrorDetailDTO[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationError("Invalid query parameters", details);
    }

    const params = parseResult.data;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError();
    }

    // 4. Fetch inventory items
    const { items, total } = await listInventoryItems(supabase, user.id, {
      is_staple: params.is_staple,
      is_available: params.is_available,
      category_id: params.category_id,
      search: params.search,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
      page: params.page,
      limit: params.limit,
    });

    // 5. Return paginated response
    const response: InventoryListResponseDTO = {
      data: items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total_items: total,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error listing inventory items:", error);
    return internalError();
  }
}

/**
 * POST /api/inventory
 *
 * Creates inventory items in batch (up to 50 items per request).
 *
 * @param request - Next.js request object with JSON body
 * @returns InventoryCreateResponseDTO on success (201, 207, 422)
 * @returns ErrorResponseDTO on error (400, 401, 500)
 *
 * @security Requires authentication via Supabase session
 */
export async function POST(request: NextRequest): Promise<NextResponse<InventoryCreateResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const parseResult = inventoryCreateSchema.safeParse(body);
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

    // 4. Create inventory items
    const result = await createInventoryItems(supabase, user.id, input.items);

    // 5. Determine response status
    let status: number;
    if (result.errors.length === 0) {
      // All items created successfully
      status = 201;
    } else if (result.created.length > 0) {
      // Partial success
      status = 207;
    } else {
      // All items failed
      status = 422;
    }

    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error creating inventory items:", error);
    return internalError();
  }
}

/**
 * DELETE /api/inventory
 *
 * Deletes inventory items in batch (up to 50 items per request).
 *
 * @param request - Next.js request object with JSON body
 * @returns InventoryDeleteResponseDTO on success (200, 207, 422)
 * @returns ErrorResponseDTO on error (400, 401, 500)
 *
 * @security Requires authentication via Supabase session
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<InventoryDeleteResponseDTO | ErrorResponseDTO>> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON in request body");
    }

    // 2. Validate with Zod schema
    const parseResult = inventoryDeleteSchema.safeParse(body);
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

    // 4. Delete inventory items
    const result = await deleteInventoryItems(supabase, user.id, input.ids);

    // 5. Determine response status
    let status: number;
    if (result.errors.length === 0) {
      // All items deleted successfully
      status = 200;
    } else if (result.deleted.length > 0) {
      // Partial success
      status = 207;
    } else {
      // All deletions failed
      status = 422;
    }

    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error deleting inventory items:", error);
    return internalError();
  }
}
