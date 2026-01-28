"use client";

/**
 * useReceiptScan Hook
 *
 * Custom hook encapsulating all state and logic for the receipt scan flow.
 * Manages image selection, AI processing, verification, and submission.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { scanApi, fileToBase64, ScanApiError } from "@/lib/services/scan-api";
import { inventoryApi } from "@/lib/services/inventory-api";
import { unitsApi } from "@/lib/services/inventory-api";
import type { UnitDTO, ReceiptScanItemDTO, InventoryItemCreateCommand, ReceiptImageType } from "@/types";
import {
  type ScanPhase,
  type ImageFile,
  type VerificationItemViewModel,
  type AIUsageState,
  type PartialSuccessResult,
  SCAN_STRINGS,
  isValidImageType,
  isValidImageSize,
  validateVerificationItem,
  isValidItem,
} from "../types";

// =============================================================================
// Types
// =============================================================================

export interface UseReceiptScanReturn {
  // State
  phase: ScanPhase;
  image: ImageFile | null;
  imageError: string | null;
  items: VerificationItemViewModel[];
  usage: AIUsageState | null;
  error: string | null;
  showRateLimitDialog: boolean;
  partialSuccessResult: PartialSuccessResult | null;
  units: UnitDTO[];

  // Computed
  isProcessing: boolean;
  isSubmitting: boolean;
  canProcess: boolean;
  canSubmit: boolean;
  validItemsCount: number;

  // Actions
  selectImage: (file: File) => Promise<void>;
  clearImage: () => void;
  processReceipt: () => Promise<void>;
  updateItem: (index: number, item: VerificationItemViewModel) => void;
  deleteItem: (index: number) => void;
  addManualItem: () => void;
  submitItems: () => Promise<boolean>;
  reset: () => void;
  closeRateLimitDialog: () => void;
  dismissPartialSuccess: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique ID for verification items.
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Transforms API scan items to verification view models.
 * Items are sorted by confidence (lowest first for review priority).
 */
function transformScanItems(items: ReceiptScanItemDTO[]): VerificationItemViewModel[] {
  return items
    .map((item) => ({
      id: generateId(),
      originalName: item.name,
      matchedProduct: item.matched_product,
      customName: item.matched_product ? "" : item.name,
      quantity: item.quantity?.toString() ?? "",
      unit: item.suggested_unit,
      confidence: item.confidence,
      isManuallyAdded: false,
      errors: {},
    }))
    .sort((a, b) => a.confidence - b.confidence);
}

/**
 * Creates an empty manual item.
 */
function createManualItem(): VerificationItemViewModel {
  return {
    id: generateId(),
    originalName: "",
    matchedProduct: null,
    customName: "",
    quantity: "",
    unit: null,
    confidence: 1,
    isManuallyAdded: true,
    errors: {},
  };
}

/**
 * Transforms verification items to inventory create commands.
 */
function transformToCreateCommands(items: VerificationItemViewModel[]): InventoryItemCreateCommand[] {
  return items.filter(isValidItem).map((item) => ({
    product_id: item.matchedProduct?.id ?? null,
    custom_name: item.matchedProduct ? null : item.customName.trim() || null,
    quantity: item.quantity ? parseFloat(item.quantity) : null,
    unit_id: item.unit?.id ?? null,
    is_staple: false,
  }));
}

// =============================================================================
// Hook
// =============================================================================

