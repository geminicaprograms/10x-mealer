"use client";

/**
 * ImageUploadSection Component
 *
 * Container for image selection and preview.
 * Handles file input and displays selected image preview.
 */

import { useCallback, useRef, useId } from "react";
import { ImageIcon, X } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SCAN_STRINGS,
  SUPPORTED_IMAGE_TYPES,
  isValidImageType,
  isValidImageSize,
  formatFileSizeMB,
  type ImageFile,
} from "../types";

// =============================================================================
// Types
// =============================================================================

interface ImageUploadSectionProps {
  /** Currently selected image */
  image: ImageFile | null;
  /** Callback when image is selected */
  onImageSelect: (file: File) => void;
  /** Callback when image is cleared */
  onImageClear: () => void;
  /** Validation error message */
  error: string | null;
  /** Whether the input is disabled */
  disabled: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ImageUploadSection({ image, onImageSelect, onImageClear, error, disabled }: ImageUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!isValidImageType(file)) {
        // The parent hook should set the error
        // We still call onImageSelect to trigger validation in the hook
      }

      // Validate file size
      if (!isValidImageSize(file)) {
        // Same as above
      }

      onImageSelect(file);

      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onImageSelect]
  );

  const handleSelectClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const acceptedTypes = SUPPORTED_IMAGE_TYPES.join(",");

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <Input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileChange}
        disabled={disabled}
        className="sr-only"
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
      />

      {/* Image preview or upload placeholder */}
      {image ? (
        <div className="relative">
          {/* Image preview */}
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-gray-100 dark:bg-gray-800">
            <Image
              src={image.previewUrl}
              alt="Podgląd paragonu"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>

          {/* Clear button */}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onImageClear}
            disabled={disabled}
            aria-label="Usuń zdjęcie"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* File info */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {SCAN_STRINGS.upload.imageSize(formatFileSizeMB(image.size))}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleSelectClick} disabled={disabled}>
              {SCAN_STRINGS.upload.changeImage}
            </Button>
          </div>
        </div>
      ) : (
        /* Upload placeholder */
        <button
          type="button"
          onClick={handleSelectClick}
          disabled={disabled}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors",
            "hover:border-primary hover:bg-accent/50",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            disabled && "cursor-not-allowed opacity-50",
            error && "border-destructive"
          )}
        >
          <div className="bg-primary/10 rounded-full p-4">
            <ImageIcon className="text-primary h-8 w-8" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="font-medium">{SCAN_STRINGS.upload.selectImage}</p>
            <p className="text-muted-foreground mt-1 text-sm">{SCAN_STRINGS.upload.supportedFormats}</p>
          </div>
        </button>
      )}

      {/* Error message */}
      {error && (
        <p id={errorId} className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
