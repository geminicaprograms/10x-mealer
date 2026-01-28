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
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { cn } from "@/lib/utils";
import { createClient } from "@/db/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/services/auth.service";
import { mapAuthError } from "@/lib/utils/auth-errors";

interface RegisterFormProps {
  /** Callback when registration is successful (called before redirect) */
  onSuccess?: () => void;
}

/**
 * Registration form component with email, password, and password confirmation fields.
 * Includes real-time password strength indicator and client-side validation.
 * Integrates with Supabase Auth for user registration.
 */
export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();
  const passwordRequirementsId = useId();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  const passwordValue = watch("password", "");

  const handleFormSubmit = async (data: RegisterInput) => {
    setIsSubmitting(true);
    setServerError(null);

    // Attempt Supabase Auth registration
    const { error } = await supabase.auth.signUp({
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

    // Redirect to onboarding after successful registration (US-001 requirement)
    router.push("/onboarding");

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
        <Label htmlFor={passwordId}>Hasło</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={cn(passwordRequirementsId, errors.password ? passwordErrorId : undefined)}
          disabled={isSubmitting}
          {...register("password")}
        />
        {/* Screen reader only password requirements */}
        <p id={passwordRequirementsId} className="sr-only">
          Hasło musi mieć minimum 8 znaków, zawierać wielką literę, małą literę i cyfrę.
        </p>
        {/* Password strength indicator */}
        <PasswordStrengthIndicator password={passwordValue} />
        {errors.password && (
          <p id={passwordErrorId} className="text-destructive text-sm" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm password field */}
      <div className="space-y-2">
        <Label htmlFor={confirmPasswordId}>Potwierdź hasło</Label>
        <Input
          id={confirmPasswordId}
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? confirmPasswordErrorId : undefined}
          disabled={isSubmitting}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p id={confirmPasswordErrorId} className="text-destructive text-sm" role="alert">
            {errors.confirmPassword.message}
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
            <span>Rejestracja...</span>
          </>
        ) : (
          "Zarejestruj się"
        )}
      </Button>

      {/* Login link */}
      <p className={cn("text-muted-foreground text-center text-sm", isSubmitting && "pointer-events-none opacity-50")}>
        Masz już konto?{" "}
        <Link href="/login" className="text-primary hover:underline" tabIndex={isSubmitting ? -1 : 0}>
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}
