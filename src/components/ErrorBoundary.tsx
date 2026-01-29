"use client";

import * as React from "react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback UI to render on error (overrides default) */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom title for the error message */
  title?: string;
  /** Custom description for the error message */
  description?: string;
  /** Whether to show a retry button (default: true) */
  showRetry?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for catching and handling React errors.
 * Use this to wrap specific feature areas that may fail independently.
 *
 * @example
 * <ErrorBoundary
 *   fallback={<div>Something went wrong with this feature</div>}
 *   onError={(error) => logError(error)}
 * >
 *   <FeatureComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const {
      children,
      fallback,
      title = "Coś poszło nie tak",
      description = "Wystąpił błąd podczas ładowania tej sekcji.",
      showRetry = true,
    } = this.props;

    if (!hasError) {
      return children;
    }

    // Return custom fallback if provided
    if (fallback) {
      return fallback;
    }

    const isDevelopment = process.env.NODE_ENV === "development";

    // Default error UI
    return (
      <Card className="mx-auto my-4 max-w-md text-center" role="alert" aria-live="assertive">
        <CardHeader className="pb-3">
          <div
            className="bg-destructive/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <AlertTriangle className="text-destructive h-6 w-6" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        {isDevelopment && error?.message && (
          <CardContent className="pt-0">
            <div className="bg-muted rounded-lg p-2 text-left">
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Błąd (dev)</p>
              <p className="text-destructive font-mono text-xs break-words">{error.message}</p>
            </div>
          </CardContent>
        )}

        {showRetry && (
          <CardFooter className="justify-center pt-0">
            <Button onClick={this.handleRetry} variant="outline" size="sm" aria-label="Spróbuj ponownie">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Spróbuj ponownie
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }
}
