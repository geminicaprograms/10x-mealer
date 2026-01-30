/**
 * Unit tests for AI Service Module
 *
 * Tests cover:
 * - Base64 validation and size estimation
 * - Zod validation schemas
 * - Rate limiting logic
 * - Ingredient matching algorithms
 * - Warning generation for allergies/diets
 *
 * Following Arrange-Act-Assert pattern and descriptive test structure
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { InventoryItemDTO, ProfileDTO, RecipeIngredientCommand } from "@/types";
import type { SupabaseClient } from "@/db/supabase/server";

import {
  isValidBase64,
  estimateBase64Size,
  getTodayDateString,
  receiptScanSchema,
  substitutionsSchema,
  getRateLimits,
  getUserUsageToday,
  checkRateLimit,
  getAIUsage,
  matchProductByName,
  suggestUnitForItem,
  convertInventoryForAI,
  matchIngredientsToInventory,
  generateWarnings,
  type InventoryItemForAI,
} from "./ai.service";

// =============================================================================
// Test Helpers and Mocks
// =============================================================================

/**
 * Creates a mock Supabase client with chainable query methods
 */
function createMockSupabaseClient(overrides?: { data?: unknown; error?: { message: string; code?: string } | null }) {
  const mockSingle = vi.fn().mockResolvedValue({
    data: overrides?.data ?? null,
    error: overrides?.error ?? null,
  });

  const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle, eq: vi.fn().mockReturnValue({ single: mockSingle }) });
  const mockOr = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockIlike = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockTextSearch = vi.fn().mockReturnValue({ limit: mockLimit });

  const mockSelect = vi.fn().mockReturnValue({
    eq: mockEq,
    textSearch: mockTextSearch,
    ilike: mockIlike,
    or: mockOr,
    single: mockSingle,
  });

  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = vi.fn().mockResolvedValue({ error: overrides?.error ?? null });

  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  });

  return {
    from: mockFrom,
    _mocks: {
      from: mockFrom,
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      update: mockUpdate,
      insert: mockInsert,
      textSearch: mockTextSearch,
      ilike: mockIlike,
      or: mockOr,
      limit: mockLimit,
    },
  } as unknown as SupabaseClient & { _mocks: Record<string, ReturnType<typeof vi.fn>> };
}

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe("isValidBase64", () => {
  describe("valid inputs", () => {
    it("should return true for valid base64 string", () => {
      // Arrange
      const validBase64 = "SGVsbG8gV29ybGQ="; // "Hello World"

      // Act
      const result = isValidBase64(validBase64);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for base64 data URL format", () => {
      // Arrange
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA";

      // Act
      const result = isValidBase64(dataUrl);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for base64 without padding", () => {
      // Arrange
      const noPadding = "SGVsbG8";

      // Act
      const result = isValidBase64(noPadding);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for base64 with single padding", () => {
      // Arrange
      const singlePadding = "SGVsbG8h"; // "Hello!"

      // Act
      const result = isValidBase64(singlePadding);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should return false for empty string", () => {
      // Act
      const result = isValidBase64("");

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for string with invalid characters", () => {
      // Arrange
      const invalidChars = "Hello World!@#$%";

      // Act
      const result = isValidBase64(invalidChars);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for data URL with empty base64 part", () => {
      // Arrange
      const emptyDataUrl = "data:image/png;base64,";

      // Act
      const result = isValidBase64(emptyDataUrl);

      // Assert
      expect(result).toBe(false);
    });
  });
});

