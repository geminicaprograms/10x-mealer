"use client";

/**
 * PreferencesEditSheet Component
 *
 * Bottom sheet modal for editing user preferences. Contains checkbox groups
 * for allergies, diets, and equipment with exclusive "none" options.
 */

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { CheckboxGroupField } from "@/app/onboarding/components/CheckboxGroupField";
import type { ProfileDTO, ProfileUpdateCommand, SystemConfigDTO } from "@/types";
import type { PreferencesFormData } from "../types";
import { SETTINGS_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface PreferencesEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileDTO;
  config: SystemConfigDTO;
  onSave: (data: ProfileUpdateCommand) => Promise<void>;
  isSaving: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Initialize form data from profile
 */
function initializeFormData(profile: ProfileDTO): PreferencesFormData {
  return {
    allergies: [...profile.allergies],
    diets: [...profile.diets],
    equipment: [...profile.equipment],
    hasNoAllergies: profile.allergies.length === 0,
    hasNoDiets: profile.diets.length === 0,
  };
}

// =============================================================================
// Sub-components
// =============================================================================

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="flex w-full justify-between p-0 hover:bg-transparent">
          <span className="text-base font-medium">{title}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PreferencesEditSheet({
  isOpen,
  onClose,
  profile,
  config,
  onSave,
  isSaving,
}: PreferencesEditSheetProps) {
  // Form state
  const [formData, setFormData] = useState<PreferencesFormData>(() => initializeFormData(profile));

  // Reset form when sheet opens with new profile data
  useEffect(() => {
    if (isOpen) {
      setFormData(initializeFormData(profile));
    }
  }, [isOpen, profile]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAllergiesChange = useCallback((value: string[]) => {
    setFormData((prev) => ({
      ...prev,
      allergies: value,
      hasNoAllergies: false,
    }));
  }, []);

  const handleNoAllergiesChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allergies: checked ? [] : prev.allergies,
      hasNoAllergies: checked,
    }));
  }, []);

  const handleDietsChange = useCallback((value: string[]) => {
    setFormData((prev) => ({
      ...prev,
      diets: value,
      hasNoDiets: false,
    }));
  }, []);

  const handleNoDietsChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      diets: checked ? [] : prev.diets,
      hasNoDiets: checked,
    }));
  }, []);

  const handleEquipmentChange = useCallback((value: string[]) => {
    setFormData((prev) => ({
      ...prev,
      equipment: value,
    }));
  }, []);

  const handleCancel = useCallback(() => {
    if (!isSaving) {
      onClose();
    }
  }, [isSaving, onClose]);

  const handleSave = useCallback(async () => {
    const updateData: ProfileUpdateCommand = {
      allergies: formData.allergies,
      diets: formData.diets,
      equipment: formData.equipment,
    };

    await onSave(updateData);
  }, [formData, onSave]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isSaving) {
        onClose();
      }
    },
    [isSaving, onClose]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader className="text-left">
          <SheetTitle>{SETTINGS_STRINGS.preferencesEdit.title}</SheetTitle>
          <SheetDescription className="sr-only">
            Zmień swoje preferencje dotyczące alergii, diet i sprzętu kuchennego
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="my-4 h-[calc(85vh-10rem)]">
          <div className="space-y-6 pr-4">
            {/* Allergies Section */}
            <CollapsibleSection title={SETTINGS_STRINGS.preferences.allergies}>
              <CheckboxGroupField
                label={SETTINGS_STRINGS.preferences.allergies}
                options={config.supported_allergies}
                value={formData.allergies}
                onChange={handleAllergiesChange}
                noneOption={{ label: SETTINGS_STRINGS.preferences.noAllergies, value: "none" }}
                noneSelected={formData.hasNoAllergies}
                onNoneChange={handleNoAllergiesChange}
                disabled={isSaving}
              />
            </CollapsibleSection>

            {/* Diets Section */}
            <CollapsibleSection title={SETTINGS_STRINGS.preferences.diets}>
              <CheckboxGroupField
                label={SETTINGS_STRINGS.preferences.diets}
                options={config.supported_diets}
                value={formData.diets}
                onChange={handleDietsChange}
                noneOption={{ label: SETTINGS_STRINGS.preferences.noDiets, value: "none" }}
                noneSelected={formData.hasNoDiets}
                onNoneChange={handleNoDietsChange}
                disabled={isSaving}
              />
            </CollapsibleSection>

            {/* Equipment Section */}
            <CollapsibleSection title={SETTINGS_STRINGS.preferences.equipment}>
              <CheckboxGroupField
                label={SETTINGS_STRINGS.preferences.equipment}
                options={config.supported_equipment}
                value={formData.equipment}
                onChange={handleEquipmentChange}
                disabled={isSaving}
              />
            </CollapsibleSection>
          </div>
        </ScrollArea>

        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="flex-1 sm:flex-none">
            {SETTINGS_STRINGS.preferencesEdit.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {SETTINGS_STRINGS.preferencesEdit.saving}
              </>
            ) : (
              SETTINGS_STRINGS.preferencesEdit.save
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
