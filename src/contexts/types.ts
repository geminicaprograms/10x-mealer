/**
 * Type definitions for React Context providers
 */

import type { User, Session } from "@supabase/supabase-js";
import type { ProfileDTO, ProfileUpdateCommand, AIUsageDTO } from "@/types";

/**
 * Authentication context value.
 * Provides auth state and methods for sign in, sign up, sign out, and password reset.
 */
export interface AuthContextValue {
  /** Current authenticated user or null if not authenticated */
  user: User | null;
  /** Current session or null if not authenticated */
  session: Session | null;
  /** Whether auth state is being loaded */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Flag indicating session has expired and user needs to re-authenticate */
  sessionExpired: boolean;
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign up with email and password */
  signUp: (email: string, password: string) => Promise<void>;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Request password reset email */
  resetPassword: (email: string) => Promise<void>;
  /** Clear session expired flag */
  clearSessionExpired: () => void;
  /** Set session expired flag (for use by API error handlers) */
  setSessionExpired: () => void;
}

/**
 * Profile context value.
 * Provides user profile data and methods for updating profile.
 */
export interface ProfileContextValue {
  /** Current user profile or null if not loaded */
  profile: ProfileDTO | null;
  /** Whether profile is being loaded */
  isLoading: boolean;
  /** Error that occurred during profile operations */
  error: Error | null;
  /** Whether onboarding is completed */
  isOnboardingCompleted: boolean;
  /** Update user profile with partial data */
  updateProfile: (data: ProfileUpdateCommand) => Promise<void>;
  /** Refetch profile data from API */
  refetch: () => Promise<void>;
}

/**
 * AI Usage context value.
 * Provides AI usage limits and remaining quota.
 */
export interface AIUsageContextValue {
  /** Current AI usage data or null if not loaded */
  usage: AIUsageDTO | null;
  /** Whether usage data is being loaded */
  isLoading: boolean;
  /** Error that occurred during usage operations */
  error: Error | null;
  /** Whether user can perform receipt scans (has remaining quota) */
  canScan: boolean;
  /** Whether user can get substitution suggestions (has remaining quota) */
  canGetSubstitutions: boolean;
  /** Refetch usage data from API */
  refetch: () => Promise<void>;
}