describe("estimateBase64Size", () => {
  describe("size calculations", () => {
    it("should return 0 for empty string", () => {
      // Act
      const result = estimateBase64Size("");

      // Assert
      expect(result).toBe(0);
    });

    it("should correctly estimate size of simple base64", () => {
      // Arrange - "Hello World" = 11 bytes, base64 = "SGVsbG8gV29ybGQ="
      const base64 = "SGVsbG8gV29ybGQ=";

      // Act
      const result = estimateBase64Size(base64);

      // Assert
      expect(result).toBe(11);
    });

    it("should correctly estimate size from data URL", () => {
      // Arrange - same data in data URL format
      const dataUrl = "data:text/plain;base64,SGVsbG8gV29ybGQ=";

      // Act
      const result = estimateBase64Size(dataUrl);

      // Assert
      expect(result).toBe(11);
    });

    it("should handle base64 without padding", () => {
      // Arrange - "Hel" = 3 bytes, base64 = "SGVs"
      const base64 = "SGVs";

      // Act
      const result = estimateBase64Size(base64);

      // Assert
      expect(result).toBe(3);
    });

    it("should return 0 for data URL without base64 content", () => {
      // Arrange
      const emptyDataUrl = "data:image/png;base64,";

      // Act
      const result = estimateBase64Size(emptyDataUrl);

      // Assert
      expect(result).toBe(0);
    });
  });
});

describe("getTodayDateString", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return date in YYYY-MM-DD format", () => {
    // Arrange
    vi.setSystemTime(new Date("2024-03-15T10:30:00Z"));

    // Act
    const result = getTodayDateString();

    // Assert
    expect(result).toBe("2024-03-15");
  });

  it("should handle year boundary correctly", () => {
    // Arrange
    vi.setSystemTime(new Date("2024-12-31T23:59:59Z"));

    // Act
    const result = getTodayDateString();

    // Assert
    expect(result).toBe("2024-12-31");
  });

  it("should pad single digit months and days", () => {
    // Arrange
    vi.setSystemTime(new Date("2024-01-05T00:00:00Z"));

    // Act
    const result = getTodayDateString();

    // Assert
    expect(result).toBe("2024-01-05");
  });
});

// =============================================================================
// Zod Schema Validation Tests
// =============================================================================

