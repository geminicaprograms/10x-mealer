/**
 * Recipe Service
 *
 * Provides functions for parsing recipe ingredients from URLs and raw text.
 * Includes domain validation, SSRF protection, and content fetching.
 *
 * @module recipe.service
 */

import { z } from "zod";
import * as cheerio from "cheerio";
import type { ParsedIngredientDTO } from "@/types";

// =============================================================================
// Constants
// =============================================================================

/** Maximum allowed characters for raw text input */
export const MAX_TEXT_LENGTH = 10000;

/** Maximum allowed HTML content size (5MB) */
export const MAX_HTML_SIZE = 5 * 1024 * 1024;

/** Timeout for fetching external URLs (10 seconds) */
export const FETCH_TIMEOUT = 10000;

/** Maximum number of ingredients to extract */
export const MAX_INGREDIENTS = 50;

/**
 * Allowlist of domains supported for recipe parsing.
 * Only HTTPS requests to these domains are permitted.
 */
export const ALLOWED_DOMAINS = [
  "rozkoszny.pl",
  "www.rozkoszny.pl",
  "kwestiasmaku.com",
  "www.kwestiasmaku.com",
  "aniagotuje.pl",
  "www.aniagotuje.pl",
  "kuchnialidla.pl",
  "www.kuchnialidla.pl",
  "mojegotowanie.pl",
  "www.mojegotowanie.pl",
  "cazzscookingcommunity.github.io",
  "www.cazzscookingcommunity.github.io",
] as const;

/**
 * Domain-specific CSS selectors for better content extraction.
 * Falls back to generic extraction if domain not specified.
 * Multiple selectors can be comma-separated for fallback.
 */
export const DOMAIN_SELECTORS: Record<string, { title?: string; ingredients?: string[] }> = {
  "kwestiasmaku.com": {
    title: "h1.przepis, h1.recipe-title, .recipe-header h1, article h1",
    ingredients: [
      ".skladniki-lista li",
      ".ingredients-list li",
      ".recipe-ingredients li",
      '[class*="skladnik"] li',
      '[class*="ingredient"] li',
      ".przepis-skladniki li",
    ],
  },
  "www.kwestiasmaku.com": {
    title: "h1.przepis, h1.recipe-title, .recipe-header h1, article h1",
    ingredients: [
      ".skladniki-lista li",
      ".ingredients-list li",
      ".recipe-ingredients li",
      '[class*="skladnik"] li',
      '[class*="ingredient"] li',
      ".przepis-skladniki li",
    ],
  },
  "aniagotuje.pl": {
    title: "h1.recipe-title, .recipe-header h1, article h1",
    ingredients: [".recipe-ingredients li", ".ingredients li", '[class*="ingredient"] li'],
  },
  "www.aniagotuje.pl": {
    title: "h1.recipe-title, .recipe-header h1, article h1",
    ingredients: [".recipe-ingredients li", ".ingredients li", '[class*="ingredient"] li'],
  },
};

// =============================================================================
// Types
// =============================================================================

/** Result of URL fetch operation */
export interface FetchedContent {
  html: string;
  title: string;
  contentLength: number;
}

