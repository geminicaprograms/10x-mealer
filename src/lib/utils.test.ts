import { describe, expect, it } from "vitest";

import { cn } from "./utils";

/**
 * Example unit test demonstrating Vitest patterns
 * Following Arrange-Act-Assert pattern and descriptive test structure
 */
describe("cn utility function", () => {
  describe("basic functionality", () => {
    it("should merge class names", () => {
      // Arrange
      const classes = ["px-4", "py-2"];

      // Act
      const result = cn(...classes);

      // Assert
      expect(result).toBe("px-4 py-2");
    });

    it("should handle conditional classes", () => {
      // Arrange
      const isActive = true;
      const isDisabled = false;

      // Act
      const result = cn("base", isActive && "active", isDisabled && "disabled");

      // Assert
      expect(result).toBe("base active");
    });

    it("should deduplicate Tailwind classes", () => {
      // Arrange
      const classes = ["px-4", "px-6"];

      // Act
      const result = cn(...classes);

      // Assert
      expect(result).toBe("px-6");
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      // Act
      const result = cn();

      // Assert
      expect(result).toBe("");
    });

    it("should handle undefined and null values", () => {
      // Act
      const result = cn("base", undefined, null, "extra");

      // Assert
      expect(result).toBe("base extra");
    });
  });
});
