import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase/server";
import type { ProductDTO, CategoryBriefDTO, UnitBriefDTO } from "@/types";

// =============================================================================
// Database Query Result Types
// =============================================================================

/**
 * Shape of product data returned from Supabase query with joined relations.
 * Matches the select query structure for search and getById operations.
 */
interface ProductCatalogQueryResult {
  id: number;
  name_pl: string;
  aliases: string[];
  category: {
    id: number;
    name_pl: string;
  } | null;
  default_unit: {
    id: number;
    name_pl: string;
    abbreviation: string;
  } | null;
}

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Zod schema for GET /api/products/search query parameters.
 * Validates and transforms string query params to appropriate types.
 */
export const productSearchQuerySchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters"),
  category_id: z.coerce
    .number()
    .int("category_id must be an integer")
    .positive("category_id must be a positive integer")
    .optional(),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1, "limit must be at least 1")
    .max(20, "limit must be at most 20")
    .default(10),
});

/** Validated query parameters type for product search */
export type ProductSearchQueryParams = z.infer<typeof productSearchQuerySchema>;

/**
 * Zod schema for product ID path parameter validation.
 * Coerces string to positive integer.
 */
export const productIdSchema = z.coerce
  .number()
  .int("Product ID must be an integer")
  .positive("Product ID must be a positive integer");

// =============================================================================
// DTO Mapping
// =============================================================================

/**
 * Maps a database query result row to a ProductDTO.
 * Handles null values for category and default_unit relations.
 *
 * @param row - Raw database row with joined relations
 * @returns ProductDTO with properly typed fields
 */
function mapProductRowToDTO(row: ProductCatalogQueryResult): ProductDTO {
  const category: CategoryBriefDTO | null = row.category
    ? {
        id: row.category.id,
        name_pl: row.category.name_pl,
      }
    : null;

  const defaultUnit: UnitBriefDTO | null = row.default_unit
    ? {
        id: row.default_unit.id,
        name_pl: row.default_unit.name_pl,
        abbreviation: row.default_unit.abbreviation,
      }
    : null;

  return {
    id: row.id,
    name_pl: row.name_pl,
    category,
    default_unit: defaultUnit,
    aliases: row.aliases ?? [],
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escapes special characters for PostgreSQL ILIKE pattern matching.
 * Escapes: %, _, and backslash.
 *
 * @param str - Raw string to escape
 * @returns Escaped string safe for ILIKE patterns
 */
function escapeIlikePattern(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

/**
 * Prepares a search query for PostgreSQL full-text search.
 * Adds prefix matching support by appending :* to each word.
 *
 * @param query - Raw search query from user
 * @returns Query string formatted for to_tsquery with prefix matching
 *
 * @example
 * ```ts
 * prepareFullTextQuery("kurczak") // "kurczak:*"
 * prepareFullTextQuery("pierś z kurczaka") // "pierś:* & z:* & kurczaka:*"
 * ```
 */
function prepareFullTextQuery(query: string): string {
  // Split into words, filter empty, add prefix operator, join with AND
  return query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word}:*`)
    .join(" & ");
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Searches the product catalog for autocomplete functionality.
 *
 * Uses a hybrid search strategy:
 * 1. Full-text search on the search_vector column (uses GIN index)
 * 2. ILIKE pattern matching on product name as fallback
 * 3. Array contains search on aliases
 *
 * This approach provides:
 * - Fast full-text search with prefix matching (e.g., "kur" → "kurczak")
 * - Fallback for edge cases where full-text search might miss
 * - Search in product aliases for common alternative names
 *
 * @param supabase - Authenticated Supabase client
 * @param params - Validated search query parameters
 * @returns Array of ProductDTO matching the search criteria
 * @throws Error if database query fails
 *
 * @example
 * ```ts
 * const products = await searchProducts(supabase, { q: "kur", limit: 10 });
 * // Returns products like "Kurczak", "Kurkuma", etc.
 * ```
 */
export async function searchProducts(
  supabase: SupabaseClient,
  params: ProductSearchQueryParams
): Promise<ProductDTO[]> {
  const { q, category_id, limit } = params;

  // Prepare search patterns
  const escapedQuery = escapeIlikePattern(q);
  const ilikePattern = `%${escapedQuery}%`;
  const fullTextQuery = prepareFullTextQuery(q);

  // Build base query with joins for category and default unit
  // Using RPC for full-text search with prefix matching support
  const selectFields = `
    id,
    name_pl,
    aliases,
    category:product_categories(id, name_pl),
    default_unit:units(id, name_pl, abbreviation)
  `;

  // Build the query with hybrid search:
  // - Full-text search using search_vector with prefix matching
  // - ILIKE fallback for partial matches
  // - Alias array search
  let query = supabase
    .from("product_catalog")
    .select(selectFields)
    .or(
      `search_vector.fts(simple).${fullTextQuery},` +
        `name_pl.ilike.${ilikePattern},` +
        `aliases.cs.{"${escapedQuery}"}`
    )
    .order("name_pl")
    .limit(limit);

  // Apply optional category filter
  if (category_id !== undefined) {
    query = query.eq("category_id", category_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error searching products:", error);
    throw error;
  }

  // Map results to DTOs with proper typing
  return (data ?? []).map((row) => mapProductRowToDTO(row as unknown as ProductCatalogQueryResult));
}

/**
 * Retrieves a single product by its ID with expanded relations.
 *
 * @param supabase - Authenticated Supabase client
 * @param id - Product catalog ID (positive integer)
 * @returns ProductDTO if found, null if product does not exist
 * @throws Error if database query fails (except for not found)
 *
 * @example
 * ```ts
 * const product = await getProductById(supabase, 123);
 * if (!product) {
 *   // Handle not found
 * }
 * ```
 */
export async function getProductById(supabase: SupabaseClient, id: number): Promise<ProductDTO | null> {
  const { data, error } = await supabase
    .from("product_catalog")
    .select(
      `
      id,
      name_pl,
      aliases,
      category:product_categories(id, name_pl),
      default_unit:units(id, name_pl, abbreviation)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    // PGRST116 = "No rows found" - this is expected for non-existent products
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching product by ID:", error);
    throw error;
  }

  return mapProductRowToDTO(data as unknown as ProductCatalogQueryResult);
}
