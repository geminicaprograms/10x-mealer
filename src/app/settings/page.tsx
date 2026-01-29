"use client";

/**
 * Settings Page
 *
 * Main settings page component. Provides a central hub for users to manage
 * their account preferences, view AI usage statistics, and perform account actions.
 *
 * Route: /settings
 * Protection: Requires authentication via Next.js middleware
 */

import { BottomNavigation } from "@/components/BottomNavigation";
import { Header } from "@/components/Header";
import { SettingsContainer } from "./components";
import { SETTINGS_STRINGS } from "./types";

// =============================================================================
// Page Component
// =============================================================================

export default function SettingsPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header - no settings icon since we're on settings page */}
      <Header title={SETTINGS_STRINGS.page.title} showSettings={false} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 pb-24" role="main" aria-label={SETTINGS_STRINGS.page.title}>
        <SettingsContainer />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