/** Domain validation result */
export interface DomainValidationResult {
  valid: boolean;
  error?: string;
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for POST /api/recipes/parse request body.
 * Validates URL format and ensures HTTPS protocol.
 */
export const recipeParseSchema = z.object({
  url: z
    .string({ required_error: "URL is required" })
    .url("Invalid URL format")
    .refine((url) => url.startsWith("https://"), {
      message: "Only HTTPS URLs are allowed",
    }),
});

/**
 * Schema for POST /api/recipes/parse-text request body.
 * Validates text length and trims whitespace.
 */
export const recipeParseTextSchema = z.object({
  text: z
    .string({ required_error: "Text is required" })
    .min(1, "Text is required")
    .max(MAX_TEXT_LENGTH, `Text exceeds ${MAX_TEXT_LENGTH} character limit`)
    .transform((val) => val.trim()),
});

// =============================================================================
// Domain Validation Functions
// =============================================================================

/**
 * Private IP ranges that should be blocked to prevent SSRF attacks.
 */
const PRIVATE_IP_PATTERNS = [
  /^127\./, // localhost (127.0.0.0/8)
  /^10\./, // private (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // private (172.16.0.0/12)
  /^192\.168\./, // private (192.168.0.0/16)
  /^169\.254\./, // link-local (169.254.0.0/16)
  /^0\./, // current network
  /^localhost$/i,
  /^::1$/, // IPv6 localhost
  /^fc00:/i, // IPv6 unique local
  /^fe80:/i, // IPv6 link-local
];

/**
 * Checks if a hostname is a private/internal IP address.
 * Used to prevent SSRF attacks targeting internal infrastructure.
 *
 * @param hostname - The hostname or IP address to check
 * @returns true if the hostname appears to be a private IP
 */
export function isPrivateIP(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
}

/**
 * Checks if a URL's domain is in the allowed list for recipe parsing.
 *
 * @param url - The URL to validate
 * @returns true if the domain is allowed
 */
export function isAllowedDomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check against allowed domains list
    return ALLOWED_DOMAINS.some((domain) => hostname === domain);
  } catch {
    return false;
  }
}

/**
 * Performs comprehensive security validation on a URL.
 * Checks for:
 * - Valid URL format
 * - HTTPS protocol
 * - No embedded credentials
 * - Domain in allowlist
 * - Not targeting private IP addresses
 *
 * @param url - The URL to validate
 * @returns Validation result with optional error message
 */
export function validateUrlSecurity(url: string): DomainValidationResult {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Check HTTPS only
  if (parsedUrl.protocol !== "https:") {
    return { valid: false, error: "Only HTTPS URLs are allowed" };
  }

  // Check for embedded credentials (potential security risk)
  if (parsedUrl.username || parsedUrl.password) {
    return { valid: false, error: "URLs with credentials are not allowed" };
  }

  // Check for private IP addresses (SSRF protection)
  if (isPrivateIP(parsedUrl.hostname)) {
    return { valid: false, error: "Private IP addresses are not allowed" };
  }

  // Check domain allowlist
  if (!isAllowedDomain(url)) {
    return { valid: false, error: "Domain not supported for recipe parsing" };
  }

  return { valid: true };
}

// =============================================================================
// Content Fetching
// =============================================================================

/**
 * Custom error class for content fetching failures.
 */
export class ContentFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "ContentFetchError";
  }
}

/**
 * Fetches recipe content from an external URL.
 *
 * Features:
 * - Timeout enforcement (10 seconds)
 * - Content size limit (5MB)
 * - Proper HTTP error handling
 * - Browser-like headers for better compatibility
 *
 * @param url - The URL to fetch (must be pre-validated)
 * @returns Fetched HTML content with metadata
 * @throws ContentFetchError if fetch fails or times out
 */
export async function fetchRecipeContent(url: string): Promise<FetchedContent> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // Standard browser headers
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        // Modern Chrome User-Agent
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        // Security headers that browsers send
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        // Cache control
        "Cache-Control": "max-age=0",
      },
      signal: controller.signal,
      // Follow redirects
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 404) {
        throw new ContentFetchError("Recipe page not found", 404);
      }
      throw new ContentFetchError(`Failed to fetch recipe page: HTTP ${response.status}`, response.status);
    }

    // Check content length header
    const contentLength = parseInt(response.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_HTML_SIZE) {
      throw new ContentFetchError(`Content too large: ${contentLength} bytes exceeds ${MAX_HTML_SIZE} byte limit`);
    }

    // Read content as text
    const html = await response.text();

    // Double-check actual content size
    if (html.length > MAX_HTML_SIZE) {
      throw new ContentFetchError(`Content too large: ${html.length} bytes exceeds ${MAX_HTML_SIZE} byte limit`);
    }

    // Extract basic title from HTML (will be enhanced with cheerio later)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Unknown Recipe";

    return {
      html,
      title,
      contentLength: html.length,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ContentFetchError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new ContentFetchError("Request timeout while fetching recipe page");
      }
      throw new ContentFetchError(`Failed to fetch recipe page: ${error.message}`, undefined, error);
    }

    throw new ContentFetchError("Failed to fetch recipe page");
  }
}

