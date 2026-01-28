/**
 * Inventory API Service
 *
 * Frontend service layer for interacting with the inventory API endpoints.
 * Provides typed methods for CRUD operations with proper error handling.
 */

import type {
  InventoryListResponseDTO,
  InventoryItemDTO,
  InventoryCreateResponseDTO,
  InventoryDeleteResponseDTO,
  InventoryItemCreateCommand,
  InventoryItemUpdateCommand,
  CategoriesResponseDTO,
  UnitsResponseDTO,
  StaplesInitResponseDTO,
  ErrorResponseDTO,
} from "@/types";
import type { FilterState, ApiError } from "@/app/inventory/types";

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for API errors with structured error data.
 */
export class InventoryApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "InventoryApiError";
  }

  /**
   * Converts to ApiError format for UI consumption.
   */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Parses API error response and throws InventoryApiError.
 */
async function handleApiError(response: Response): Promise<never> {
  let errorData: ErrorResponseDTO | null = null;

  try {
    errorData = await response.json();
  } catch {
    // JSON parsing failed, use generic error
  }

  const code = errorData?.error?.code ?? "UNKNOWN_ERROR";
  const message = errorData?.error?.message ?? getDefaultErrorMessage(response.status);
  const details = errorData?.error?.details;

  throw new InventoryApiError(message, code, response.status, details);
}

/**
 * Returns a default error message based on HTTP status code.
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Nieprawidłowe dane wejściowe";
    case 401:
      return "Sesja wygasła. Zaloguj się ponownie.";
    case 403:
      return "Brak uprawnień do wykonania tej operacji";
    case 404:
      return "Element nie został znaleziony";
    case 422:
      return "Nie można przetworzyć danych";
    case 429:
      return "Zbyt wiele żądań. Spróbuj ponownie za chwilę.";
    case 500:
    case 502:
    case 503:
      return "Wystąpił błąd serwera. Spróbuj ponownie.";
    default:
      return "Wystąpił nieoczekiwany błąd";
  }
}

// =============================================================================
// Request Helpers
// =============================================================================

/**
 * Default fetch options for API requests.
 */
const defaultOptions: RequestInit = {
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * Makes a GET request to the specified endpoint.
 */
async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "GET",
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Makes a POST request to the specified endpoint with JSON body.
 */
async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Makes a PUT request to the specified endpoint with JSON body.
 */
async function put<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

/**
 * Makes a DELETE request to the specified endpoint with optional JSON body.
 */
async function del<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

// =============================================================================
// Inventory API
// =============================================================================

/**
 * Parameters for listing inventory items.
 */
export interface ListInventoryParams {
  isStaple?: boolean;
  isAvailable?: boolean;
  categoryId?: number | null;
  search?: string;
  sortBy?: "name" | "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/**
 * Builds URL search params from filter state and pagination.
 */
function buildInventoryQueryParams(params: ListInventoryParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.isStaple !== undefined) {
    searchParams.set("is_staple", String(params.isStaple));
  }

  if (params.isAvailable !== undefined) {
    searchParams.set("is_available", String(params.isAvailable));
  }

  if (params.categoryId !== undefined && params.categoryId !== null) {
    searchParams.set("category_id", String(params.categoryId));
  }

  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.sortBy) {
    searchParams.set("sort_by", params.sortBy);
  }

  if (params.sortOrder) {
    searchParams.set("sort_order", params.sortOrder);
  }

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  return searchParams;
}

/**
 * Inventory API methods.
 */
export const inventoryApi = {
  /**
   * Lists inventory items with filtering, sorting, and pagination.
   *
   * @param params - Query parameters
   * @returns Paginated list of inventory items
   */
  async list(params: ListInventoryParams = {}): Promise<InventoryListResponseDTO> {
    const queryString = buildInventoryQueryParams(params).toString();
    const url = queryString ? `/api/inventory?${queryString}` : "/api/inventory";
    return get<InventoryListResponseDTO>(url);
  },

  /**
   * Lists products (non-staple items) with filters.
   *
   * @param filters - Filter state from UI
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated list of product items
   */
  async listProducts(filters: FilterState, page: number = 1, limit: number = 50): Promise<InventoryListResponseDTO> {
    return this.list({
      isStaple: false,
      categoryId: filters.categoryId,
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page,
      limit,
    });
  },

  /**
   * Lists staple items.
   *
   * @returns List of staple items
   */
  async listStaples(): Promise<InventoryListResponseDTO> {
    return this.list({
      isStaple: true,
      limit: 100, // Staples are typically fewer, load all at once
    });
  },

  /**
   * Creates one or more inventory items.
   *
   * @param items - Items to create
   * @returns Response with created items and any errors
   */
  async create(items: InventoryItemCreateCommand[]): Promise<InventoryCreateResponseDTO> {
    return post<InventoryCreateResponseDTO>("/api/inventory", { items });
  },

  /**
   * Creates a single inventory item.
   *
   * @param item - Item to create
   * @returns Created item DTO
   */
  async createSingle(item: InventoryItemCreateCommand): Promise<InventoryItemDTO> {
    const response = await this.create([item]);

    if (response.created.length === 0) {
      const errorMessage = response.errors[0]?.error ?? "Failed to create item";
      throw new InventoryApiError(errorMessage, "CREATE_FAILED", 422);
    }

    return response.created[0];
  },

  /**
   * Updates an inventory item.
   *
   * @param id - Item UUID
   * @param data - Update data
   * @returns Updated item DTO
   */
  async update(id: string, data: InventoryItemUpdateCommand): Promise<InventoryItemDTO> {
    return put<InventoryItemDTO>(`/api/inventory/${id}`, data);
  },

  /**
   * Deletes one or more inventory items.
   *
   * @param ids - Item UUIDs to delete
   * @returns Response with deleted IDs and any errors
   */
  async delete(ids: string[]): Promise<InventoryDeleteResponseDTO> {
    return del<InventoryDeleteResponseDTO>("/api/inventory", { ids });
  },

  /**
   * Deletes a single inventory item.
   *
   * @param id - Item UUID to delete
   * @returns True if deleted successfully
   */
  async deleteSingle(id: string): Promise<boolean> {
    const response = await this.delete([id]);
    return response.deleted.includes(id);
  },

  /**
   * Initializes staples from system staple definitions.
   *
   * @param overwrite - Whether to reset existing staples
   * @returns Response with created staples
   */
  async initializeStaples(overwrite: boolean = false): Promise<StaplesInitResponseDTO> {
    return post<StaplesInitResponseDTO>("/api/inventory/staples/init", { overwrite });
  },
};

// =============================================================================
// Categories API
// =============================================================================

/**
 * Categories API methods.
 */
export const categoriesApi = {
  /**
   * Lists all product categories.
   *
   * @returns List of categories
   */
  async list(): Promise<CategoriesResponseDTO> {
    return get<CategoriesResponseDTO>("/api/categories");
  },
};

// =============================================================================
// Units API
// =============================================================================

/**
 * Units API methods.
 */
export const unitsApi = {
  /**
   * Lists all units.
   *
   * @returns List of units
   */
  async list(): Promise<UnitsResponseDTO> {
    return get<UnitsResponseDTO>("/api/units");
  },
};
