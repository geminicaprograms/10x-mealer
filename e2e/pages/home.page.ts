import { expect, Locator, Page } from "@playwright/test";

import { BasePage } from "./base.page";

/**
 * Page Object for the Home page
 * Implements the Page Object Model pattern for maintainable tests
 */
export class HomePage extends BasePage {
  // Locators
  readonly heading: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators using resilient selectors
    this.heading = this.getByRole("heading", { level: 1 });
    this.loginButton = this.getByRole("link", { name: /zaloguj|login/i });
    this.registerButton = this.getByRole("link", {
      name: /zarejestruj|register/i,
    });
  }

  /**
   * Navigate to the home page
   */
  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    await this.loginButton.click();
    await this.waitForNavigation();
  }

  /**
   * Navigate to registration page
   */
  async navigateToRegister(): Promise<void> {
    await this.registerButton.click();
    await this.waitForNavigation();
  }

  /**
   * Assert the page title is correct
   */
  async assertPageTitle(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  /**
   * Assert the main heading is visible
   */
  async assertHeadingVisible(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
