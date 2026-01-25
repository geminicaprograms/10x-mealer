import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase/server";
import type { TablesInsert } from "@/db/supabase/database.types";
import type {
  InventoryItemDTO,
  InventoryListQueryParams,
  InventoryCreateResponseDTO,
  InventoryDeleteResponseDTO,
  InventoryDeductResponseDTO,
  InventoryDeductionResultDTO,
  InventoryDeductionItemCommand,
  InventoryItemCreateCommand,
  InventoryItemUpdateCommand,
  InventoryStapleItemDTO,
  StaplesInitResponseDTO,
  ProductBriefDTO,
  CategoryBriefDTO,
  UnitBriefDTO,
  BatchOperationErrorByIndexDTO,
  BatchOperationErrorByIdDTO,
} from "@/types";

// =============================================================================
// Database Row Types
// =============================================================================

/** Combined type for inventory item with joined relations */
interface InventoryItemWithRelations {
  id: string;
  product_id: number | null;
  custom_name: string | null;
  quantity: number | null;
  unit_id: number | null;
  is_staple: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  product_catalog: {
    id: number;
    name_pl: string;
    product_categories: {
      id: number;
      name_pl: string;
    } | null;
  } | null;
  units: {
    id: number;
    name_pl: string;
    abbreviation: string;
  } | null;
}

/** Staple definition with joined product for initialization */
interface StapleDefinitionWithProduct {
  id: number;
  product_id: number;
  product_catalog: {
    id: number;
    name_pl: string;
  };
}

/** User's existing staple item for comparison */
interface ExistingStapleItem {
  id: string;
  product_id: number | null;
  is_available: boolean;
}

/** Staple inventory item with product for response */
interface StapleItemWithProduct {
  id: string;
  product_id: number | null;
  is_available: boolean;
  product_catalog: {
    id: number;
    name_pl: string;
  } | null;
}

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Zod schema for GET /api/inventory query parameters.
 * Transforms string values from query params to appropriate types.
 */
export const inventoryListQuerySchema = z.object({
  is_staple: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  is_available: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  category_id: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), {
      message: "category_id must be a positive integer",
    }),
  search: z.string().max(100, "search cannot exceed 100 characters").optional(),
  sort_by: z.enum(["name", "created_at", "updated_at"]).optional().default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => Number.isInteger(v) && v >= 1, {
      message: "page must be a positive integer",
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 100, {
      message: "limit must be between 1 and 100",
    }),
});

export type InventoryListQueryInput = z.infer<typeof inventoryListQuerySchema>;

/**
 * Zod schema for a single inventory item in batch create.
 * Ensures either product_id OR custom_name is provided.
 * Enforces staple constraints (no quantity/unit for staples).
 */
export const inventoryItemCreateSchema = z
  .object({
    product_id: z.number().int().positive("product_id must be a positive integer").nullable().optional(),
    custom_name: z
      .string()
      .min(1, "custom_name cannot be empty")
      .max(200, "custom_name cannot exceed 200 characters")
      .nullable()
      .optional(),
    quantity: z.number().positive("quantity must be a positive number").nullable().optional(),
    unit_id: z.number().int().positive("unit_id must be a positive integer").nullable().optional(),
    is_staple: z.boolean().optional().default(false),
  })
  .refine((data) => data.product_id != null || (data.custom_name != null && data.custom_name !== ""), {
    message: "Either product_id or custom_name must be provided",
    path: ["product_id"],
  })
  .refine((data) => !data.is_staple || (data.quantity == null && data.unit_id == null), {
    message: "Staple items cannot have quantity or unit_id",
    path: ["is_staple"],
  });

/**
 * Zod schema for POST /api/inventory batch create.
 * Limits batch size to 50 items.
 */
export const inventoryCreateSchema = z.object({
  items: z
    .array(inventoryItemCreateSchema)
    .min(1, "At least one item is required")
    .max(50, "Maximum 50 items per request"),
});

export type InventoryCreateInput = z.infer<typeof inventoryCreateSchema>;

/**
 * Zod schema for PUT /api/inventory/:id update.
 * Cannot change product_id, custom_name, or is_staple.
 */
