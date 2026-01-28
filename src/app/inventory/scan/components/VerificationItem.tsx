"use client";

/**
 * VerificationItem Component
 *
 * Single item row in verification list. Displays confidence,
 * allows editing product, quantity, unit, and deletion.
 */

import { useCallback, useId } from "react";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ProductAutocomplete } from "@/app/inventory/components/ProductAutocomplete";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { SCAN_STRINGS, type VerificationItemViewModel } from "../types";
import type { UnitDTO, ProductDTO, UnitBriefDTO } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface VerificationItemProps {
  /** The verification item data */
  item: VerificationItemViewModel;
  /** Index in the list */
  index: number;
  /** Available units for selection */
  units: UnitDTO[];
  /** Callback when item is updated */
  onUpdate: (item: VerificationItemViewModel) => void;
  /** Callback when item is deleted */
  onDelete: () => void;
  /** Whether the item is disabled */
  disabled: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function VerificationItem({ item, index, units, onUpdate, onDelete, disabled }: VerificationItemProps) {
  const productErrorId = useId();
  const quantityErrorId = useId();
  const unitErrorId = useId();

  // Handle product selection from autocomplete
  const handleProductSelect = useCallback(
    (product: ProductDTO) => {
      onUpdate({
        ...item,
        matchedProduct: { id: product.id, name_pl: product.name_pl },
        customName: "",
        errors: { ...item.errors, product: undefined },
      });
    },
    [item, onUpdate]
  );

  // Handle custom name input
  const handleCustomNameChange = useCallback(
    (name: string) => {
      onUpdate({
        ...item,
        matchedProduct: null,
        customName: name,
        errors: { ...item.errors, product: undefined },
      });
    },
    [item, onUpdate]
  );

  // Handle default unit selection from product
  const handleDefaultUnitSelect = useCallback(
    (unit: UnitBriefDTO) => {
      onUpdate({
        ...item,
        unit,
        errors: { ...item.errors, unit: undefined },
      });
    },
    [item, onUpdate]
  );

  // Handle quantity change
  const handleQuantityChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({
        ...item,
        quantity: event.target.value,
        errors: { ...item.errors, quantity: undefined },
      });
    },
    [item, onUpdate]
  );

  // Handle unit selection
  const handleUnitChange = useCallback(
    (unitId: string) => {
      const selectedUnit = units.find((u) => u.id === parseInt(unitId, 10));
      if (selectedUnit) {
        onUpdate({
          ...item,
          unit: {
            id: selectedUnit.id,
            name_pl: selectedUnit.name_pl,
            abbreviation: selectedUnit.abbreviation,
          },
          errors: { ...item.errors, unit: undefined },
        });
      }
    },
    [item, units, onUpdate]
  );

  const hasErrors = item.errors.product || item.errors.quantity || item.errors.unit;

  return (
    <div className={cn("rounded-lg border p-4", hasErrors && "border-destructive/50 bg-destructive/5")} role="listitem">
      {/* Header with confidence and delete */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ConfidenceIndicator confidence={item.confidence} />
          <span className="text-muted-foreground text-sm">{item.originalName}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-8 w-8"
          onClick={onDelete}
          disabled={disabled}
          aria-label={`${SCAN_STRINGS.actions.delete} ${item.originalName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Product autocomplete */}
      <div className="mb-3 space-y-1">
        <Label htmlFor={`product-${index}`} className="text-sm font-medium">
          {SCAN_STRINGS.form.product}
        </Label>
        <ProductAutocomplete
          id={`product-${index}`}
          selectedProductId={item.matchedProduct?.id ?? null}
          customName={item.customName}
          onProductSelect={handleProductSelect}
          onCustomNameChange={handleCustomNameChange}
          onDefaultUnitSelect={handleDefaultUnitSelect}
          disabled={disabled}
          hasError={!!item.errors.product}
          aria-describedby={item.errors.product ? productErrorId : undefined}
        />
        {item.errors.product && (
          <p id={productErrorId} className="text-destructive text-sm" role="alert">
            {item.errors.product}
          </p>
        )}
      </div>

      {/* Quantity and unit row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Quantity */}
        <div className="space-y-1">
          <Label htmlFor={`quantity-${index}`} className="text-sm font-medium">
            {SCAN_STRINGS.form.quantity}
          </Label>
          <Input
            id={`quantity-${index}`}
            type="text"
            inputMode="decimal"
            placeholder={SCAN_STRINGS.form.quantityPlaceholder}
            value={item.quantity}
            onChange={handleQuantityChange}
            disabled={disabled}
            aria-invalid={!!item.errors.quantity}
            aria-describedby={item.errors.quantity ? quantityErrorId : undefined}
            className={cn(item.errors.quantity && "border-destructive")}
          />
          {item.errors.quantity && (
            <p id={quantityErrorId} className="text-destructive text-sm" role="alert">
              {item.errors.quantity}
            </p>
          )}
        </div>

        {/* Unit */}
        <div className="space-y-1">
          <Label htmlFor={`unit-${index}`} className="text-sm font-medium">
            {SCAN_STRINGS.form.unit}
          </Label>
          <Select value={item.unit?.id?.toString() ?? ""} onValueChange={handleUnitChange} disabled={disabled}>
            <SelectTrigger
              id={`unit-${index}`}
              aria-invalid={!!item.errors.unit}
              aria-describedby={item.errors.unit ? unitErrorId : undefined}
              className={cn(item.errors.unit && "border-destructive")}
            >
              <SelectValue placeholder={SCAN_STRINGS.form.unitPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id.toString()}>
                  {unit.name_pl} ({unit.abbreviation})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {item.errors.unit && (
            <p id={unitErrorId} className="text-destructive text-sm" role="alert">
              {item.errors.unit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