describe("receiptScanSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid JPEG image data", () => {
      // Arrange
      const input = {
        image: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        image_type: "image/jpeg" as const,
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept valid PNG image data", () => {
      // Arrange
      const input = {
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
        image_type: "image/png" as const,
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept valid WebP image data", () => {
      // Arrange
      const input = {
        image: "UklGRh4AAABXRUJQVlA4TBEAAAAv",
        image_type: "image/webp" as const,
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept HEIC image type", () => {
      // Arrange
      const input = {
        image: "SGVsbG8gV29ybGQ=",
        image_type: "image/heic" as const,
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept HEIF image type", () => {
      // Arrange
      const input = {
        image: "SGVsbG8gV29ybGQ=",
        image_type: "image/heif" as const,
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty image data", () => {
      // Arrange
      const input = {
        image: "",
        image_type: "image/jpeg",
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("required");
      }
    });

    it("should reject invalid base64 encoding", () => {
      // Arrange
      const input = {
        image: "not-valid-base64!!!@@@",
        image_type: "image/jpeg",
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid base64");
      }
    });

    it("should reject unsupported image type", () => {
      // Arrange
      const input = {
        image: "SGVsbG8gV29ybGQ=",
        image_type: "image/gif",
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject missing image_type", () => {
      // Arrange
      const input = {
        image: "SGVsbG8gV29ybGQ=",
      };

      // Act
      const result = receiptScanSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});

describe("substitutionsSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid recipe ingredients", () => {
      // Arrange
      const input = {
        recipe_ingredients: [
          { name: "Flour", quantity: 500, unit: "g" },
          { name: "Sugar", quantity: 200, unit: "g" },
        ],
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept ingredients with null quantity and unit", () => {
      // Arrange
      const input = {
        recipe_ingredients: [{ name: "Salt", quantity: null, unit: null }],
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should accept ingredients without optional fields", () => {
      // Arrange
      const input = {
        recipe_ingredients: [{ name: "Pepper" }],
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should trim whitespace from ingredient names", () => {
      // Arrange
      const input = {
        recipe_ingredients: [{ name: "  Flour  " }],
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recipe_ingredients[0].name).toBe("Flour");
      }
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty ingredients array", () => {
      // Arrange
      const input = {
        recipe_ingredients: [],
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("At least one ingredient");
      }
    });

    it("should reject empty ingredient name", () => {
      // Arrange
      const input = {
        recipe_ingredients: [{ name: "" }],
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject negative quantity", () => {
      // Arrange
      const input = {
        recipe_ingredients: [{ name: "Flour", quantity: -100 }],
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject zero quantity", () => {
      // Arrange
      const input = {
        recipe_ingredients: [{ name: "Flour", quantity: 0 }],
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject too many ingredients", () => {
      // Arrange - MAX_RECIPE_INGREDIENTS is 30
      const input = {
        recipe_ingredients: Array.from({ length: 31 }, (_, i) => ({
          name: `Ingredient ${i}`,
        })),
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Maximum 30 ingredients");
      }
    });

    it("should reject ingredient name exceeding max length", () => {
      // Arrange
      const input = {
        recipe_ingredients: [{ name: "A".repeat(201) }], // MAX_INGREDIENT_NAME_LENGTH is 200
      };

      // Act
      const result = substitutionsSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Rate Limiting Functions Tests
// =============================================================================

describe("getRateLimits", () => {
  it("should return rate limits from database", async () => {
    // Arrange
    const mockData = {
      value: {
        receipt_scans_per_day: 10,
        substitutions_per_day: 20,
      },
    };
    const supabase = createMockSupabaseClient({ data: mockData });

    // Act
    const result = await getRateLimits(supabase);

    // Assert
    expect(result).toEqual({
      receipt_scans_per_day: 10,
      substitutions_per_day: 20,
    });
  });

  it("should return default rate limits when database returns null", async () => {
    // Arrange
    const supabase = createMockSupabaseClient({ data: null });

    // Act
    const result = await getRateLimits(supabase);

    // Assert
    expect(result).toEqual({
      receipt_scans_per_day: 5,
      substitutions_per_day: 10,
    });
  });

  it("should return default rate limits on database error", async () => {
    // Arrange
    const supabase = createMockSupabaseClient({
      error: { message: "Database error" },
    });

    // Act
    const result = await getRateLimits(supabase);

    // Assert
    expect(result).toEqual({
      receipt_scans_per_day: 5,
      substitutions_per_day: 10,
    });
  });

  it("should handle invalid value format gracefully", async () => {
    // Arrange
    const mockData = { value: "not an object" };
    const supabase = createMockSupabaseClient({ data: mockData });

    // Act
    const result = await getRateLimits(supabase);

    // Assert
    expect(result).toEqual({
      receipt_scans_per_day: 5,
      substitutions_per_day: 10,
    });
  });
});

describe("getUserUsageToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return usage counts from database", async () => {
    // Arrange
    const mockData = {
      receipt_scan_count: 3,
      substitution_count: 5,
    };
    const supabase = createMockSupabaseClient({ data: mockData });

    // Act
    const result = await getUserUsageToday(supabase, "user-123");

    // Assert
    expect(result).toEqual({
      receipt_scan_count: 3,
      substitution_count: 5,
    });
    expect(supabase.from).toHaveBeenCalledWith("ai_usage_log");
  });

  it("should return zero counts when no record exists", async () => {
    // Arrange
    const supabase = createMockSupabaseClient({
      data: null,
      error: { message: "No rows returned" },
    });

    // Act
    const result = await getUserUsageToday(supabase, "user-123");

    // Assert
    expect(result).toEqual({
      receipt_scan_count: 0,
      substitution_count: 0,
    });
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow when under limit for receipt_scans", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();

    // Mock getRateLimits response
    mockSupabase._mocks.single
      .mockResolvedValueOnce({
        data: { value: { receipt_scans_per_day: 5, substitutions_per_day: 10 } },
        error: null,
      })
      // Mock getUserUsageToday response
      .mockResolvedValueOnce({
        data: { receipt_scan_count: 2, substitution_count: 3 },
        error: null,
      });

    // Act
    const result = await checkRateLimit(mockSupabase, "user-123", "receipt_scans");

    // Assert
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(3);
  });

  it("should deny when at limit for receipt_scans", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();

    mockSupabase._mocks.single
      .mockResolvedValueOnce({
        data: { value: { receipt_scans_per_day: 5, substitutions_per_day: 10 } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { receipt_scan_count: 5, substitution_count: 3 },
        error: null,
      });

    // Act
    const result = await checkRateLimit(mockSupabase, "user-123", "receipt_scans");

    // Assert
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(5);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(0);
  });

  it("should allow when under limit for substitutions", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();

    mockSupabase._mocks.single
      .mockResolvedValueOnce({
        data: { value: { receipt_scans_per_day: 5, substitutions_per_day: 10 } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { receipt_scan_count: 2, substitution_count: 7 },
        error: null,
      });

    // Act
    const result = await checkRateLimit(mockSupabase, "user-123", "substitutions");

    // Assert
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(7);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(3);
  });
});

describe("getAIUsage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return complete AI usage statistics", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();

    mockSupabase._mocks.single
      .mockResolvedValueOnce({
        data: { value: { receipt_scans_per_day: 5, substitutions_per_day: 10 } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { receipt_scan_count: 2, substitution_count: 7 },
        error: null,
      });

    // Act
    const result = await getAIUsage(mockSupabase, "user-123");

    // Assert
    expect(result).toEqual({
      date: "2024-03-15",
      receipt_scans: {
        used: 2,
        limit: 5,
        remaining: 3,
      },
      substitutions: {
        used: 7,
        limit: 10,
        remaining: 3,
      },
    });
  });

  it("should handle zero usage correctly", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();

    mockSupabase._mocks.single
      .mockResolvedValueOnce({
        data: { value: { receipt_scans_per_day: 5, substitutions_per_day: 10 } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "No rows" },
      });

    // Act
    const result = await getAIUsage(mockSupabase, "user-123");

    // Assert
    expect(result.receipt_scans.used).toBe(0);
    expect(result.receipt_scans.remaining).toBe(5);
    expect(result.substitutions.used).toBe(0);
    expect(result.substitutions.remaining).toBe(10);
  });
});

// =============================================================================
// Inventory Conversion and Matching Tests
// =============================================================================

describe("convertInventoryForAI", () => {
  it("should convert inventory items with product names", () => {
    // Arrange
    const inventoryItems: InventoryItemDTO[] = [
      {
        id: "item-1",
        product_id: 1,
        product: { id: 1, name_pl: "Mąka", category: null },
        custom_name: null,
        quantity: 500,
        unit: { id: 1, name_pl: "gram", abbreviation: "g" },
        is_staple: false,
        is_available: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    // Act
    const result = convertInventoryForAI(inventoryItems);

    // Assert
    expect(result).toEqual([
      {
        id: "item-1",
        name: "Mąka",
        quantity: 500,
        unit: "g",
        is_available: true,
      },
    ]);
  });

  it("should prefer custom_name over product name", () => {
    // Arrange
    const inventoryItems: InventoryItemDTO[] = [
      {
        id: "item-1",
        product_id: 1,
        product: { id: 1, name_pl: "Mąka pszenna", category: null },
        custom_name: "Moja specjalna mąka",
        quantity: 1000,
        unit: { id: 1, name_pl: "gram", abbreviation: "g" },
        is_staple: false,
        is_available: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    // Act
    const result = convertInventoryForAI(inventoryItems);

    // Assert
    expect(result[0].name).toBe("Moja specjalna mąka");
  });

  it("should handle items without unit", () => {
    // Arrange
    const inventoryItems: InventoryItemDTO[] = [
      {
        id: "item-1",
        product_id: 1,
        product: { id: 1, name_pl: "Jajka", category: null },
        custom_name: null,
        quantity: 6,
        unit: null,
        is_staple: false,
        is_available: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    // Act
    const result = convertInventoryForAI(inventoryItems);

    // Assert
    expect(result[0].unit).toBeNull();
  });

  it("should use abbreviation even when it is an empty string", () => {
    // Arrange - empty string is falsy but ?? only checks for null/undefined
    // so empty abbreviation is used as-is
    const inventoryItems: InventoryItemDTO[] = [
      {
        id: "item-1",
        product_id: 1,
        product: { id: 1, name_pl: "Cukier", category: null },
        custom_name: null,
        quantity: 500,
        unit: { id: 1, name_pl: "gram", abbreviation: "" },
        is_staple: false,
        is_available: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    // Act
    const result = convertInventoryForAI(inventoryItems);

    // Assert - empty string is used (not fallback to name_pl due to ?? behavior)
    expect(result[0].unit).toBe("");
  });

  it("should handle item with no product and no custom name", () => {
    // Arrange
    const inventoryItems: InventoryItemDTO[] = [
      {
        id: "item-1",
        product_id: null,
        product: null,
        custom_name: null,
        quantity: 1,
        unit: null,
        is_staple: false,
        is_available: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    // Act
    const result = convertInventoryForAI(inventoryItems);

    // Assert
    expect(result[0].name).toBe("Unknown");
  });
});

describe("matchIngredientsToInventory", () => {
  const mockInventory: InventoryItemForAI[] = [
    { id: "1", name: "Mąka", quantity: 1000, unit: "g", is_available: true },
    { id: "2", name: "Cukier", quantity: 500, unit: "g", is_available: true },
    { id: "3", name: "Masło", quantity: 200, unit: "g", is_available: true },
    { id: "4", name: "Mleko", quantity: 1000, unit: "ml", is_available: false },
    { id: "5", name: "Ser żółty", quantity: 300, unit: "g", is_available: true },
  ];

  describe("exact and fuzzy matching", () => {
    it("should match exact ingredient names", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Cukier", quantity: 100, unit: "g" }];

      // Act
      const result = matchIngredientsToInventory(ingredients, mockInventory);

      // Assert
      const match = result.get("Cukier");
      expect(match?.status).toBe("available");
      expect(match?.matchedItem?.name).toBe("Cukier");
    });

    it("should match similar ingredient names (fuzzy)", () => {
      // Arrange - "Ser żółty tarty" vs "Ser żółty" has ~67% similarity (above 0.6 threshold)
      const ingredients: RecipeIngredientCommand[] = [{ name: "Ser żółty tarty", quantity: 100, unit: "g" }];

      // Act
      const result = matchIngredientsToInventory(ingredients, mockInventory);

      // Assert
      const match = result.get("Ser żółty tarty");
      expect(match?.status).toBe("available");
      expect(match?.matchedItem?.name).toBe("Ser żółty");
    });

    it("should return missing for unmatched ingredients", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Drożdże", quantity: 7, unit: "g" }];

      // Act
      const result = matchIngredientsToInventory(ingredients, mockInventory);

      // Assert
      const match = result.get("Drożdże");
      expect(match?.status).toBe("missing");
      expect(match?.matchedItem).toBeNull();
    });

    it("should not match when similarity is below threshold", () => {
      // Arrange - "Mąka" vs "Mąka pszenna tortowa" has ~25% similarity (below 0.6 threshold)
      const inventoryWithLongName: InventoryItemForAI[] = [
        { id: "1", name: "Mąka pszenna tortowa", quantity: 1000, unit: "g", is_available: true },
      ];
      const ingredients: RecipeIngredientCommand[] = [{ name: "Mąka", quantity: 200, unit: "g" }];

      // Act
      const result = matchIngredientsToInventory(ingredients, inventoryWithLongName);

      // Assert
      const match = result.get("Mąka");
      expect(match?.status).toBe("missing");
      expect(match?.matchedItem).toBeNull();
    });
  });

  describe("quantity handling", () => {
    it("should return available when sufficient quantity", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Cukier", quantity: 200, unit: "g" }];

      // Act
      const result = matchIngredientsToInventory(ingredients, mockInventory);

      // Assert
      expect(result.get("Cukier")?.status).toBe("available");
    });

    it("should return partial when insufficient quantity", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Cukier", quantity: 600, unit: "g" }];

      // Act
      const result = matchIngredientsToInventory(ingredients, mockInventory);

      // Assert
      expect(result.get("Cukier")?.status).toBe("partial");
    });

    it("should return available when quantity is null", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Cukier", quantity: null, unit: null }];

      // Act
      const result = matchIngredientsToInventory(ingredients, mockInventory);

      // Assert
      expect(result.get("Cukier")?.status).toBe("available");
    });
  });

  describe("availability handling", () => {
    it("should return missing for unavailable items", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Mleko", quantity: 200, unit: "ml" }];

      // Act
      const result = matchIngredientsToInventory(ingredients, mockInventory);

      // Assert
      expect(result.get("Mleko")?.status).toBe("missing");
      expect(result.get("Mleko")?.matchedItem).toBeNull();
    });
  });

  describe("multiple ingredients", () => {
    it("should match multiple ingredients correctly", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [
        { name: "Mąka", quantity: 500, unit: "g" },
        { name: "Cukier", quantity: 100, unit: "g" },
        { name: "Drożdże", quantity: 7, unit: "g" },
      ];

      // Act
      const result = matchIngredientsToInventory(ingredients, mockInventory);

      // Assert
      expect(result.size).toBe(3);
      expect(result.get("Mąka")?.status).toBe("available"); // exact match with "Mąka" in inventory
      expect(result.get("Cukier")?.status).toBe("available"); // exact match
      expect(result.get("Drożdże")?.status).toBe("missing"); // no match
    });
  });
});

// =============================================================================
// Warning Generation Tests
// =============================================================================

describe("generateWarnings", () => {
  describe("allergy warnings", () => {
    it("should generate allergy warning for gluten-containing ingredients", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Mąka pszenna", quantity: 500, unit: "g" }];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: ["gluten"],
        diets: [],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("allergy");
      expect(result[0].message).toContain("mąka pszenna");
      expect(result[0].message).toContain("gluten");
    });

    it("should generate allergy warning for lactose-containing ingredients", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [
        { name: "Mleko", quantity: 500, unit: "ml" },
        { name: "Ser żółty", quantity: 100, unit: "g" },
      ];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: ["laktoza"],
        diets: [],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((w) => w.type === "allergy")).toBe(true);
    });

    it("should generate multiple allergy warnings for different allergens", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [
        { name: "Chleb", quantity: 2, unit: "kromki" },
        { name: "Jajko", quantity: 2, unit: "szt" },
      ];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: ["gluten", "jaja"],
        diets: [],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(2);
    });

    it("should not generate warnings when no allergies match", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [
        { name: "Pomidor", quantity: 2, unit: "szt" },
        { name: "Ogórek", quantity: 1, unit: "szt" },
      ];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: ["gluten", "laktoza"],
        diets: [],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("diet warnings", () => {
    it("should generate diet warning for vegetarian diet with meat", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Kurczak", quantity: 500, unit: "g" }];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: [],
        diets: ["wegetariańska"],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("diet");
      expect(result[0].message).toContain("kurczak");
      expect(result[0].message).toContain("wegetariańska");
    });

    it("should generate diet warning for vegan diet with dairy", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [
        { name: "Masło", quantity: 100, unit: "g" },
        { name: "Miód", quantity: 50, unit: "g" },
      ];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: [],
        diets: ["wegańska"],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((w) => w.type === "diet")).toBe(true);
    });

    it("should generate diet warning for gluten-free diet", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Makaron pszenny", quantity: 200, unit: "g" }];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: [],
        diets: ["bezglutenowa"],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("diet");
    });
  });

  describe("combined warnings", () => {
    it("should generate both allergy and diet warnings", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [
        { name: "Chleb", quantity: 2, unit: "kromki" },
        { name: "Kiełbasa", quantity: 100, unit: "g" },
      ];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: ["gluten"],
        diets: ["wegetariańska"],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((w) => w.type === "allergy")).toBe(true);
      expect(result.some((w) => w.type === "diet")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty allergies and diets", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Mąka", quantity: 500, unit: "g" }];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: [],
        diets: [],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should handle empty ingredients list", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: ["gluten"],
        diets: ["wegetariańska"],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should handle unknown allergy with direct matching", () => {
      // Arrange
      const ingredients: RecipeIngredientCommand[] = [{ name: "Krewetki smażone", quantity: 200, unit: "g" }];
      const profile: ProfileDTO = {
        id: "user-1",
        allergies: ["krewetki"], // Direct match as keyword
        diets: [],
        equipment: [],
        onboarding_status: "completed",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      // Act
      const result = generateWarnings(ingredients, profile);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("allergy");
    });
  });
});

// =============================================================================
// Product Matching Functions Tests
// =============================================================================

describe("matchProductByName", () => {
  it("should match product using full-text search", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: { id: 1, name_pl: "Mąka pszenna" },
      error: null,
    });

    // Act
    const result = await matchProductByName(mockSupabase, "mąka");

    // Assert
    expect(result).toEqual({ id: 1, name_pl: "Mąka pszenna" });
  });

  it("should fallback to ILIKE when FTS returns no results", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockSupabase._mocks.single
      .mockResolvedValueOnce({ data: null, error: { message: "No match" } })
      .mockResolvedValueOnce({ data: { id: 2, name_pl: "Cukier biały" }, error: null });

    // Act
    const result = await matchProductByName(mockSupabase, "cukier");

    // Assert
    expect(result).toEqual({ id: 2, name_pl: "Cukier biały" });
  });

  it("should return null when no match found", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockSupabase._mocks.single
      .mockResolvedValueOnce({ data: null, error: { message: "No match" } })
      .mockResolvedValueOnce({ data: null, error: { message: "No match" } });

    // Act
    const result = await matchProductByName(mockSupabase, "nieznany produkt");

    // Assert
    expect(result).toBeNull();
  });
});

