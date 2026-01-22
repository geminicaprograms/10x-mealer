/**
 * DTO and Command Model Type Definitions for Mealer API
 *
 * These types are derived from the database models in database.types.ts
 * and define the shape of data transferred between client and API.
 */

import type { Tables } from "@/db/supabase/database.types";

// =============================================================================
// Base Database Entity Types
// =============================================================================

/** Base type for profiles table row */
type ProfileRow = Tables<"profiles">;

/** Base type for inventory_items table row */
type InventoryItemRow = Tables<"inventory_items">;

/** Base type for product_catalog table row */
type ProductCatalogRow = Tables<"product_catalog">;

/** Base type for product_categories table row */
type ProductCategoryRow = Tables<"product_categories">;

/** Base type for units table row */
type UnitRow = Tables<"units">;

/** Base type for staple_definitions table row */
type StapleDefinitionRow = Tables<"staple_definitions">;

/** Base type for ai_usage_log table row */
type AIUsageLogRow = Tables<"ai_usage_log">;

// =============================================================================
// Common Types
// =============================================================================

/** Pagination information for list responses */
export interface PaginationDTO {
  page: number;
  limit: number;
  total_items: number;
}

/** Summary for batch operations */
export interface BatchOperationSummaryDTO {
  total: number;
  failed: number;
}

/** Summary for batch create operations */
export interface BatchCreateSummaryDTO extends BatchOperationSummaryDTO {
  created: number;
}

/** Summary for batch delete operations */
export interface BatchDeleteSummaryDTO extends BatchOperationSummaryDTO {
  deleted: number;
}

/** Summary for batch deduct operations */
export interface BatchDeductSummaryDTO extends BatchOperationSummaryDTO {
  updated: number;
  deleted: number;
}

/** Error item for batch operations with index reference */
export interface BatchOperationErrorByIndexDTO {
  index: number;
  error: string;
}

/** Error item for batch operations with id reference */
export interface BatchOperationErrorByIdDTO {
  id: string;
  error: string;
}

/** Error detail for validation errors */
export interface ValidationErrorDetailDTO {
  field: string;
  message: string;
}

/** Standard error codes used across the API */
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "EXTERNAL_SERVICE_ERROR";

/** Standard error response format */
export interface ErrorResponseDTO {
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetailDTO[];
  };
}

// =============================================================================
// Profile DTOs and Commands
// =============================================================================

/** Onboarding status values matching database CHECK constraint */
export type OnboardingStatus = "pending" | "completed";

/**
 * Profile DTO for GET /api/profile and PUT /api/profile responses
 * Derived from profiles table with JSON fields typed as string arrays
 */
export interface ProfileDTO {
  id: ProfileRow["id"];
  allergies: string[];
  diets: string[];
  equipment: string[];
  onboarding_status: OnboardingStatus;
  created_at: ProfileRow["created_at"];
  updated_at: ProfileRow["updated_at"];
}

/**
 * Command for PUT /api/profile
 * All fields are optional for partial updates
 */
export interface ProfileUpdateCommand {
  allergies?: string[];
  diets?: string[];
  equipment?: string[];
  onboarding_status?: OnboardingStatus;
}

// =============================================================================
// Unit DTOs
// =============================================================================

/**
 * Unit DTO for lookup endpoints
 * Directly derived from units table row
 */
export interface UnitDTO {
  id: UnitRow["id"];
  name_pl: UnitRow["name_pl"];
  abbreviation: UnitRow["abbreviation"];
  unit_type: UnitRow["unit_type"];
  base_unit_multiplier: UnitRow["base_unit_multiplier"];
}

/** Abbreviated unit DTO for nested references */
export interface UnitBriefDTO {
  id: UnitRow["id"];
  name_pl: UnitRow["name_pl"];
  abbreviation: UnitRow["abbreviation"];
}

/** Response for GET /api/units */
export interface UnitsResponseDTO {
  data: UnitDTO[];
}

// =============================================================================
// Category DTOs
// =============================================================================

/**
 * Category DTO for lookup endpoints
 * Directly derived from product_categories table row
 */
export interface CategoryDTO {
  id: ProductCategoryRow["id"];
  name_pl: ProductCategoryRow["name_pl"];
  display_order: ProductCategoryRow["display_order"];
}

/** Abbreviated category DTO for nested references */
export interface CategoryBriefDTO {
  id: ProductCategoryRow["id"];
  name_pl: ProductCategoryRow["name_pl"];
}

/** Response for GET /api/categories */
export interface CategoriesResponseDTO {
  data: CategoryDTO[];
}

// =============================================================================
// Product DTOs
// =============================================================================

/**
 * Product DTO with expanded relations for search and detail endpoints
 * Derived from product_catalog with nested category and default_unit
 */
