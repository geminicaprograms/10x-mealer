"use client";

/**
 * QuickAddSheet Component
 *
 * Bottom sheet modal for manually adding a single inventory item.
 * Features product input, quantity input, and unit selection.
 */

import { useState, useCallback, useId, useEffect } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ProductAutocomplete } from "./ProductAutocomplete";
import type { UnitDTO, InventoryItemCreateCommand, ProductDTO, UnitBriefDTO } from "@/types";
import { INVENTORY_STRINGS, DEFAULT_QUICK_ADD_FORM_STATE } from "../types";
import type { QuickAddFormState } from "../types";

// =============================================================================
// Types
// =============================================================================

interface QuickAddSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when form is submitted */
  onSubmit: (item: InventoryItemCreateCommand) => Promise<void>;
  /** Available units for selection */
  units: UnitDTO[];
}

// =============================================================================
// Validation
// =============================================================================

function validateForm(form: QuickAddFormState): Record<string, string> {
  const errors: Record<string, string> = {};

  // Require either product from catalog or custom name
  if (!form.productId && !form.customName.trim()) {
    errors.customName = INVENTORY_STRINGS.validation.productRequired;
  }

  // Validate quantity if provided
  if (form.quantity.trim()) {
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = INVENTORY_STRINGS.validation.quantityPositive;
    }
  }

  // Require unit if quantity is provided
  if (form.quantity.trim() && !form.unitId) {
    errors.unitId = INVENTORY_STRINGS.validation.unitRequired;
  }

  return errors;
}

// =============================================================================
// Component
// =============================================================================

export function QuickAddSheet({ isOpen, onOpenChange, onSubmit, units }: QuickAddSheetProps) {
  const formId = useId();
  const [form, setForm] = useState<QuickAddFormState>(DEFAULT_QUICK_ADD_FORM_STATE);

  // Reset form when sheet opens
  useEffect(() => {
    if (isOpen) {
      setForm(DEFAULT_QUICK_ADD_FORM_STATE);
    }
  }, [isOpen]);

  // Handle product selection from catalog
  const handleProductSelect = useCallback((product: ProductDTO) => {
    setForm((prev) => ({
      ...prev,
      productId: product.id,
      customName: product.name_pl, // Show name in display
      errors: { ...prev.errors, customName: "" },
    }));
  }, []);

  // Handle custom name input (when not selecting from catalog)
  const handleCustomNameChange = useCallback((name: string) => {
    setForm((prev) => ({
      ...prev,
      productId: null, // Clear product selection when typing custom name
      customName: name,
      errors: { ...prev.errors, customName: "" },
    }));
  }, []);

  // Handle default unit selection from product
  const handleDefaultUnitSelect = useCallback((unit: UnitBriefDTO) => {
    // Only auto-select if no unit is already selected
    setForm((prev) => {
      if (prev.unitId !== null) return prev;
      return {
        ...prev,
        unitId: unit.id,
        errors: { ...prev.errors, unitId: "" },
      };
    });
  }, []);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimal point
    const value = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setForm((prev) => ({
      ...prev,
      quantity: value,
      errors: { ...prev.errors, quantity: "" },
    }));
  }, []);

  const handleUnitChange = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      unitId: value ? parseInt(value, 10) : null,
      errors: { ...prev.errors, unitId: "" },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate
      const errors = validateForm(form);
      if (Object.keys(errors).length > 0) {
        setForm((prev) => ({ ...prev, errors }));
        return;
      }

      // Build command - use product_id if selected from catalog, otherwise custom_name
      const command: InventoryItemCreateCommand = {
        product_id: form.productId ?? undefined,
        custom_name: form.productId ? undefined : form.customName.trim(),
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        unit_id: form.unitId,
        is_staple: false,
      };

      setForm((prev) => ({ ...prev, isSubmitting: true }));

      try {
        await onSubmit(command);
        onOpenChange(false);
      } catch {
        // Error is handled by parent
      } finally {
        setForm((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [form, onSubmit, onOpenChange]
  );

  const handleClose = useCallback(() => {
    if (!form.isSubmitting) {
      onOpenChange(false);
    }
  }, [form.isSubmitting, onOpenChange]);

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh]">
        <SheetHeader>
          <SheetTitle>{INVENTORY_STRINGS.dialogs.quickAddTitle}</SheetTitle>
          <SheetDescription>Dodaj nowy produkt do swojej spiżarni.</SheetDescription>
        </SheetHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`}>{INVENTORY_STRINGS.form.product} *</Label>
            <ProductAutocomplete
              id={`${formId}-name`}
              selectedProductId={form.productId}
              customName={form.customName}
              onProductSelect={handleProductSelect}
              onCustomNameChange={handleCustomNameChange}
              onDefaultUnitSelect={handleDefaultUnitSelect}
              disabled={form.isSubmitting}
              placeholder={INVENTORY_STRINGS.form.productPlaceholder}
              hasError={!!form.errors.customName}
              aria-describedby={form.errors.customName ? `${formId}-name-error` : undefined}
            />
            {form.errors.customName && (
              <p id={`${formId}-name-error`} className="text-destructive text-sm" role="alert">
                {form.errors.customName}
              </p>
            )}
          </div>

          {/* Quantity and Unit Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor={`${formId}-quantity`}>{INVENTORY_STRINGS.form.quantity}</Label>
              <Input
                id={`${formId}-quantity`}
                type="text"
                inputMode="decimal"
                value={form.quantity}
                onChange={handleQuantityChange}
                placeholder={INVENTORY_STRINGS.form.quantityPlaceholder}
                disabled={form.isSubmitting}
                aria-invalid={form.errors.quantity ? "true" : "false"}
                aria-describedby={form.errors.quantity ? `${formId}-quantity-error` : undefined}
              />
              {form.errors.quantity && (
                <p id={`${formId}-quantity-error`} className="text-destructive text-sm" role="alert">
                  {form.errors.quantity}
                </p>
              )}
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label htmlFor={`${formId}-unit`}>{INVENTORY_STRINGS.form.unit}</Label>
              <Select
                value={form.unitId ? String(form.unitId) : ""}
                onValueChange={handleUnitChange}
                disabled={form.isSubmitting}
              >
                <SelectTrigger
                  id={`${formId}-unit`}
                  aria-invalid={form.errors.unitId ? "true" : "false"}
                  aria-describedby={form.errors.unitId ? `${formId}-unit-error` : undefined}
                >
                  <SelectValue placeholder={INVENTORY_STRINGS.form.unitPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={String(unit.id)}>
                      {unit.name_pl} ({unit.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.errors.unitId && (
                <p id={`${formId}-unit-error`} className="text-destructive text-sm" role="alert">
                  {form.errors.unitId}
                </p>
              )}
            </div>
          </div>
        </form>

        <SheetFooter className="flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={form.isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {INVENTORY_STRINGS.actions.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={form.isSubmitting} className="flex-1 sm:flex-none">
            {form.isSubmitting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Dodawanie...
              </>
            ) : (
              INVENTORY_STRINGS.actions.add
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
