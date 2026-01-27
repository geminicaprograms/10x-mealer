"use client";

import * as React from "react";

interface OnboardingStepStaplesProps {
  /** Whether the wizard is submitting */
  isLoading: boolean;
}

/**
 * Step 4 - Staples initialization confirmation.
 * Explains what staples are and what will be initialized.
 */
export function OnboardingStepStaples({ isLoading }: OnboardingStepStaplesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Podstawowe produkty</h2>
        <p className="text-muted-foreground mt-1">Na koniec zainicjalizujemy podstawowe produkty w Twojej spiżarni.</p>
      </div>

      <div className="bg-muted/50 rounded-lg border p-4">
        <h3 className="mb-3 font-medium">Co zostanie dodane do Twojej spiżarni?</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Dodamy podstawowe produkty, które zazwyczaj znajdują się w każdej kuchni. Dzięki temu nie będziesz
          musiał/musiała dodawać ich ręcznie:
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex items-center gap-2">
            <span className="text-primary" aria-hidden="true">
              •
            </span>
            <span>Sól</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary" aria-hidden="true">
              •
            </span>
            <span>Pieprz</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary" aria-hidden="true">
              •
            </span>
            <span>Olej roślinny</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary" aria-hidden="true">
              •
            </span>
            <span>Cukier</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary" aria-hidden="true">
              •
            </span>
            <span>Mąka</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary" aria-hidden="true">
              •
            </span>
            <span>I inne...</span>
          </li>
        </ul>
      </div>

      {isLoading && (
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Konfigurowanie Twojego konta...</span>
        </div>
      )}

      <p className="text-muted-foreground text-sm">
        Kliknij &quot;Rozpocznij&quot; aby zakończyć konfigurację i przejść do aplikacji.
      </p>
    </div>
  );
}
