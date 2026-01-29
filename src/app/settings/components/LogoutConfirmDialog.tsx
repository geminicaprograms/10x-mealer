"use client";

/**
 * LogoutConfirmDialog Component
 *
 * Simple confirmation dialog for logout action to prevent accidental logouts.
 */

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

import type { LogoutConfirmDialogProps } from "../types";
import { SETTINGS_STRINGS } from "../types";

// =============================================================================
// Component
// =============================================================================

export function LogoutConfirmDialog({ isOpen, onClose, onConfirm, isLoading }: LogoutConfirmDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{SETTINGS_STRINGS.logoutDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{SETTINGS_STRINGS.logoutDialog.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{SETTINGS_STRINGS.logoutDialog.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {SETTINGS_STRINGS.logoutDialog.confirming}
              </>
            ) : (
              SETTINGS_STRINGS.logoutDialog.confirm
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