export const inventoryItemUpdateSchema = z.object({
  quantity: z.number().positive("quantity must be a positive number").nullable().optional(),
  unit_id: z.number().int().positive("unit_id must be a positive integer").nullable().optional(),
  is_available: z.boolean().optional(),
});

export type InventoryItemUpdateInput = z.infer<typeof inventoryItemUpdateSchema>;

/**
 * Zod schema for DELETE /api/inventory batch delete.
 * Limits batch size to 50 items.
 */
export const inventoryDeleteSchema = z.object({
  ids: z
    .array(z.string().uuid("Each id must be a valid UUID"))
    .min(1, "At least one id is required")
    .max(50, "Maximum 50 items per request"),
});

export type InventoryDeleteInput = z.infer<typeof inventoryDeleteSchema>;

/**
 * Zod schema for a single deduction item.
 */
export const inventoryDeductionItemSchema = z.object({
  inventory_item_id: z.string().uuid("inventory_item_id must be a valid UUID"),
  quantity: z.number().positive("quantity must be a positive number"),
});

/**
 * Zod schema for POST /api/inventory/deduct.
 */
export const inventoryDeductSchema = z.object({
  deductions: z.array(inventoryDeductionItemSchema).min(1, "At least one deduction is required"),
});

export type InventoryDeductInput = z.infer<typeof inventoryDeductSchema>;

/**
 * Zod schema for POST /api/inventory/staples/init.
 * Validates optional overwrite flag.
 */
export const staplesInitSchema = z.object({
  overwrite: z.boolean().optional().default(false),
});

export type StaplesInitInput = z.infer<typeof staplesInitSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escapes special characters in a search string for use in ILIKE patterns.
 * Escapes %, _, and \ characters that have special meaning in PostgreSQL LIKE patterns.
 *
 * @param search - The raw search string
 * @returns Escaped search string safe for ILIKE
 */
