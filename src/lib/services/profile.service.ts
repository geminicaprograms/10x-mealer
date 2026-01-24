import type { SupabaseClient } from "@/db/supabase/server";
import type { Tables } from "@/db/supabase/database.types";
import type { ProfileDTO, OnboardingStatus } from "@/types";
import { ensureStringArray } from "@/lib/utils/db";

type ProfileRow = Tables<"profiles">;

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
 * Maps a database profile row to the ProfileDTO format.
 * Handles the transformation of JSONB fields (stored as Json type) to string arrays.
 *
 * @param row - Raw profile row from the database
 * @returns ProfileDTO with properly typed fields
 */
function mapProfileRowToDTO(row: ProfileRow): ProfileDTO {
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
