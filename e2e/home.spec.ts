import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { HomePage } from "./pages/home.page";

/**
 * E2E tests for the Home page
 * Demonstrates Page Object Model, accessibility testing, and visual comparison
 */
test.describe("Home Page", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();
  });

  test("should display the home page correctly", async () => {
    // Assert the page loads without errors
    await homePage.assertHeadingVisible();
  });

  test("should have no critical accessibility violations", async ({ page }) => {
    // Run accessibility audit using axe-core
    // Exclude best-practice rules to focus on WCAG violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Assert no WCAG violations found
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should match visual snapshot", async ({ page }) => {
    // Visual regression test
    await expect(page).toHaveScreenshot("home-page.png", {
      maxDiffPixels: 100,
    });
  });
});
