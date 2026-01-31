"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface SessionExpiredDialogProps {
  /** Control dialog visibility */
  open: boolean;
  /** Callback when dialog action is performed (redirect to login) */
  onAction?: () => void;
}

/**
 * Dialog that appears when user session expires.
 * Forces user to re-authenticate by redirecting to login page.
 * Preserves the original URL to redirect back after successful login.
 */
export function SessionExpiredDialog({ open, onAction }: SessionExpiredDialogProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogin = () => {
    // Clear session expired state if callback provided
    onAction?.();

    // Preserve current path for redirect after login
    const redirectUrl = encodeURIComponent(pathname);
    router.push(`/login?redirect=${redirectUrl}`);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent aria-describedby="session-expired-description">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-amber-100 dark:bg-amber-900/30">
            <LogIn className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Sesja wygasła</AlertDialogTitle>
          <AlertDialogDescription id="session-expired-description">
            Twoja sesja wygasła ze względów bezpieczeństwa. Zaloguj się ponownie, aby kontynuować.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleLogin}>Zaloguj się ponownie</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