function escapeSearchPattern(search: string): string {
  return search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// =============================================================================
// Foreign Key Validation Functions
// =============================================================================

/**
 * Validates that product_ids exist in the product_catalog table.
 *
 * @param supabase - Supabase client instance
 * @param productIds - Array of product IDs to validate
 * @returns Set of valid product IDs
 */
export async function validateProductIds(supabase: SupabaseClient, productIds: number[]): Promise<Set<number>> {
  if (productIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase.from("product_catalog").select("id").in("id", productIds);

  if (error) {
    throw error;
  }

  return new Set(data?.map((row) => row.id) ?? []);
}

/**
 * Validates that unit_ids exist in the units table.
 *
 * @param supabase - Supabase client instance
 * @param unitIds - Array of unit IDs to validate
 * @returns Set of valid unit IDs
 */
export async function validateUnitIds(supabase: SupabaseClient, unitIds: number[]): Promise<Set<number>> {
  if (unitIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase.from("units").select("id").in("id", unitIds);

  if (error) {
    throw error;
  }

  return new Set(data?.map((row) => row.id) ?? []);
}

// =============================================================================
// Mapping Functions
// =============================================================================

/**
 * Maps a database row with relations to the InventoryItemDTO format.
 *
 * @param row - Database row with joined relations
 * @returns InventoryItemDTO
 */
export function mapInventoryRowToDTO(row: InventoryItemWithRelations): InventoryItemDTO {
  let product: ProductBriefDTO | null = null;
  if (row.product_catalog) {
    let category: CategoryBriefDTO | null = null;
    if (row.product_catalog.product_categories) {
      category = {
        id: row.product_catalog.product_categories.id,
        name_pl: row.product_catalog.product_categories.name_pl,
      };
    }
    product = {
      id: row.product_catalog.id,
      name_pl: row.product_catalog.name_pl,
      category,
    };
  }

  let unit: UnitBriefDTO | null = null;
  if (row.units) {
    unit = {
      id: row.units.id,
      name_pl: row.units.name_pl,
      abbreviation: row.units.abbreviation,
    };
  }

  return {
    id: row.id,
    product_id: row.product_id,
    product,
    custom_name: row.custom_name,
    quantity: row.quantity,
    unit,
    is_staple: row.is_staple,
    is_available: row.is_available,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Maps a staple inventory row to InventoryStapleItemDTO format.
 *
 * @param row - Database row with joined product
 * @returns InventoryStapleItemDTO
 */
export function mapStapleRowToDTO(row: StapleItemWithProduct): InventoryStapleItemDTO {
  return {
    id: row.id,
    product_id: row.product_id,
    product: row.product_catalog
      ? {
          id: row.product_catalog.id,
          name_pl: row.product_catalog.name_pl,
        }
      : null,
    is_staple: true,
    is_available: row.is_available,
  };
}

// =============================================================================
// Data Access Functions
// =============================================================================

/**
 * Lists inventory items with filtering, sorting, and pagination.
 * RLS policies automatically filter by user_id based on the authenticated session.
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's UUID (used by RLS, not in query)
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns Object containing items array and total count
 */
export async function listInventoryItems(
  supabase: SupabaseClient,
  _userId: string,
  params: InventoryListQueryParams
): Promise<{ items: InventoryItemDTO[]; total: number }> {
  const { is_staple, is_available, category_id, search, sort_by, sort_order, page = 1, limit = 50 } = params;

  // Build base query with relations
  let query = supabase.from("inventory_items").select(
    `
      id,
      product_id,
      custom_name,
      quantity,
      unit_id,
      is_staple,
      is_available,
      created_at,
      updated_at,
      user_id,
      product_catalog (
        id,
        name_pl,
        product_categories (
          id,
          name_pl
        )
      ),
      units (
        id,
        name_pl,
        abbreviation
      )
    `,
    { count: "exact" }
  );

  // Apply filters
  if (is_staple !== undefined) {
    query = query.eq("is_staple", is_staple);
  }

  if (is_available !== undefined) {
    query = query.eq("is_available", is_available);
  }

  if (category_id !== undefined) {
    // Filter by category through product_catalog relation
    query = query.eq("product_catalog.category_id", category_id);
  }

  if (search) {
    // Search in product name or custom name (case-insensitive)
    // Escape special LIKE characters to prevent pattern injection
    const escapedSearch = escapeSearchPattern(search);
    query = query.or(`custom_name.ilike.%${escapedSearch}%,product_catalog.name_pl.ilike.%${escapedSearch}%`);
  }

  // Apply sorting
  const sortAscending = sort_order === "asc";
  if (sort_by === "name") {
    // Sort by custom_name first, then product name
    query = query.order("custom_name", { ascending: sortAscending, nullsFirst: false });
  } else {
    query = query.order(sort_by ?? "created_at", { ascending: sortAscending });
  }

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  // Map rows to DTOs
  const items = (data ?? []).map((row) => mapInventoryRowToDTO(row as unknown as InventoryItemWithRelations));

  return {
    items,
    total: count ?? 0,
  };
}

/**
 * Fetches a single inventory item by ID with relations.
 *
 * @param supabase - Supabase client instance
 * @param itemId - UUID of the inventory item
 * @returns InventoryItemDTO if found, null otherwise
 */
export async function getInventoryItemById(supabase: SupabaseClient, itemId: string): Promise<InventoryItemDTO | null> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      `
      id,
      product_id,
      custom_name,
      quantity,
      unit_id,
      is_staple,
      is_available,
      created_at,
      updated_at,
      user_id,
      product_catalog (
        id,
        name_pl,
        product_categories (
          id,
          name_pl
        )
      ),
      units (
        id,
        name_pl,
        abbreviation
      )
    `
    )
    .eq("id", itemId)
    .single();

  if (error) {
    // PGRST116: "The result contains 0 rows" - item not found
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return mapInventoryRowToDTO(data as unknown as InventoryItemWithRelations);
}

/**
 * Creates inventory items in batch.
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's UUID
 * @param items - Array of items to create
 * @returns Response with created items, errors, and summary
 */
export async function createInventoryItems(
  supabase: SupabaseClient,
  userId: string,
  items: InventoryItemCreateCommand[]
): Promise<InventoryCreateResponseDTO> {
  const errors: BatchOperationErrorByIndexDTO[] = [];
  const validInserts: Array<{
    index: number;
    data: TablesInsert<"inventory_items">;
  }> = [];

  // Extract all product_ids and unit_ids for batch validation
  const productIds = items
    .map((item, index) => ({ id: item.product_id, index }))
    .filter((item): item is { id: number; index: number } => item.id != null);

  const unitIds = items
    .map((item, index) => ({ id: item.unit_id, index }))
    .filter((item): item is { id: number; index: number } => item.id != null);

  // Validate foreign keys in parallel
  const [validProductIds, validUnitIds] = await Promise.all([
    validateProductIds(
      supabase,
      productIds.map((p) => p.id)
    ),
    validateUnitIds(
      supabase,
      unitIds.map((u) => u.id)
    ),
  ]);

  // Process each item
  items.forEach((item, index) => {
    // Check product_id validity
    if (item.product_id != null && !validProductIds.has(item.product_id)) {
      errors.push({
        index,
        error: `product_id ${item.product_id} not found in product_catalog`,
      });
      return;
    }

    // Check unit_id validity
    if (item.unit_id != null && !validUnitIds.has(item.unit_id)) {
      errors.push({
        index,
        error: `unit_id ${item.unit_id} not found in units table`,
      });
      return;
    }

    // Prepare insert data
    validInserts.push({
      index,
      data: {
        user_id: userId,
        product_id: item.product_id ?? null,
        custom_name: item.custom_name ?? null,
        quantity: item.quantity ?? null,
        unit_id: item.unit_id ?? null,
        is_staple: item.is_staple ?? false,
        is_available: item.is_staple ? true : false, // Staples default to available
      },
    });
  });

  // Batch insert valid items
  const createdItems: InventoryItemDTO[] = [];

  if (validInserts.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("inventory_items")
      .insert(validInserts.map((v) => v.data))
      .select("id");

    if (insertError) {
      throw insertError;
    }

    // Fetch created items with relations
    if (insertedRows && insertedRows.length > 0) {
      const createdIds = insertedRows.map((row) => row.id);
      const { data: fullItems, error: fetchError } = await supabase
        .from("inventory_items")
        .select(
          `
          id,
          product_id,
          custom_name,
          quantity,
          unit_id,
          is_staple,
          is_available,
          created_at,
          updated_at,
          user_id,
          product_catalog (
            id,
            name_pl,
            product_categories (
              id,
              name_pl
            )
          ),
          units (
            id,
            name_pl,
            abbreviation
          )
        `
        )
        .in("id", createdIds);

      if (fetchError) {
        throw fetchError;
      }

      createdItems.push(
        ...(fullItems ?? []).map((row) => mapInventoryRowToDTO(row as unknown as InventoryItemWithRelations))
      );
    }
  }

  return {
    created: createdItems,
    errors,
    summary: {
      total: items.length,
      created: createdItems.length,
      failed: errors.length,
    },
  };
}

/**
 * Updates a single inventory item.
 *
 * @param supabase - Supabase client instance
 * @param itemId - UUID of the item to update
 * @param data - Update data
 * @returns Updated InventoryItemDTO if successful, null if not found
 */
export async function updateInventoryItem(
  supabase: SupabaseClient,
  itemId: string,
  data: InventoryItemUpdateCommand
): Promise<InventoryItemDTO | null> {
  // Build update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.quantity !== undefined) {
    updateData.quantity = data.quantity;
  }
  if (data.unit_id !== undefined) {
    updateData.unit_id = data.unit_id;
  }
  if (data.is_available !== undefined) {
    updateData.is_available = data.is_available;
  }

  const { error: updateError } = await supabase.from("inventory_items").update(updateData).eq("id", itemId);

  if (updateError) {
    throw updateError;
  }

  // Fetch updated item with relations
  return getInventoryItemById(supabase, itemId);
}

/**
 * Deletes inventory items in batch.
 * RLS policies automatically filter by user_id based on the authenticated session.
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's UUID (used by RLS, not in query)
 * @param ids - Array of item UUIDs to delete
 * @returns Response with deleted IDs, errors, and summary
 */
export async function deleteInventoryItems(
  supabase: SupabaseClient,
  _userId: string,
  ids: string[]
): Promise<InventoryDeleteResponseDTO> {
  const errors: BatchOperationErrorByIdDTO[] = [];

  // First, verify which items exist (RLS will filter by user)
  const { data: existingItems, error: fetchError } = await supabase.from("inventory_items").select("id").in("id", ids);

  if (fetchError) {
    throw fetchError;
  }

  const existingIds = new Set(existingItems?.map((item) => item.id) ?? []);

  // Track not found items
  ids.forEach((id) => {
    if (!existingIds.has(id)) {
      errors.push({
        id,
        error: "Item not found or does not belong to user",
      });
    }
  });

  // Delete existing items
  const idsToDelete = ids.filter((id) => existingIds.has(id));
  const deletedIds: string[] = [];

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("inventory_items").delete().in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }

    deletedIds.push(...idsToDelete);
  }

  return {
    deleted: deletedIds,
    errors,
    summary: {
      total: ids.length,
      deleted: deletedIds.length,
      failed: errors.length,
    },
  };
}

/**
 * Deducts quantities from inventory items (used for "Cooked This" feature).
 * Items that reach zero quantity are deleted.
 * If the same item appears multiple times in deductions, the quantities are aggregated.
 * RLS policies automatically filter by user_id based on the authenticated session.
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's UUID (used by RLS, not in query)
 * @param deductions - Array of deduction commands
 * @returns Response with updated items, errors, and summary
 */
export async function deductInventoryQuantities(
  supabase: SupabaseClient,
  _userId: string,
  deductions: InventoryDeductionItemCommand[]
): Promise<InventoryDeductResponseDTO> {
  const errors: BatchOperationErrorByIdDTO[] = [];
  const results: InventoryDeductionResultDTO[] = [];

  // Aggregate deductions for the same item (handle duplicates)
  const aggregatedDeductions = new Map<string, number>();
  for (const deduction of deductions) {
    const currentAmount = aggregatedDeductions.get(deduction.inventory_item_id) ?? 0;
    aggregatedDeductions.set(deduction.inventory_item_id, currentAmount + deduction.quantity);
  }

  // Extract unique item IDs
  const itemIds = [...aggregatedDeductions.keys()];

  // Fetch all referenced items (RLS will filter by user)
  const { data: existingItems, error: fetchError } = await supabase
    .from("inventory_items")
    .select("id, quantity, is_staple")
    .in("id", itemIds);

  if (fetchError) {
    throw fetchError;
  }

  // Build a map of existing items for quick lookup
  const itemMap = new Map(existingItems?.map((item) => [item.id, item]) ?? []);

  // Track items to update and delete
  const itemsToUpdate: Array<{ id: string; newQuantity: number }> = [];
  const itemsToDelete: string[] = [];

  // Process each aggregated deduction
  for (const [inventory_item_id, totalDeductAmount] of aggregatedDeductions) {
    const item = itemMap.get(inventory_item_id);

    // Check if item exists
    if (!item) {
      errors.push({
        id: inventory_item_id,
        error: "Item not found or does not belong to user",
      });
      continue;
    }

    // Check if item is a staple (staples don't have quantities)
    if (item.is_staple) {
      errors.push({
        id: inventory_item_id,
        error: "Cannot deduct from staple items (they don't have quantities)",
      });
      continue;
    }

    // Check if item has quantity
    if (item.quantity === null) {
      errors.push({
        id: inventory_item_id,
        error: "Item has no quantity set",
      });
      continue;
    }

    // Check if sufficient quantity
    if (totalDeductAmount > item.quantity) {
      errors.push({
        id: inventory_item_id,
        error: `Insufficient quantity: requested ${totalDeductAmount}, available ${item.quantity}`,
      });
      continue;
    }

    // Calculate new quantity
    const newQuantity = item.quantity - totalDeductAmount;
    const willBeDeleted = newQuantity === 0;

    // Track result
    results.push({
      id: inventory_item_id,
      previous_quantity: item.quantity,
      deducted: totalDeductAmount,
      new_quantity: newQuantity,
      deleted: willBeDeleted,
    });

    // Queue for update or delete
    if (willBeDeleted) {
      itemsToDelete.push(inventory_item_id);
    } else {
      itemsToUpdate.push({ id: inventory_item_id, newQuantity });
    }
  }

  // Perform updates
  for (const { id, newQuantity } of itemsToUpdate) {
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      // Remove from results and add to errors
      const resultIndex = results.findIndex((r) => r.id === id);
      if (resultIndex !== -1) {
        results.splice(resultIndex, 1);
      }
      errors.push({
        id,
        error: "Failed to update item quantity",
      });
    }
  }

  // Perform deletions
  if (itemsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("inventory_items").delete().in("id", itemsToDelete);

    if (deleteError) {
      // Remove from results and add to errors for all items that failed to delete
      for (const id of itemsToDelete) {
        const resultIndex = results.findIndex((r) => r.id === id);
        if (resultIndex !== -1) {
          results.splice(resultIndex, 1);
        }
        errors.push({
          id,
          error: "Failed to delete item after quantity reached zero",
        });
      }
    }
  }

  // Count deleted items in results
  const deletedCount = results.filter((r) => r.deleted).length;

  return {
    updated: results,
    errors,
    summary: {
      total: deductions.length,
      updated: results.length - deletedCount,
      deleted: deletedCount,
      failed: errors.length,
    },
  };
}

