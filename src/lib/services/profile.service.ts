import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase/server";
import type { Tables } from "@/db/supabase/database.types";
import type { ProfileDTO, OnboardingStatus, ValidationErrorDetailDTO } from "@/types";
import { ensureStringArray } from "@/lib/utils/db";

type ProfileRow = Tables<"profiles">;

// =============================================================================
// Validation Schemas and Types
// =============================================================================

/**
 * Zod schema for validating PUT /api/profile request body.
 * All fields are optional to support partial updates.
 */
export const profileUpdateSchema = z.object({
  allergies: z.array(z.string().min(1, "Allergy value cannot be empty")).optional(),
  diets: z.array(z.string().min(1, "Diet value cannot be empty")).optional(),
  equipment: z.array(z.string().min(1, "Equipment value cannot be empty")).optional(),
  onboarding_status: z.enum(["pending", "completed"]).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// =============================================================================
// System Config Types and Functions
// =============================================================================

/**
 * Supported profile values from system_config table.
 */
export interface SupportedProfileValues {
  allergies: string[];
  diets: string[];
  equipment: string[];
}

/**
 * Fetches supported profile values from system_config table.
 *
 * @param supabase - Supabase client instance
 * @returns Object containing supported allergies, diets, and equipment
 * @throws Error if database query fails
 */
export async function getSupportedProfileValues(supabase: SupabaseClient): Promise<SupportedProfileValues> {
  const { data, error } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", ["supported_allergies", "supported_diets", "supported_equipment"]);

  if (error) {
    throw error;
  }

  const config: SupportedProfileValues = {
    allergies: [],
    diets: [],
    equipment: [],
  };

  for (const row of data ?? []) {
    switch (row.key) {
      case "supported_allergies":
        config.allergies = ensureStringArray(row.value);
        break;
      case "supported_diets":
        config.diets = ensureStringArray(row.value);
        break;
      case "supported_equipment":
        config.equipment = ensureStringArray(row.value);
        break;
    }
  }

  return config;
}

// =============================================================================
// Value Validation
// =============================================================================

/**
 * Result of validating profile values against system configuration.
 */
export interface ProfileValueValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetailDTO[];
}

/**
 * Validates profile update values against supported system configuration.
 *
 * @param input - Parsed and schema-validated input
 * @param supportedValues - Supported values from system_config
 * @returns Validation result with any invalid value errors
 */
export function validateProfileValues(
  input: ProfileUpdateInput,
  supportedValues: SupportedProfileValues
): ProfileValueValidationResult {
  const errors: ValidationErrorDetailDTO[] = [];

  if (input.allergies) {
    const invalidAllergies = input.allergies.filter((a) => !supportedValues.allergies.includes(a));
    if (invalidAllergies.length > 0) {
      errors.push({
        field: "allergies",
        message: `Invalid allergy value(s): '${invalidAllergies.join("', '")}'. Supported values: ${supportedValues.allergies.join(", ")}`,
      });
    }
  }

  if (input.diets) {
    const invalidDiets = input.diets.filter((d) => !supportedValues.diets.includes(d));
    if (invalidDiets.length > 0) {
      errors.push({
        field: "diets",
        message: `Invalid diet value(s): '${invalidDiets.join("', '")}'. Supported values: ${supportedValues.diets.join(", ")}`,
      });
    }
  }

  if (input.equipment) {
    const invalidEquipment = input.equipment.filter((e) => !supportedValues.equipment.includes(e));
    if (invalidEquipment.length > 0) {
      errors.push({
        field: "equipment",
        message: `Invalid equipment value(s): '${invalidEquipment.join("', '")}'. Supported values: ${supportedValues.equipment.join(", ")}`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Profile Data Access Functions
// =============================================================================

/**
 * Fetches a user's profile by their user ID.
 *
 * @param supabase - Supabase client instance with database types
 * @param userId - The authenticated user's UUID
 * @returns ProfileDTO if found, null if not found
 * @throws Error if database query fails (excluding "not found" errors)
 */
export async function getProfileByUserId(supabase: SupabaseClient, userId: string): Promise<ProfileDTO | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, allergies, diets, equipment, onboarding_status, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error) {
    // PGRST116: "The result contains 0 rows" - profile not found
    if (error.code === "PGRST116") {
      return null;
    }
    // Re-throw other database errors
    throw error;
  }

  return mapProfileRowToDTO(data);
}

/**
 * Updates a user's profile with the provided data.
 * Supports partial updates - only provided fields are modified.
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's UUID
 * @param data - Partial profile update data (validated input)
 * @returns Updated ProfileDTO if found and updated, null if profile not found
 * @throws Error if database query fails (excluding "not found" errors)
 */
export async function updateProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
  data: ProfileUpdateInput
): Promise<ProfileDTO | null> {
  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.allergies !== undefined) {
    updateData.allergies = data.allergies;
  }
  if (data.diets !== undefined) {
    updateData.diets = data.diets;
  }
  if (data.equipment !== undefined) {
    updateData.equipment = data.equipment;
  }
  if (data.onboarding_status !== undefined) {
    updateData.onboarding_status = data.onboarding_status;
  }

  const { data: updatedRow, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select("id, allergies, diets, equipment, onboarding_status, created_at, updated_at")
    .single();

  if (error) {
    // PGRST116: "The result contains 0 rows" - profile not found
    if (error.code === "PGRST116") {
      return null;
    }
    // Re-throw other database errors
    throw error;
  }

  return mapProfileRowToDTO(updatedRow);
}

/**
 * Maps a database profile row to the ProfileDTO format.
 * Handles the transformation of JSONB fields (stored as Json type) to string arrays.
 *
 * @param row - Raw profile row from the database
 * @returns ProfileDTO with properly typed fields
 */
export function mapProfileRowToDTO(row: ProfileRow): ProfileDTO {
  return {
    id: row.id,
    allergies: ensureStringArray(row.allergies),
    diets: ensureStringArray(row.diets),
    equipment: ensureStringArray(row.equipment),
    onboarding_status: row.onboarding_status as OnboardingStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