// =============================================================================
// Content Extraction
// =============================================================================

/**
 * Extracts recipe title from HTML using domain-specific or generic selectors.
 *
 * @param $ - Cheerio instance loaded with HTML
 * @param domain - Domain of the source URL
 * @returns Extracted title or null
 */
function extractTitle($: cheerio.CheerioAPI, domain: string): string | null {
  // Try domain-specific selector first
  const domainSelectors = DOMAIN_SELECTORS[domain];
  if (domainSelectors?.title) {
    const titleText = $(domainSelectors.title).first().text().trim();
    if (titleText) return titleText;
  }

  // Try common recipe title selectors
  const commonTitleSelectors = [
    'h1[class*="recipe"]',
    'h1[class*="przepis"]',
    ".recipe-title",
    ".przepis-tytul",
    'h1[itemprop="name"]',
    "article h1",
    ".entry-title",
    "h1",
  ];

  for (const selector of commonTitleSelectors) {
    const titleText = $(selector).first().text().trim();
    if (titleText && titleText.length > 3 && titleText.length < 200) {
      return titleText;
    }
  }

  return null;
}

/**
 * Extracts ingredients list from HTML using domain-specific or generic selectors.
 *
 * @param $ - Cheerio instance loaded with HTML
 * @param domain - Domain of the source URL
 * @returns Array of ingredient text strings
 */
function extractIngredients($: cheerio.CheerioAPI, domain: string): string[] {
  const ingredients: string[] = [];

  // Try domain-specific selectors first (now supports array of selectors)
  const domainSelectors = DOMAIN_SELECTORS[domain];
  if (domainSelectors?.ingredients) {
    const selectorsToTry = Array.isArray(domainSelectors.ingredients)
      ? domainSelectors.ingredients
      : [domainSelectors.ingredients];

    for (const selector of selectorsToTry) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 2) ingredients.push(text);
      });
      if (ingredients.length > 0) return ingredients;
    }
  }

  // Try common ingredient list selectors
  const commonIngredientSelectors = [
    '[itemprop="recipeIngredient"]',
    '[itemprop="ingredients"]',
    ".recipe-ingredients li",
    ".ingredients li",
    ".skladniki li",
    ".skladniki-lista li",
    'ul[class*="ingredient"] li',
    'ul[class*="skladnik"] li',
    'div[class*="ingredient"] li',
    'div[class*="skladnik"] li',
    '[class*="ingredient-list"] li',
    '[class*="ingredients-list"] li',
    ".recipe-ingredient",
    ".ingredient-item",
    ".ingredient",
    // Try data attributes commonly used
    "[data-ingredient]",
    '[data-testid*="ingredient"]',
  ];

  for (const selector of commonIngredientSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2) {
        ingredients.push(text);
      }
    });
    if (ingredients.length > 0) return ingredients;
  }

  return ingredients;
}

/**
 * Extracts recipe data from JSON-LD structured data if present.
 *
 * @param $ - Cheerio instance loaded with HTML
 * @returns Object with title and ingredients, or null if not found
 */
