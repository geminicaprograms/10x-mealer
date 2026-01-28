/**
 * View Model Types for Receipt Scan View
 *
 * These types are specific to the Receipt Scan view UI and extend/complement
 * the DTOs defined in src/types.ts
 */

import type { UnitBriefDTO, ReceiptMatchedProductDTO } from "@/types";

// =============================================================================
// Phase Types
// =============================================================================

/** Current phase of the scan flow */
export type ScanPhase = "upload" | "processing" | "verification" | "submitting";

// =============================================================================
// Image Types
// =============================================================================

/** Image file with preview data */
export interface ImageFile {
  /** Original File object */
  file: File;
  /** Base64 encoded data (without data URL prefix) */
  base64: string;
  /** MIME type of the image */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Object URL for preview */
  previewUrl: string;
}

// =============================================================================
// Verification Item Types
// =============================================================================

/** Single item in verification list (ViewModel) */
export interface VerificationItemViewModel {
  /** Unique ID for React key (UUID generated on client) */
  id: string;
  /** Original name extracted by AI */
  originalName: string;
  /** Selected product from catalog (null if custom) */
  matchedProduct: ReceiptMatchedProductDTO | null;
  /** Custom name if not matched to catalog */
  customName: string;
  /** Quantity value */
  quantity: string;
  /** Selected unit */
  unit: UnitBriefDTO | null;
  /** AI confidence score (0-1) */
  confidence: number;
  /** Whether this item was added manually */
  isManuallyAdded: boolean;
  /** Validation errors for this item */
  errors: VerificationItemErrors;
}

/** Validation errors for a verification item */
export interface VerificationItemErrors {
  product?: string;
  quantity?: string;
  unit?: string;
}

/** Form state for adding a new manual item */
export interface ManualItemFormState {
  productId: number | null;
  customName: string;
  quantity: string;
  unitId: number | null;
}

// =============================================================================
// View State Types
// =============================================================================

/** Complete view state for Receipt Scan */
export interface ReceiptScanViewState {
  /** Current phase */
  phase: ScanPhase;
  /** Selected image file */
  image: ImageFile | null;
  /** Image validation error */
  imageError: string | null;
  /** Verification items */
  items: VerificationItemViewModel[];
  /** AI usage statistics */
  usage: AIUsageState | null;
  /** General error message */
  error: string | null;
  /** Whether rate limit dialog is shown */
  showRateLimitDialog: boolean;
  /** Partial success result (after submit) */
  partialSuccessResult: PartialSuccessResult | null;
}

/** AI usage state for the view */
export interface AIUsageState {
  scansUsed: number;
  scansLimit: number;
  scansRemaining: number;
}

