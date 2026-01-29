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

import { Header } from "@/components/Header";
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
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header with back navigation to inventory */}
      <Header title={SCAN_STRINGS.pageTitle} showBack backHref="/inventory" showSettings={false} />

      {/* Main content */}
      <main className="container mx-auto flex-1 px-4 py-6" role="main">
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
