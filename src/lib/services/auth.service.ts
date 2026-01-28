import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase/server";
import { createAdminClient } from "@/db/supabase/admin";

// =============================================================================
// Constants
// =============================================================================

/** Required confirmation text for account deletion (Polish) */
export const DELETE_ACCOUNT_CONFIRMATION = "USUŃ MOJE KONTO";

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Zod schema for login request validation.
 * Used for client-side form validation and consistency with backend expectations.
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Zod schema for registration request validation.
 * Password must have: 8+ chars, uppercase, lowercase, number.
 * Used for client-side form validation and consistency with backend expectations.
 */
export const registerSchema = z
  .object({
    email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
    password: z
      .string()
      .min(8, "Hasło musi mieć minimum 8 znaków")
      .regex(/[A-Z]/, "Hasło musi zawierać wielką literę")
      .regex(/[a-z]/, "Hasło musi zawierać małą literę")
      .regex(/[0-9]/, "Hasło musi zawierać cyfrę"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Zod schema for validating POST /api/auth/delete-account request body.
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmation: z.string().min(1, "Confirmation is required"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// =============================================================================
// Verification Functions
// =============================================================================

/**
 * Verifies the confirmation text matches the required phrase.
 *
 * @param confirmation - User-provided confirmation text
 * @returns true if confirmation matches exactly
 */
export function verifyConfirmationText(confirmation: string): boolean {
  return confirmation === DELETE_ACCOUNT_CONFIRMATION;
}

/**
 * Verifies the user's password by attempting to sign in.
 *
 * @param supabase - Supabase client instance
 * @param email - User's email address
 * @param password - Password to verify
 * @returns true if password is valid, false otherwise
 */
export async function verifyUserPassword(supabase: SupabaseClient, email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return !error;
}

// =============================================================================
// Account Deletion
// =============================================================================

/**
 * Deletes a user account using the Supabase Admin API.
 * This will cascade delete all associated data (profiles, inventory, etc.)
 *
 * @param userId - The user's UUID
 * @throws Error if deletion fails
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Failed to delete user account:", {
      userId,
      error: error.message,
    });
    throw new Error("Failed to delete user account");
  }
}

/**
 * Signs out the user to invalidate their session.
 *
 * @param supabase - Supabase client instance
 */
export async function signOutUser(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}