/** Result of partial success submission */
export interface PartialSuccessResult {
  total: number;
  created: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

// =============================================================================
// Default State
// =============================================================================

export const DEFAULT_SCAN_VIEW_STATE: ReceiptScanViewState = {
  phase: "upload",
  image: null,
  imageError: null,
  items: [],
  usage: null,
  error: null,
  showRateLimitDialog: false,
  partialSuccessResult: null,
};

export const DEFAULT_MANUAL_ITEM: ManualItemFormState = {
  productId: null,
  customName: "",
  quantity: "",
  unitId: null,
};

// =============================================================================
// Constants
// =============================================================================

/** Supported image MIME types for receipt scanning */
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

/** Maximum image file size in bytes (10MB) */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Confidence thresholds for visual indicators */
export const CONFIDENCE_THRESHOLDS = {
  high: 0.85,
  medium: 0.6,
} as const;

// =============================================================================
// Polish UI Strings
// =============================================================================

export const SCAN_STRINGS = {
  // Page title
  pageTitle: "Skanuj paragon",
  back: "Wróć",

  // Usage indicator
  usage: {
    remaining: (remaining: number, limit: number) => `Pozostało skanów: ${remaining}/${limit}`,
    warning: "Zbliżasz się do dziennego limitu",
    exceeded: "Osiągnięto dzienny limit",
  },

  // Image upload
  upload: {
    selectImage: "Wybierz zdjęcie",
    changeImage: "Zmień zdjęcie",
    imageSize: (sizeMB: string) => `Rozmiar: ${sizeMB} MB`,
    dragHint: "lub przeciągnij i upuść",
    supportedFormats: "JPG, PNG, WebP, HEIC",
    dropHint: "Upuść zdjęcie tutaj",
  },

  // Process button
  process: {
    button: "Przetwórz paragon",
    processing: "Przetwarzanie...",
  },

  // Loading overlay
  loading: {
    message: "Przetwarzanie paragonu...",
    hint: "To może potrwać kilka sekund",
  },

  // Verification
  verification: {
    title: "Zweryfikuj produkty",
    itemCount: (count: number) => (count === 1 ? "1 produkt" : `${count} produktów`),
    lowConfidence: "Niskie dopasowanie",
    addMissing: "Dodaj pominięty produkt",
    noItemsExtracted: "Nie udało się rozpoznać żadnych produktów",
  },

  // Actions
  actions: {
    confirm: "Potwierdź",
    cancel: "Anuluj",
    delete: "Usuń",
    submitting: "Zapisywanie...",
  },

  // Validation errors
  validation: {
    imageRequired: "Wybierz zdjęcie paragonu",
    imageTooBig: "Plik jest zbyt duży. Maksymalny rozmiar to 10 MB.",
    invalidFormat: "Nieprawidłowy format pliku. Dozwolone: JPG, PNG, WebP, HEIC",
    productRequired: "Wybierz produkt lub wpisz własną nazwę",
    quantityPositive: "Ilość musi być liczbą dodatnią",
    unitRequired: "Wybierz jednostkę gdy podana jest ilość",
    noValidItems: "Brak produktów do dodania",
  },

  // Error messages
  errors: {
    scanFailed: "Nie udało się przetworzyć paragonu. Spróbuj ponownie.",
    imageQuality: "Jakość zdjęcia jest zbyt niska. Zrób wyraźniejsze zdjęcie.",
    submitFailed: "Nie udało się zapisać produktów. Spróbuj ponownie.",
    networkError: "Brak połączenia z internetem.",
    rateLimited: "Osiągnięto dzienny limit skanowań.",
    externalService: "Usługa AI jest tymczasowo niedostępna. Spróbuj ponownie później.",
  },

  // Rate limit dialog
  rateLimit: {
    title: "Osiągnięto limit skanowań",
    message: (limit: number) => `Wykorzystałeś już ${limit} skanów na dziś. Limit odnawia się o północy.`,
    suggestion: 'Możesz dodać produkty ręcznie używając opcji "Dodaj produkt".',
    close: "Rozumiem",
  },

  // Success messages
  success: {
    itemsAdded: (count: number) => (count === 1 ? "Dodano 1 produkt" : `Dodano ${count} produktów`),
    partialSuccess: (created: number, total: number) => `Dodano ${created} z ${total} produktów`,
  },

  // Partial success alert
  partialSuccess: {
    title: "Częściowy sukces",
    viewErrors: "Pokaż błędy",
    hideErrors: "Ukryj błędy",
    dismiss: "Zamknij",
  },

  // Form labels
  form: {
    product: "Produkt",
    quantity: "Ilość",
    unit: "Jednostka",
    unitPlaceholder: "Wybierz jednostkę",
    quantityPlaceholder: "np. 500",
  },

  // Tooltips
  tooltips: {
    confidenceHigh: "Wysokie dopasowanie",
    confidenceMedium: "Średnie dopasowanie",
    confidenceLow: "Niskie dopasowanie - sprawdź dane",
  },
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates a verification item and returns any errors.
 */
export function validateVerificationItem(item: VerificationItemViewModel): VerificationItemErrors {
  const errors: VerificationItemErrors = {};

  // Product required
  if (!item.matchedProduct && !item.customName.trim()) {
    errors.product = SCAN_STRINGS.validation.productRequired;
  }

  // Quantity validation
  if (item.quantity.trim()) {
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = SCAN_STRINGS.validation.quantityPositive;
    }
  }

  // Unit required if quantity provided
  if (item.quantity.trim() && !item.unit) {
    errors.unit = SCAN_STRINGS.validation.unitRequired;
  }

  return errors;
}

/**
 * Checks if a verification item is valid (has no errors).
 */
export function isValidItem(item: VerificationItemViewModel): boolean {
  const errors = validateVerificationItem(item);
  return Object.keys(errors).length === 0;
}

/**
 * Validates image file type.
 */
export function isValidImageType(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number]);
}

/**
 * Validates image file size.
 */
export function isValidImageSize(file: File): boolean {
  return file.size <= MAX_IMAGE_SIZE_BYTES;
}

/**
 * Formats file size in MB for display.
 */
export function formatFileSizeMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

/**
 * Gets confidence level category based on score.
 */
export function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}
