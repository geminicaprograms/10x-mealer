"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error Boundary for Recipe Detail Page
 *
 * Catches runtime errors and provides recovery options.
 */
export default function RecipeDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Recipe Detail Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
      <AlertCircle className="text-destructive mb-4 h-12 w-12" aria-hidden="true" />
      <h2 className="mb-2 text-lg font-semibold">Coś poszło nie tak</h2>
      <p className="text-muted-foreground mb-4 max-w-md text-center">
        Nie udało się załadować przepisu. Spróbuj odświeżyć stronę.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Spróbuj ponownie
        </Button>
        <Button onClick={() => window.history.back()} variant="outline">
          Wróć
        </Button>
      </div>
    </div>
  );
}
