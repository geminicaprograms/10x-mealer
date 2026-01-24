import type { Json } from "@/db/supabase/database.types";

/**
 * Database utility functions for working with Supabase data types.
 * Handles common transformations between database JSON types and TypeScript types.
 */

/**
 * Safely converts a JSONB value to a string array.
 * Returns an empty array if the value is null, undefined, or not an array.
 *
 * @param value - JSONB value from database (Json type)
 * @returns Array of strings
 *
 * @example
 * ```ts
 * const allergies = ensureStringArray(row.allergies); // Json -> string[]
 * ```
 */
export function ensureStringArray(value: Json | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Safely converts a JSONB value to a number array.
 * Returns an empty array if the value is null, undefined, or not an array.
 *
 * @param value - JSONB value from database (Json type)
 * @returns Array of numbers
 *
 * @example
 * ```ts
 * const ids = ensureNumberArray(row.category_ids); // Json -> number[]
 * ```
 */
export function ensureNumberArray(value: Json | undefined): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is number => typeof item === "number");
}

/**
 * Safely extracts a string value from a JSONB field.
 * Returns the fallback value if the field is not a string.
 *
 * @param value - JSONB value from database (Json type)
 * @param fallback - Value to return if not a string (defaults to empty string)
 * @returns The string value or fallback
 *
 * @example
 * ```ts
 * const name = ensureString(row.metadata?.name, "Unknown");
 * ```
 */
export function ensureString(value: Json | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Safely extracts a number value from a JSONB field.
 * Returns the fallback value if the field is not a number.
 *
 * @param value - JSONB value from database (Json type)
 * @param fallback - Value to return if not a number (defaults to 0)
 * @returns The number value or fallback
 *
 * @example
 * ```ts
 * const count = ensureNumber(row.metadata?.count, 0);
 * ```
 */
export function ensureNumber(value: Json | undefined, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

/**
 * Safely extracts a boolean value from a JSONB field.
 * Returns the fallback value if the field is not a boolean.
 *
 * @param value - JSONB value from database (Json type)
 * @param fallback - Value to return if not a boolean (defaults to false)
 * @returns The boolean value or fallback
 *
 * @example
 * ```ts
 * const isActive = ensureBoolean(row.metadata?.active, false);
 * ```
 */
export function ensureBoolean(value: Json | undefined, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}