export interface ProductDTO {
  id: ProductCatalogRow["id"];
  name_pl: ProductCatalogRow["name_pl"];
  category: CategoryBriefDTO | null;
  default_unit: UnitBriefDTO | null;
  aliases: ProductCatalogRow["aliases"];
}

/** Abbreviated product DTO for nested references in inventory */
export interface ProductBriefDTO {
  id: ProductCatalogRow["id"];
  name_pl: ProductCatalogRow["name_pl"];
  category: CategoryBriefDTO | null;
}

/** Very brief product DTO for staples listing */
export interface ProductMinimalDTO {
  id: ProductCatalogRow["id"];
  name_pl: ProductCatalogRow["name_pl"];
}

/** Response for GET /api/products/search */
export interface ProductSearchResponseDTO {
  data: ProductDTO[];
}

// =============================================================================
// Staple Definition DTOs
// =============================================================================

/**
 * Staple definition DTO with expanded product relation
 * Derived from staple_definitions table
 */
export interface StapleDefinitionDTO {
  id: StapleDefinitionRow["id"];
  product: ProductMinimalDTO;
  is_active: StapleDefinitionRow["is_active"];
}

/** Response for GET /api/staples */
export interface StaplesResponseDTO {
  data: StapleDefinitionDTO[];
}

// =============================================================================
// Inventory DTOs and Commands
// =============================================================================

/**
 * Inventory item DTO with expanded product and unit relations
 * Derived from inventory_items table with nested objects
 */
export interface InventoryItemDTO {
  id: InventoryItemRow["id"];
  product_id: InventoryItemRow["product_id"];
  product: ProductBriefDTO | null;
  custom_name: InventoryItemRow["custom_name"];
  quantity: InventoryItemRow["quantity"];
  unit: UnitBriefDTO | null;
  is_staple: InventoryItemRow["is_staple"];
  is_available: InventoryItemRow["is_available"];
  created_at: InventoryItemRow["created_at"];
  updated_at: InventoryItemRow["updated_at"];
}

/** Abbreviated inventory item DTO for staples initialization response */
export interface InventoryStapleItemDTO {
  id: InventoryItemRow["id"];
  product_id: InventoryItemRow["product_id"];
  product: ProductMinimalDTO | null;
  is_staple: true;
  is_available: InventoryItemRow["is_available"];
}