describe("suggestUnitForItem", () => {
  it("should return default unit from product when productId provided", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockSupabase._mocks.single
      .mockResolvedValueOnce({ data: { default_unit_id: 1 }, error: null })
      .mockResolvedValueOnce({
        data: { id: 1, name_pl: "gram", abbreviation: "g" },
        error: null,
      });

    // Act
    const result = await suggestUnitForItem(mockSupabase, 1, null);

    // Assert
    expect(result).toEqual({ id: 1, name_pl: "gram", abbreviation: "g" });
  });

  it("should match unit from LLM hint when no product default", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockSupabase._mocks.single
      .mockResolvedValueOnce({ data: { default_unit_id: null }, error: null })
      .mockResolvedValueOnce({
        data: { id: 2, name_pl: "sztuka", abbreviation: "szt" },
        error: null,
      });

    // Act
    const result = await suggestUnitForItem(mockSupabase, 1, "szt");

    // Assert
    expect(result).toEqual({ id: 2, name_pl: "sztuka", abbreviation: "szt" });
  });

  it("should return null when no productId and no llmHint", async () => {
    // Act
    const mockSupabase = createMockSupabaseClient();
    const result = await suggestUnitForItem(mockSupabase, null, null);

    // Assert
    expect(result).toBeNull();
  });

  it("should return null when product has no default unit and no LLM hint match", async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockSupabase._mocks.single.mockResolvedValueOnce({ data: { default_unit_id: null }, error: null });

    // Act
    const result = await suggestUnitForItem(mockSupabase, 1, null);

    // Assert
    expect(result).toBeNull();
  });
});
