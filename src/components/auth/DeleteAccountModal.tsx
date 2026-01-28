"use client";

import * as React from "react";
import { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

/** Required confirmation text for account deletion */
const DELETE_ACCOUNT_CONFIRMATION = "USUŃ MOJE KONTO";

/**
 * Validation schema for account deletion.
 */
const deleteAccountSchema = z.object({
  password: z.string().min(1, "Hasło jest wymagane"),
  confirmation: z.string().min(1, "Potwierdzenie jest wymagane"),
});

type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;

/**
 * Extended schema with confirmation check for form validation.
 */
const deleteAccountSchemaWithConfirmation = deleteAccountSchema.refine(
  (data) => data.confirmation === DELETE_ACCOUNT_CONFIRMATION,
  {
    message: `Wpisz dokładnie: ${DELETE_ACCOUNT_CONFIRMATION}`,
    path: ["confirmation"],
  }
);

interface DeleteAccountModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when account is successfully deleted */
  onSubmit?: (data: DeleteAccountFormData) => Promise<void>;
}

/**
 * Account deletion confirmation modal.
 * Requires password re-verification and confirmation text before deleting.
 */
export function DeleteAccountModal({ isOpen, onClose, onSubmit }: DeleteAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const passwordId = useId();
  const confirmationId = useId();
  const passwordErrorId = useId();
  const confirmationErrorId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeleteAccountFormData>({
    resolver: zodResolver(deleteAccountSchemaWithConfirmation),
    mode: "onBlur",
  });

  const handleFormSubmit = async (data: DeleteAccountFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      // Backend integration will be added later
      // On success, should redirect to /login
    } catch {
      setServerError("Nieprawidłowe hasło lub wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setServerError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center">Usuwanie konta</DialogTitle>
          <DialogDescription className="text-center">
            Ta operacja jest nieodwracalna. Potwierdź usunięcie konta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Warning message */}
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            <p className="font-medium">Uwaga!</p>
            <p className="mt-1">
              Wszystkie Twoje dane, w tym profil, inwentarz i historia, zostaną trwale usunięte. Tej operacji nie można
              cofnąć.
            </p>
          </div>

          {/* Server error message */}
          {serverError && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm" role="alert" aria-live="polite">
              {serverError}
            </div>
          )}

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor={passwordId}>Potwierdź hasłem</Label>
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

          {/* Confirmation field */}
          <div className="space-y-2">
            <Label htmlFor={confirmationId}>
              Wpisz <span className="font-semibold">{DELETE_ACCOUNT_CONFIRMATION}</span> aby potwierdzić
            </Label>
            <Input
              id={confirmationId}
              type="text"
              autoComplete="off"
              placeholder={DELETE_ACCOUNT_CONFIRMATION}
              aria-invalid={!!errors.confirmation}
              aria-describedby={errors.confirmation ? confirmationErrorId : undefined}
              disabled={isSubmitting}
              {...register("confirmation")}
            />
            {errors.confirmation && (
              <p id={confirmationErrorId} className="text-destructive text-sm" role="alert">
                {errors.confirmation.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Anuluj
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
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
                  <span>Usuwanie...</span>
                </>
              ) : (
                "Usuń konto"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
