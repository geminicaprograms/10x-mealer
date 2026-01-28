"use client";

import * as React from "react";
import { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { cn } from "@/lib/utils";

/**
 * Validation schema for update password form.
 * Same password requirements as registration.
 */
const updatePasswordSchema = z
  .object({
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

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

interface UpdatePasswordFormProps {
  /** Callback when form is successfully submitted */
  onSubmit?: (data: UpdatePasswordFormData) => Promise<void>;
}

/**
 * Update password form component for setting new password after reset.
 * Includes password strength indicator and confirmation field.
 */
export function UpdatePasswordForm({ onSubmit }: UpdatePasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const passwordId = useId();
  const confirmPasswordId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();
  const passwordRequirementsId = useId();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    mode: "onBlur",
  });

  const passwordValue = watch("password", "");

  const handleFormSubmit = async (data: UpdatePasswordFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      // Backend integration will be added later
      // On success, should show toast and redirect to /login
    } catch {
      setServerError("Wystąpił błąd. Spróbuj ponownie później.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {/* Server error message */}
      {serverError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm" role="alert" aria-live="polite">
          {serverError}
        </div>
      )}

      {/* New password field */}
      <div className="space-y-2">
        <Label htmlFor={passwordId}>Nowe hasło</Label>
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
        <Label htmlFor={confirmPasswordId}>Potwierdź nowe hasło</Label>
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
            <span>Zapisywanie...</span>
          </>
        ) : (
          "Ustaw nowe hasło"
        )}
      </Button>
    </form>
  );
}
