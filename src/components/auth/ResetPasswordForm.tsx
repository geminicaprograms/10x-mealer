"use client";

import * as React from "react";
import { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/db/supabase/client";

/**
 * Validation schema for password reset request.
 */
const resetPasswordSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Password reset request form component.
 * Integrates directly with Supabase Auth to send password reset emails.
 * Displays success message after submission regardless of email existence (security).
 */
export function ResetPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailId = useId();
  const emailErrorId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  const handleFormSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        // Log the error but don't expose details to user for security
        console.error("Password reset error:", error.message);
      }

      // Always show success message for security (don't reveal if email exists)
      setIsSubmitted(true);
    } catch {
      setServerError("Wystąpił błąd. Spróbuj ponownie później.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state - show confirmation message
  if (isSubmitted) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Jeśli podany email istnieje w systemie, wysłaliśmy link do zresetowania hasła. Sprawdź swoją skrzynkę.
          </AlertDescription>
        </Alert>

        <p className="text-muted-foreground text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Powrót do logowania
          </Link>
        </p>
      </div>
    );
  }

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
            <span>Wysyłanie...</span>
          </>
        ) : (
          "Wyślij link resetujący"
        )}
      </Button>

      {/* Back to login link */}
      <p className={cn("text-muted-foreground text-center text-sm", isSubmitting && "pointer-events-none opacity-50")}>
        <Link href="/login" className="text-primary hover:underline" tabIndex={isSubmitting ? -1 : 0}>
          Powrót do logowania
        </Link>
      </p>
    </form>
  );
}
