"use client";

/**
 * AccountSection Component
 *
 * Contains account management actions including logout and account deletion
 * with appropriate confirmation dialogs.
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2 } from "lucide-react";

import { DeleteAccountModal } from "@/components/auth/DeleteAccountModal";
import type { DeleteAccountCommand } from "@/types";

import type { AccountSectionProps } from "../types";
import { SETTINGS_STRINGS } from "../types";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";

// =============================================================================
// Component
// =============================================================================

export function AccountSection({ onLogout, onDeleteAccount, isLoggingOut, isDeletingAccount }: AccountSectionProps) {
  // Dialog states
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleLogoutClick = useCallback(() => {
    setIsLogoutDialogOpen(true);
  }, []);

  const handleLogoutClose = useCallback(() => {
    if (!isLoggingOut) {
      setIsLogoutDialogOpen(false);
    }
  }, [isLoggingOut]);

  const handleLogoutConfirm = useCallback(async () => {
    await onLogout();
    // Dialog will be closed after successful logout via redirect
  }, [onLogout]);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteClose = useCallback(() => {
    if (!isDeletingAccount) {
      setIsDeleteModalOpen(false);
    }
  }, [isDeletingAccount]);

  const handleDeleteSubmit = useCallback(
    async (data: { password: string; confirmation: string }) => {
      const command: DeleteAccountCommand = {
        password: data.password,
        confirmation: data.confirmation,
      };
      await onDeleteAccount(command);
      // Modal will be closed after successful deletion via redirect
    },
    [onDeleteAccount]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Card>
        <CardHeader>
          <h2 className="text-lg leading-none font-semibold">{SETTINGS_STRINGS.account.title}</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={handleLogoutClick} disabled={isLoggingOut || isDeletingAccount}>
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              {SETTINGS_STRINGS.account.logout}
            </Button>
            <Button variant="destructive" onClick={handleDeleteClick} disabled={isLoggingOut || isDeletingAccount}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {SETTINGS_STRINGS.account.deleteAccount}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={handleLogoutClose}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={handleDeleteClose} onSubmit={handleDeleteSubmit} />
    </>
  );
}
