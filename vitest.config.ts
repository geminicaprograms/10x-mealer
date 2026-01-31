import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // Environment
    environment: "jsdom",

    // Setup files for global mocks and matchers
    setupFiles: ["./src/test/setup.tsx"],

    // Include patterns for test files
    include: ["src/**/*.{test,spec}.{ts,tsx}"],

    // Exclude patterns
    exclude: ["node_modules", "e2e/**/*"],

    // Global test timeout
    testTimeout: 10000,

    // Enable globals (describe, it, expect, vi)
    globals: true,

    // Coverage configuration (run with --coverage flag when needed)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/test/**/*",
        "src/components/ui/**/*",
        "src/db/supabase/database.types.ts",
      ],
    },

    // Reporter configuration
    reporters: ["default"],

    // Watch mode configuration
    watch: false,

    // Type checking
    typecheck: {
      enabled: false, // Enable with --typecheck flag
    },
  },
});
