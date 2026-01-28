import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    template: "%s | Mealer",
    default: "Mealer",
  },
};

/**
 * Auth layout for authentication pages.
 * Centers content vertically and horizontally with a max width of 400px.
 * Displays only the Mealer logo without navigation.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link
            href="/"
            className="text-primary text-3xl font-bold tracking-tight transition-colors hover:opacity-80"
            aria-label="Mealer - Strona główna"
          >
            Mealer
          </Link>
        </div>

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