// =============================================================================
// Staples Initialization Functions
// =============================================================================

/**
 * Initializes user's staples from system staple definitions.
 *
 * When overwrite=false (default):
 * - Creates staples for products not in user's inventory
 * - Skips staples that already exist
 *
 * When overwrite=true:
 * - Creates missing staples
 * - Resets is_available=true for existing staples that are unavailable
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's UUID
 * @param options - Options including overwrite flag
 * @returns Response with created/skipped counts and staples list
 */
export async function initializeStaples(
  supabase: SupabaseClient,
  userId: string,
  options: { overwrite: boolean }
): Promise<StaplesInitResponseDTO> {
  const { overwrite } = options;

  // 1. Fetch active staple definitions and user's existing staples in parallel
  const [definitionsResult, existingResult] = await Promise.all([
    supabase
      .from("staple_definitions")
      .select(
        `
        id,
        product_id,
        product_catalog (
          id,
          name_pl
        )
      `
      )
      .eq("is_active", true),
    supabase.from("inventory_items").select("id, product_id, is_available").eq("is_staple", true),
  ]);

  if (definitionsResult.error) {
    throw definitionsResult.error;
  }
  if (existingResult.error) {
    throw existingResult.error;
  }

  const definitions = (definitionsResult.data ?? []) as StapleDefinitionWithProduct[];
  const existingStaples = (existingResult.data ?? []) as ExistingStapleItem[];

  // 2. Build map of existing staples by product_id
  const existingByProductId = new Map<number, ExistingStapleItem>();
  for (const staple of existingStaples) {
    if (staple.product_id !== null) {
      existingByProductId.set(staple.product_id, staple);
    }
  }

  // 3. Determine which staples to create and which to update
  const staplesToCreate: Array<{
    user_id: string;
    product_id: number;
    is_staple: boolean;
    is_available: boolean;
  }> = [];
  const staplesToUpdate: string[] = [];
  let skipped = 0;

  for (const definition of definitions) {
    const existing = existingByProductId.get(definition.product_id);

    if (!existing) {
      // Create new staple
      staplesToCreate.push({
        user_id: userId,
        product_id: definition.product_id,
        is_staple: true,
        is_available: true,
      });
    } else if (overwrite && !existing.is_available) {
      // Reset availability if overwrite mode and currently unavailable
      staplesToUpdate.push(existing.id);
    } else {
      // Skip existing staple (either in non-overwrite mode, or already available in overwrite mode)
      skipped++;
    }
  }

  // 4. Execute database operations
  if (staplesToCreate.length > 0) {
    const { error: insertError } = await supabase.from("inventory_items").insert(staplesToCreate);

    if (insertError) {
      throw insertError;
    }
  }

  if (staplesToUpdate.length > 0) {
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ is_available: true, updated_at: new Date().toISOString() })
      .in("id", staplesToUpdate);

    if (updateError) {
      throw updateError;
    }
  }

  // 5. Fetch final staples list with product info
  const { data: finalStaples, error: fetchError } = await supabase
    .from("inventory_items")
    .select(
      `
      id,
      product_id,
      is_available,
      product_catalog (
        id,
        name_pl
      )
    `
    )
    .eq("is_staple", true)
    .order("product_id", { ascending: true });

  if (fetchError) {
    throw fetchError;
  }

  // 6. Map to DTOs and return
  const staples = ((finalStaples ?? []) as StapleItemWithProduct[]).map(mapStapleRowToDTO);

  return {
    created: staplesToCreate.length + staplesToUpdate.length,
    skipped,
    staples,
  };
}