/** Query parameters for GET /api/inventory */
export interface InventoryListQueryParams {
  is_staple?: boolean;
  is_available?: boolean;
  category_id?: number;
  search?: string;
  sort_by?: "name" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/** Response for GET /api/inventory */
export interface InventoryListResponseDTO {
  data: InventoryItemDTO[];
  pagination: PaginationDTO;
}

/**
 * Command for a single item in batch create
 * Either product_id OR custom_name must be provided
 */
export interface InventoryItemCreateCommand {
  product_id?: number | null;
  custom_name?: string | null;
  quantity?: number | null;
  unit_id?: number | null;
  is_staple?: boolean;
}

/** Request payload for POST /api/inventory (batch create) */
export interface InventoryCreateCommand {
  items: InventoryItemCreateCommand[];
}

/** Response for POST /api/inventory */
export interface InventoryCreateResponseDTO {
  created: InventoryItemDTO[];
  errors: BatchOperationErrorByIndexDTO[];
  summary: BatchCreateSummaryDTO;
}

/**
 * Command for PUT /api/inventory/:id
 * Cannot change product_id, custom_name, or is_staple
 */
export interface InventoryItemUpdateCommand {
  quantity?: number | null;
  unit_id?: number | null;
  is_available?: boolean;
}

/** Request payload for DELETE /api/inventory (batch delete) */
export interface InventoryDeleteCommand {
  ids: string[];
}

/** Response for DELETE /api/inventory */
export interface InventoryDeleteResponseDTO {
  deleted: string[];
  errors: BatchOperationErrorByIdDTO[];
  summary: BatchDeleteSummaryDTO;
}

/** Single deduction item for POST /api/inventory/deduct */
export interface InventoryDeductionItemCommand {
  inventory_item_id: string;
  quantity: number;
}

/** Request payload for POST /api/inventory/deduct */
export interface InventoryDeductCommand {
  deductions: InventoryDeductionItemCommand[];
}

/** Single item result in deduction response */
export interface InventoryDeductionResultDTO {
  id: string;
  previous_quantity: number;
  deducted: number;
  new_quantity: number;
  deleted: boolean;
}

/** Response for POST /api/inventory/deduct */
export interface InventoryDeductResponseDTO {
  updated: InventoryDeductionResultDTO[];
  errors: BatchOperationErrorByIdDTO[];
  summary: BatchDeductSummaryDTO;
}

/** Request payload for POST /api/inventory/staples/init */
export interface StaplesInitCommand {
  overwrite?: boolean;
}

/** Response for POST /api/inventory/staples/init */
export interface StaplesInitResponseDTO {
  created: number;
  skipped: number;
  staples: InventoryStapleItemDTO[];
}

// =============================================================================
// System Config DTOs
// =============================================================================

/** Rate limits configuration */
export interface RateLimitsConfigDTO {
  receipt_scans_per_day: number;
  substitutions_per_day: number;
}

/**
 * System configuration DTO for GET /api/config
 * Aggregated from system_config table entries
 */
export interface SystemConfigDTO {
  supported_allergies: string[];
  supported_diets: string[];
  supported_equipment: string[];
  rate_limits: RateLimitsConfigDTO;
}

// =============================================================================
// AI Feature DTOs and Commands
// =============================================================================

/** Supported image types for receipt scanning */
export type ReceiptImageType = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";

/** Request payload for POST /api/ai/scan-receipt */
export interface ReceiptScanCommand {
  image: string;
  image_type: ReceiptImageType;
}

/** Matched product in receipt scan result */
export interface ReceiptMatchedProductDTO {
  id: ProductCatalogRow["id"];
  name_pl: ProductCatalogRow["name_pl"];
}

/** Single item extracted from receipt scan */
export interface ReceiptScanItemDTO {
  name: string;
  matched_product: ReceiptMatchedProductDTO | null;
  quantity: number | null;
  suggested_unit: UnitBriefDTO | null;
  confidence: number;
}

/** Usage info included in AI responses */
export interface AIUsageInfoDTO {
  scans_used_today?: number;
  scans_remaining?: number;
  substitutions_used_today?: number;
  substitutions_remaining?: number;
}

/** Response for POST /api/ai/scan-receipt */
export interface ReceiptScanResponseDTO {
  items: ReceiptScanItemDTO[];
  usage: {
    scans_used_today: number;
    scans_remaining: number;
  };
}

/** Single ingredient in substitution request */
export interface RecipeIngredientCommand {
  name: string;
  quantity: number | null;
  unit: string | null;
}

/** Request payload for POST /api/ai/substitutions */
export interface SubstitutionsCommand {
  recipe_ingredients: RecipeIngredientCommand[];
}

/** Matched inventory item in substitution analysis */
export interface MatchedInventoryItemDTO {
  id: InventoryItemRow["id"];
  name: string;
  quantity: number | null;
  unit: string | null;
}

/** Substitution suggestion for a missing ingredient */
export interface SubstitutionSuggestionDTO {
  available: boolean;
  suggestion: string;
  substitute_item: MatchedInventoryItemDTO | null;
}

/** Status of an ingredient relative to user's inventory */
export type IngredientStatus = "available" | "partial" | "missing";

/** Single ingredient analysis in substitution response */
export interface IngredientAnalysisDTO {
  ingredient: string;
  status: IngredientStatus;
  matched_inventory_item: MatchedInventoryItemDTO | null;
  substitution: SubstitutionSuggestionDTO | null;
  allergy_warning: string | null;
}

/** Warning types in substitution response */
export type SubstitutionWarningType = "allergy" | "diet" | "equipment";

/** Warning item in substitution response */
export interface SubstitutionWarningDTO {
  type: SubstitutionWarningType;
  message: string;
}

/** Response for POST /api/ai/substitutions */
export interface SubstitutionsResponseDTO {
  analysis: IngredientAnalysisDTO[];
  warnings: SubstitutionWarningDTO[];
  usage: {
    substitutions_used_today: number;
    substitutions_remaining: number;
  };
}

/** Usage counter details for AI features */
export interface AIUsageCounterDTO {
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Response for GET /api/ai/usage
 * Derived from ai_usage_log table with system config limits
 */
export interface AIUsageDTO {
  date: AIUsageLogRow["usage_date"];
  receipt_scans: AIUsageCounterDTO;
  substitutions: AIUsageCounterDTO;
}

// =============================================================================
// Recipe Proxy DTOs and Commands
// =============================================================================

/** Request payload for POST /api/recipes/parse */
export interface RecipeParseCommand {
  url: string;
}

/** Single parsed ingredient from recipe */
export interface ParsedIngredientDTO {
  name: string;
  quantity: number | null;
  unit: string | null;
  original_text: string;
  is_staple?: boolean;
}

/** Response for POST /api/recipes/parse */
export interface RecipeParseResponseDTO {
  title: string;
  source_url: string;
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}

/** Request payload for POST /api/recipes/parse-text */
export interface RecipeParseTextCommand {
  text: string;
}

/** Response for POST /api/recipes/parse-text */
export interface RecipeParseTextResponseDTO {
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}

// =============================================================================
// Account Management DTOs and Commands
// =============================================================================

/** Request payload for POST /api/auth/delete-account */
export interface DeleteAccountCommand {
  password: string;
  confirmation: string;
}

/** Response for POST /api/auth/delete-account */
export interface DeleteAccountResponseDTO {
  message: string;
}
