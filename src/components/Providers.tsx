"use client";

import * as React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { AIUsageProvider } from "@/contexts/AIUsageContext";
import { SessionExpiredDialog } from "@/components/SessionExpiredDialog";
import { OfflineIndicator } from "@/components/OfflineIndicator";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Inner component that renders the SessionExpiredDialog.
 * Must be inside AuthProvider to access auth context.
 */
function SessionExpiredHandler({ children }: { children: React.ReactNode }) {
  const { sessionExpired, clearSessionExpired } = useAuth();

  return (
    <>
      {children}
      <SessionExpiredDialog open={sessionExpired} onAction={clearSessionExpired} />
    </>
  );
}

/**
 * Providers component that wraps the application with all required context providers.
 * Establishes the correct hierarchy:
 * - AuthProvider (outermost - manages authentication state)
 * - ProfileProvider (depends on AuthContext for user ID)
 * - AIUsageProvider (depends on AuthContext for user ID)
 *
 * Also includes:
 * - SessionExpiredDialog for handling session expiration globally
 * - OfflineIndicator for displaying connection status
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AIUsageProvider>
          <SessionExpiredHandler>
            <OfflineIndicator />
            {children}
          </SessionExpiredHandler>
        </AIUsageProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
