import type { SupabaseClient } from "@/db/supabase/server";
import type { UnitDTO, CategoryDTO, StapleDefinitionDTO, ProductMinimalDTO } from "@/types";

/**
 * Lookup Service
 *
 * Provides read-only access to reference data tables:
 * - units (measurement units)
 * - product_categories (product categories)
 * - staple_definitions (common pantry items)
 */

/**
 * Fetches all measurement units ordered by type and name.
 *
 * @param supabase - Authenticated Supabase client
 * @returns Array of UnitDTO objects
 * @throws PostgrestError if database query fails
 */
export async function getAllUnits(supabase: SupabaseClient): Promise<UnitDTO[]> {
  const { data, error } = await supabase
    .from("units")
    .select("id, name_pl, abbreviation, unit_type, base_unit_multiplier")
    .order("unit_type")
    .order("name_pl");

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Fetches all product categories ordered by display order.
 *
 * @param supabase - Authenticated Supabase client
 * @returns Array of CategoryDTO objects
 * @throws PostgrestError if database query fails
 */
export async function getAllCategories(supabase: SupabaseClient): Promise<CategoryDTO[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name_pl, display_order")
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Raw row type from staple_definitions query with joined product_catalog.
 * Used internally for type-safe mapping.
 */
interface StapleDefinitionRow {
  id: number;
  is_active: boolean;
  product_catalog: {
    id: number;
    name_pl: string;
  };
}

/**
 * Fetches all active staple definitions with product information.
 * Staples are common pantry items that users can quickly add to inventory.
 *
 * @param supabase - Authenticated Supabase client
 * @returns Array of StapleDefinitionDTO objects with nested product
 * @throws PostgrestError if database query fails
 */
export async function getAllStapleDefinitions(supabase: SupabaseClient): Promise<StapleDefinitionDTO[]> {
  const { data, error } = await supabase
    .from("staple_definitions")
    .select(
      `
      id,
      is_active,
      product_catalog!inner (
        id,
        name_pl
      )
    `
    )
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  // Map to DTO structure with nested product
  return ((data as StapleDefinitionRow[]) ?? []).map((row) => ({
    id: row.id,
    is_active: row.is_active,
    product: {
      id: row.product_catalog.id,
      name_pl: row.product_catalog.name_pl,
    } as ProductMinimalDTO,
  }));
}