export function useReceiptScan(): UseReceiptScanReturn {
  const router = useRouter();

  // ==========================================================================
  // State
  // ==========================================================================

  const [phase, setPhase] = useState<ScanPhase>("upload");
  const [image, setImage] = useState<ImageFile | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [items, setItems] = useState<VerificationItemViewModel[]>([]);
  const [usage, setUsage] = useState<AIUsageState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [partialSuccessResult, setPartialSuccessResult] = useState<PartialSuccessResult | null>(null);
  const [units, setUnits] = useState<UnitDTO[]>([]);

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const isProcessing = phase === "processing";
  const isSubmitting = phase === "submitting";

  const canProcess = useMemo(() => {
    return image !== null && !isProcessing && !isSubmitting && (usage === null || usage.scansRemaining > 0);
  }, [image, isProcessing, isSubmitting, usage]);

  const validItemsCount = useMemo(() => {
    return items.filter(isValidItem).length;
  }, [items]);

  const canSubmit = useMemo(() => {
    return validItemsCount > 0 && !isSubmitting;
  }, [validItemsCount, isSubmitting]);

  // ==========================================================================
  // Initial Data Fetching
  // ==========================================================================

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [usageResponse, unitsResponse] = await Promise.all([
          scanApi.getUsage().catch((err) => {
            console.error("Failed to fetch AI usage:", err);
            return null;
          }),
          unitsApi.list().catch((err) => {
            console.error("Failed to fetch units:", err);
            return { data: [] };
          }),
        ]);

        if (usageResponse) {
          setUsage({
            scansUsed: usageResponse.receipt_scans.used,
            scansLimit: usageResponse.receipt_scans.limit,
            scansRemaining: usageResponse.receipt_scans.remaining,
          });
        }

        setUnits(unitsResponse.data);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    }

    fetchInitialData();
  }, []);

  // ==========================================================================
  // Image Handling
  // ==========================================================================

  const selectImage = useCallback(async (file: File) => {
    setImageError(null);

    // Validate file type
    if (!isValidImageType(file)) {
      setImageError(SCAN_STRINGS.validation.invalidFormat);
      return;
    }

    // Validate file size
    if (!isValidImageSize(file)) {
      setImageError(SCAN_STRINGS.validation.imageTooBig);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);

      setImage({
        file,
        base64,
        mimeType: file.type,
        size: file.size,
        previewUrl,
      });
    } catch (err) {
      console.error("Failed to process image:", err);
      setImageError(SCAN_STRINGS.errors.scanFailed);
    }
  }, []);

  const clearImage = useCallback(() => {
    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
    setImage(null);
    setImageError(null);
  }, [image]);

  // ==========================================================================
  // Processing
  // ==========================================================================

  const processReceipt = useCallback(async () => {
    if (!image || !canProcess) return;

    // Check rate limit
    if (usage && usage.scansRemaining === 0) {
      setShowRateLimitDialog(true);
      return;
    }

    setPhase("processing");
    setError(null);

    try {
      const response = await scanApi.scanReceipt({
        image: image.base64,
        imageType: image.mimeType as ReceiptImageType,
      });

      // Update usage from response
      setUsage({
        scansUsed: response.usage.scans_used_today,
        scansLimit: usage?.scansLimit ?? 5,
        scansRemaining: response.usage.scans_remaining,
      });

      // Transform items for verification
      const verificationItems = transformScanItems(response.items);
      setItems(verificationItems);

      // Move to verification phase
      setPhase("verification");

      if (verificationItems.length === 0) {
        toast.info(SCAN_STRINGS.verification.noItemsExtracted);
      }
    } catch (err) {
      console.error("Receipt scan failed:", err);

      if (err instanceof ScanApiError) {
        if (err.isRateLimited()) {
          setShowRateLimitDialog(true);
          setPhase("upload");
          return;
        }

        if (err.isImageError()) {
          setImageError(err.message);
          setPhase("upload");
          return;
        }

        if (err.isExternalServiceError()) {
          toast.error(SCAN_STRINGS.errors.externalService);
          setPhase("upload");
          return;
        }

        // Handle 401 - redirect to login
        if (err.status === 401) {
          router.push("/login");
          return;
        }

        toast.error(err.message);
      } else {
        toast.error(SCAN_STRINGS.errors.scanFailed);
      }

      setPhase("upload");
    }
  }, [image, canProcess, usage, router]);

  // ==========================================================================
  // Verification Item Management
  // ==========================================================================

  const updateItem = useCallback((index: number, updatedItem: VerificationItemViewModel) => {
    setItems((prev) => {
      const newItems = [...prev];
      // Validate the item
      const errors = validateVerificationItem(updatedItem);
      newItems[index] = { ...updatedItem, errors };
      return newItems;
    });
  }, []);

  const deleteItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addManualItem = useCallback(() => {
    setItems((prev) => [...prev, createManualItem()]);
  }, []);

  // ==========================================================================
  // Submission
  // ==========================================================================

  const submitItems = useCallback(async (): Promise<boolean> => {
    if (!canSubmit) return false;

    // Validate all items
    const validatedItems = items.map((item) => ({
      ...item,
      errors: validateVerificationItem(item),
    }));
    setItems(validatedItems);

    // Check if there are valid items
    const validItems = validatedItems.filter(isValidItem);
    if (validItems.length === 0) {
      toast.error(SCAN_STRINGS.validation.noValidItems);
      return false;
    }

    setPhase("submitting");
    setError(null);

    try {
      const commands = transformToCreateCommands(validItems);
      const response = await inventoryApi.create(commands);

      const { summary, errors: apiErrors } = response;

      // Full success
      if (summary.failed === 0) {
        toast.success(SCAN_STRINGS.success.itemsAdded(summary.created));
        router.push("/inventory");
        return true;
      }

      // Partial success
      if (summary.created > 0) {
        setPartialSuccessResult({
          total: summary.total,
          created: summary.created,
          failed: summary.failed,
          errors: apiErrors.map((e) => ({ index: e.index, error: e.error })),
        });
        toast.warning(SCAN_STRINGS.success.partialSuccess(summary.created, summary.total));
        router.push("/inventory");
        return true;
      }

      // All failed
      toast.error(SCAN_STRINGS.errors.submitFailed);
      setPhase("verification");
      return false;
    } catch (err) {
      console.error("Submit failed:", err);

      if (err instanceof Error && "status" in err && (err as { status: number }).status === 401) {
        router.push("/login");
        return false;
      }

      toast.error(SCAN_STRINGS.errors.submitFailed);
      setPhase("verification");
      return false;
    }
  }, [canSubmit, items, router]);

  // ==========================================================================
  // Reset and Dialog Actions
  // ==========================================================================

  const reset = useCallback(() => {
    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
    setPhase("upload");
    setImage(null);
    setImageError(null);
    setItems([]);
    setError(null);
    setPartialSuccessResult(null);
  }, [image]);

  const closeRateLimitDialog = useCallback(() => {
    setShowRateLimitDialog(false);
  }, []);

  const dismissPartialSuccess = useCallback(() => {
    setPartialSuccessResult(null);
  }, []);

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  useEffect(() => {
    return () => {
      // Revoke object URL on unmount
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    };
  }, [image]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    phase,
    image,
    imageError,
    items,
    usage,
    error,
    showRateLimitDialog,
    partialSuccessResult,
    units,

    // Computed
    isProcessing,
    isSubmitting,
    canProcess,
    canSubmit,
    validItemsCount,

    // Actions
    selectImage,
    clearImage,
    processReceipt,
    updateItem,
    deleteItem,
    addManualItem,
    submitItems,
    reset,
    closeRateLimitDialog,
    dismissPartialSuccess,
  };
}
