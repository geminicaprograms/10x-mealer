"use client";

/**
 * EditItemDialog Component
 *
 * Modal dialog for editing an inventory item's quantity and unit.
 * Cannot change product or staple status.
 */

import { useState, useCallback, useId, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { InventoryItemDTO, UnitDTO, InventoryItemUpdateCommand } from "@/types";
import { INVENTORY_STRINGS, DEFAULT_EDIT_FORM_STATE } from "../types";
import type { EditItemFormState } from "../types";

// =============================================================================
// Types
// =============================================================================

interface EditItemDialogProps {
  /** The item being edited, null if dialog is closed */
  item: InventoryItemDTO | null;
  /** Available units for selection */
  units: UnitDTO[];
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when form is saved */
  onSave: (id: string, data: InventoryItemUpdateCommand) => Promise<void>;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getItemDisplayName(item: InventoryItemDTO): string {
  if (item.product?.name_pl) {
    return item.product.name_pl;
  }
  return item.custom_name ?? "Nieznany produkt";
}

function validateForm(form: EditItemFormState, isStaple: boolean): Record<string, string> {
  const errors: Record<string, string> = {};

  // Staples don't need quantity validation
  if (isStaple) {
    return errors;
  }

  // Validate quantity
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

export function EditItemDialog({ item, units, isOpen, onOpenChange, onSave }: EditItemDialogProps) {
  const formId = useId();
  const [form, setForm] = useState<EditItemFormState>(DEFAULT_EDIT_FORM_STATE);

  // Reset form when item changes
  useEffect(() => {
    if (item && isOpen) {
      setForm({
        quantity: item.quantity !== null ? String(item.quantity) : "",
        unitId: item.unit?.id ?? null,
        isSubmitting: false,
        errors: {},
      });
    }
  }, [item, isOpen]);

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

      if (!item) return;

      // Validate
      const errors = validateForm(form, item.is_staple);
      if (Object.keys(errors).length > 0) {
        setForm((prev) => ({ ...prev, errors }));
        return;
      }

      // Build update command
      const command: InventoryItemUpdateCommand = {};

      if (!item.is_staple) {
        command.quantity = form.quantity ? parseFloat(form.quantity) : null;
        command.unit_id = form.unitId;
      }

      setForm((prev) => ({ ...prev, isSubmitting: true }));

      try {
        await onSave(item.id, command);
        onOpenChange(false);
      } catch {
        // Error is handled by parent
      } finally {
        setForm((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [item, form, onSave, onOpenChange]
  );

  const handleClose = useCallback(() => {
    if (!form.isSubmitting) {
      onOpenChange(false);
    }
  }, [form.isSubmitting, onOpenChange]);

  if (!item) return null;

  const displayName = getItemDisplayName(item);
  const isStaple = item.is_staple;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{INVENTORY_STRINGS.dialogs.editTitle}</DialogTitle>
          <DialogDescription>{displayName}</DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-4 py-4">
          {isStaple ? (
            <p className="text-muted-foreground text-sm">
              Podstawowe produkty nie mają ilości ani jednostki. Możesz je tylko oznaczyć jako dostępne lub niedostępne
              w zakładce &quot;Podstawowe&quot;.
            </p>
          ) : (
            <>
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
                  autoFocus
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
            </>
          )}
        </form>

        <DialogFooter className="flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={form.isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {INVENTORY_STRINGS.actions.cancel}
          </Button>
          {!isStaple && (
            <Button type="submit" form={formId} disabled={form.isSubmitting} className="flex-1 sm:flex-none">
              {form.isSubmitting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Zapisywanie...
                </>
              ) : (
                INVENTORY_STRINGS.actions.save
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
