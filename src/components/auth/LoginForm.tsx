"use client";

import * as React from "react";
import { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/db/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/services/auth.service";
import { mapAuthError } from "@/lib/utils/auth-errors";

interface LoginFormProps {
  /** Callback when login is successful (called before redirect) */
  onSuccess?: () => void;
  /** URL to redirect after successful login (defaults to checking onboarding status) */
  redirectTo?: string;
}

/**
 * Login form component with email and password fields.
 * Integrates with Supabase Auth for authentication.
 * Includes client-side validation, loading state, and error handling.
 */
export function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const handleFormSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    setServerError(null);

    // Attempt Supabase Auth login
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(mapAuthError(error));
      setIsSubmitting(false);
      return;
    }

    // Call optional success callback
    onSuccess?.();

    // Determine redirect destination
    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    // Check onboarding status to determine redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_status")
      .eq("id", authData.user.id)
      .single();

    // Redirect based on onboarding status
    if (profile?.onboarding_status === "pending") {
      router.push("/onboarding");
    } else {
      router.push("/inventory");
    }

    // Refresh to update Server Components with new auth state
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {/* Server error message */}
      {serverError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm" role="alert" aria-live="polite">
          {serverError}
        </div>
      )}

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          placeholder="jan@przykład.pl"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? emailErrorId : undefined}
          disabled={isSubmitting}
          {...register("email")}
        />
        {errors.email && (
          <p id={emailErrorId} className="text-destructive text-sm" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={passwordId}>Hasło</Label>
          <Link
            href="/reset-password"
            className="text-muted-foreground hover:text-primary text-sm transition-colors"
            tabIndex={isSubmitting ? -1 : 0}
          >
            Zapomniałeś hasła?
          </Link>
        </div>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? passwordErrorId : undefined}
          disabled={isSubmitting}
          {...register("password")}
        />
        {errors.password && (
          <p id={passwordErrorId} className="text-destructive text-sm" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Logowanie...</span>
          </>
        ) : (
          "Zaloguj się"
        )}
      </Button>

      {/* Register link */}
      <p className={cn("text-muted-foreground text-center text-sm", isSubmitting && "pointer-events-none opacity-50")}>
        Nie masz konta?{" "}
        <Link href="/register" className="text-primary hover:underline" tabIndex={isSubmitting ? -1 : 0}>
          Zarejestruj się
        </Link>
      </p>
    </form>
  );
}