function extractFromJsonLd($: cheerio.CheerioAPI): { title: string; ingredients: string[] } | null {
  try {
    const jsonLdScripts = $('script[type="application/ld+json"]');

    if (jsonLdScripts.length === 0) {
      console.log("[Recipe] No JSON-LD scripts found");
      return null;
    }

    console.log(`[Recipe] Found ${jsonLdScripts.length} JSON-LD script(s)`);

    for (let i = 0; i < jsonLdScripts.length; i++) {
      const scriptContent = $(jsonLdScripts[i]).html();
      if (!scriptContent) continue;

      let data;
      try {
        data = JSON.parse(scriptContent);
      } catch (parseError) {
        console.log(`[Recipe] JSON-LD parse error for script ${i}:`, parseError);
        continue;
      }

      // Handle array of schemas
      const schemas = Array.isArray(data) ? data : [data];

      for (const schema of schemas) {
        // Check for Recipe type
        if (schema["@type"] === "Recipe" || (Array.isArray(schema["@type"]) && schema["@type"].includes("Recipe"))) {
          const title = schema.name || null;
          const ingredients = Array.isArray(schema.recipeIngredient) ? schema.recipeIngredient : [];

          console.log(`[Recipe] Found Recipe schema: title="${title}", ingredients=${ingredients.length}`);

          if (title && ingredients.length > 0) {
            return { title, ingredients };
          }
        }

        // Check @graph for Recipe
        if (schema["@graph"] && Array.isArray(schema["@graph"])) {
          for (const item of schema["@graph"]) {
            if (item["@type"] === "Recipe") {
              const title = item.name || null;
              const ingredients = Array.isArray(item.recipeIngredient) ? item.recipeIngredient : [];

              console.log(`[Recipe] Found Recipe in @graph: title="${title}", ingredients=${ingredients.length}`);

              if (title && ingredients.length > 0) {
                return { title, ingredients };
              }
            }
          }
        }
      }
    }

    console.log("[Recipe] No Recipe schema with ingredients found in JSON-LD");
  } catch (error) {
    console.error("[Recipe] JSON-LD extraction error:", error);
  }

  return null;
}

/**
 * Extracts recipe-relevant content from HTML using cheerio.
 *
 * Extraction strategy:
 * 1. Try to extract from JSON-LD structured data (most reliable)
 * 2. Use domain-specific selectors if available
 * 3. Fall back to generic recipe/ingredient selectors
 * 4. As last resort, extract all text content
 *
 * @param html - Raw HTML content
 * @param domain - Domain of the source URL
 * @returns Extracted recipe content as text suitable for LLM parsing
 */
export function extractRecipeContent(html: string, domain: string): string {
  const $ = cheerio.load(html);

  // 1. Try JSON-LD extraction FIRST (before removing scripts!)
  const jsonLdData = extractFromJsonLd($);
  if (jsonLdData && jsonLdData.ingredients.length > 0) {
    const ingredientsList = jsonLdData.ingredients.join("\n");
    return `Tytuł: ${jsonLdData.title}\n\nSkładniki:\n${ingredientsList}`;
  }

  // Now remove script, style, and other non-content elements for DOM extraction
  $(
    "script, style, nav, header, footer, aside, .advertisement, .ads, .comments, .sidebar, .social-share, .related-posts"
  ).remove();

  // 2. Extract title and ingredients using DOM selectors
  const title = extractTitle($, domain);
  const ingredients = extractIngredients($, domain);

  // Build content string
  const parts: string[] = [];

  if (title) {
    parts.push(`Tytuł: ${title}`);
  }

  if (ingredients.length > 0) {
    parts.push(`\nSkładniki:\n${ingredients.join("\n")}`);
  }

  // If we found structured content, return it
  if (parts.length > 0 && ingredients.length > 0) {
    return parts.join("\n");
  }

  // 3. Fallback: extract main content area text
  // Try multiple selectors individually to find the one with most content
  const contentSelectors = [
    "main",
    "article",
    ".recipe",
    ".przepis",
    ".recipe-content",
    ".przepis-content",
    '[role="main"]',
    ".content",
    ".entry-content",
    ".post-content",
  ];

  let mainContent = "";
  for (const selector of contentSelectors) {
    const elementText = $(selector).first().text().trim();
    if (elementText && elementText.length > mainContent.length) {
      mainContent = elementText;
    }
  }

  // If no good content found, fall back to body
  if (mainContent.length < 100) {
    mainContent = $("body").text().trim();
  }

  // Clean up whitespace (multiple spaces/newlines to single space)
  let content = mainContent.replace(/\s+/g, " ").trim();

  // Limit content length to prevent sending too much to LLM
  const maxContentLength = 15000; // ~15KB of text
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength);
  }

  // Add title if we found one
  if (title) {
    content = `Tytuł: ${title}\n\n${content}`;
  }

  return content;
}

/**
 * Gets the domain from a URL for selector lookup.
 *
 * @param url - The URL to extract domain from
 * @returns Lowercase domain string
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.toLowerCase();
  } catch {
    return "";
  }
}
