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
import { SettingsContainer } from "./components";
import { SETTINGS_STRINGS } from "./types";

// =============================================================================
// Page Component
// =============================================================================

export default function SettingsPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-background sticky top-0 z-40 border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <h1 className="text-lg font-semibold">{SETTINGS_STRINGS.page.title}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 pb-24" role="main" aria-label={SETTINGS_STRINGS.page.title}>
        <SettingsContainer />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
