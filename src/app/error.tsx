"use client";

import * as React from "react";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root error boundary page for the application.
 * Catches unhandled errors in the React component tree and displays a user-friendly fallback UI.
 * Provides a retry mechanism to attempt recovery.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error("Application error:", error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <main className="flex min-h-screen items-center justify-center p-4" role="alert" aria-live="assertive">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div
            className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <AlertTriangle className="text-destructive h-8 w-8" />
          </div>
          <CardTitle className="text-xl">Coś poszło nie tak</CardTitle>
          <CardDescription>Wystąpił nieoczekiwany błąd aplikacji. Przepraszamy za niedogodności.</CardDescription>
        </CardHeader>

        <CardContent>
          {isDevelopment && error.message && (
            <div className="bg-muted rounded-lg p-3 text-left">
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Szczegóły błędu (dev)</p>
              <p className="text-destructive font-mono text-sm break-words">{error.message}</p>
              {error.digest && <p className="text-muted-foreground mt-1 text-xs">Digest: {error.digest}</p>}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full" aria-label="Spróbuj ponownie załadować stronę">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Spróbuj ponownie
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            className="w-full"
            aria-label="Wróć do strony głównej"
          >
            Wróć do strony głównej
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
