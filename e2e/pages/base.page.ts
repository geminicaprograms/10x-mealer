import { Locator, Page } from "@playwright/test";

/**
 * Base Page Object class providing common functionality
 * All page objects should extend this class
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the page URL
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for the page to be fully loaded
   */
  abstract waitForLoad(): Promise<void>;

  /**
   * Get a locator by test id (data-testid attribute)
   */
  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get a locator by role with accessible name
   */
  protected getByRole(role: Parameters<Page["getByRole"]>[0], options?: Parameters<Page["getByRole"]>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Wait for navigation to complete
   */
  protected async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Take a screenshot for visual comparison
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `e2e/snapshots/${name}.png` });
  }
}
