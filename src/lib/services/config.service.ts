import type { SupabaseClient } from "@/db/supabase/server";
import type { SystemConfigDTO, RateLimitsConfigDTO } from "@/types";
import { ensureStringArray, ensureNumber } from "@/lib/utils/db";
import type { Json } from "@/db/supabase/database.types";

/**
 * Config Service
 *
 * Provides access to system configuration stored in the system_config table.
 * Configuration includes supported values for user profiles and rate limits.
 */

/**
 * Configuration keys stored in system_config table.
 */
const CONFIG_KEYS = ["supported_allergies", "supported_diets", "supported_equipment", "rate_limits"] as const;

/**
 * Default rate limits if not configured in database.
 */
const DEFAULT_RATE_LIMITS: RateLimitsConfigDTO = {
  receipt_scans_per_day: 5,
  substitutions_per_day: 10,
};

/**
 * Parses rate limits from JSONB value with fallback to defaults.
 *
 * @param value - JSONB value from database
 * @returns Parsed rate limits with defaults for missing values
 */
function parseRateLimits(value: Json | undefined): RateLimitsConfigDTO {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_RATE_LIMITS };
  }

  const obj = value as Record<string, Json | undefined>;

  return {
    receipt_scans_per_day: ensureNumber(obj.receipt_scans_per_day, DEFAULT_RATE_LIMITS.receipt_scans_per_day),
    substitutions_per_day: ensureNumber(obj.substitutions_per_day, DEFAULT_RATE_LIMITS.substitutions_per_day),
  };
}

/**
 * Fetches and aggregates system configuration from database.
 * Returns default values for any missing configuration entries.
 *
 * @param supabase - Authenticated Supabase client
 * @returns SystemConfigDTO with all configuration values
 * @throws PostgrestError if database query fails
 */
export async function getSystemConfig(supabase: SupabaseClient): Promise<SystemConfigDTO> {
  const { data, error } = await supabase.from("system_config").select("key, value").in("key", CONFIG_KEYS);

  if (error) {
    throw error;
  }

  // Initialize with default values
  const config: SystemConfigDTO = {
    supported_allergies: [],
    supported_diets: [],
    supported_equipment: [],
    rate_limits: { ...DEFAULT_RATE_LIMITS },
  };

  // Populate from database values
  for (const row of data ?? []) {
    switch (row.key) {
      case "supported_allergies":
        config.supported_allergies = ensureStringArray(row.value);
        break;
      case "supported_diets":
        config.supported_diets = ensureStringArray(row.value);
        break;
      case "supported_equipment":
        config.supported_equipment = ensureStringArray(row.value);
        break;
      case "rate_limits":
        config.rate_limits = parseRateLimits(row.value);
        break;
    }
  }

  return config;
}
