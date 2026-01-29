"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/db/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { AuthContextValue } from "./types";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider component that manages authentication state.
 * Wraps the application to provide auth context to all components.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpiredState] = useState(false);

  // Initialize auth state and set up listener
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        setUser(user);
        setSession(session);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setUser(null);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Handle signed_out event
      if (event === "SIGNED_OUT") {
        setSessionExpiredState(false);
      }

      // Handle token refresh errors (session expired)
      if (event === "TOKEN_REFRESHED" && !session) {
        setSessionExpiredState(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpiredState(false);
  }, []);

  const setSessionExpired = useCallback(() => {
    setSessionExpiredState(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      sessionExpired,
      signIn,
      signUp,
      signOut,
      resetPassword,
      clearSessionExpired,
      setSessionExpired,
    }),
    [
      user,
      session,
      isLoading,
      sessionExpired,
      signIn,
      signUp,
      signOut,
      resetPassword,
      clearSessionExpired,
      setSessionExpired,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the authentication context.
 * Must be used within an AuthProvider.
 *
 * @returns AuthContextValue with auth state and methods
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
