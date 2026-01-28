"use client";

/**
 * Receipt Scan Page
 *
 * Main page component for the receipt scan flow.
 * Orchestrates the two-phase process:
 * 1. Image Selection: User selects receipt image and initiates processing
 * 2. Verification: User reviews and edits extracted items before adding to inventory
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AIUsageIndicator,
  ImageUploadSection,
  ProcessButton,
  LoadingOverlay,
  VerificationList,
  AddMissingItemButton,
  ActionButtons,
  RateLimitDialog,
  PartialSuccessAlert,
} from "./components";
import { useReceiptScan } from "./hooks";
import { SCAN_STRINGS } from "./types";

// =============================================================================
// Component
// =============================================================================

export default function ReceiptScanPage() {
  const router = useRouter();

  const {
    // State
    phase,
    image,
    imageError,
    items,
    usage,
    showRateLimitDialog,
    partialSuccessResult,
    units,

    // Computed
    isProcessing,
    isSubmitting,
    canProcess,
    canSubmit,

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
  } = useReceiptScan();

  // Navigate back to inventory
  const handleBack = useCallback(() => {
    router.push("/inventory");
  }, [router]);

  // Handle cancel during verification
  const handleCancel = useCallback(() => {
    reset();
  }, [reset]);

  // Handle confirm submission
  const handleConfirm = useCallback(async () => {
    await submitItems();
  }, [submitItems]);

  // Determine if in upload/processing phase or verification phase
  const isUploadPhase = phase === "upload" || phase === "processing";
  const isVerificationPhase = phase === "verification" || phase === "submitting";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-950">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label={SCAN_STRINGS.back}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{SCAN_STRINGS.pageTitle}</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="container flex-1 px-4 py-6" role="main">
        {/* AI Usage Indicator */}
        <div className="mb-6">
          <AIUsageIndicator usage={usage} />
        </div>

        {/* Partial Success Alert (if present) */}
        {partialSuccessResult && (
          <div className="mb-6">
            <PartialSuccessAlert result={partialSuccessResult} onDismiss={dismissPartialSuccess} />
          </div>
        )}

        {/* Upload Phase */}
        {isUploadPhase && (
          <div className="space-y-6">
            <ImageUploadSection
              image={image}
              onImageSelect={selectImage}
              onImageClear={clearImage}
              error={imageError}
              disabled={isProcessing}
            />

            <ProcessButton onProcess={processReceipt} disabled={!canProcess} isProcessing={isProcessing} />
          </div>
        )}

        {/* Verification Phase */}
        {isVerificationPhase && (
          <div className="space-y-6">
            <VerificationList
              items={items}
              units={units}
              onItemUpdate={updateItem}
              onItemDelete={deleteItem}
              disabled={isSubmitting}
            />

            <AddMissingItemButton onAdd={addManualItem} disabled={isSubmitting} />

            <ActionButtons
              onCancel={handleCancel}
              onConfirm={handleConfirm}
              isSubmitting={isSubmitting}
              hasValidItems={canSubmit}
            />
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {isProcessing && <LoadingOverlay />}

      {/* Rate Limit Dialog */}
      <RateLimitDialog isOpen={showRateLimitDialog} onClose={closeRateLimitDialog} limit={usage?.scansLimit ?? 5} />
    </div>
  );
}
