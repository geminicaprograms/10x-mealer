"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  /** Card title displayed in the header */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Card content (typically a form) */
  children: React.ReactNode;
  /** Additional className for the card */
  className?: string;
}

/**
 * Wrapper card component for auth forms.
 * Provides consistent styling for login, register, and password reset pages.
 */
export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
