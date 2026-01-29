import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase/server";
import { Button } from "@/components/ui/button";

/**
 * Landing Page - Entry point for the application.
 *
 * User Journey:
 * - Unauthenticated users: See landing page with login/register CTAs
 * - Authenticated users (onboarding incomplete): Redirect to /onboarding
 * - Authenticated users (onboarding complete): Redirect to /inventory
 */
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If authenticated, redirect based on onboarding status
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("onboarding_status").eq("id", user.id).single();

    if (profile?.onboarding_status === "completed") {
      redirect("/inventory");
    } else {
      redirect("/onboarding");
    }
  }

  // Unauthenticated users see the landing page
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header className="container mx-auto flex h-16 items-center justify-between px-4">
        <span className="text-primary text-2xl font-bold tracking-tight">Mealer</span>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Zaloguj się</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Zarejestruj się</Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-foreground max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Przepisy dopasowane do <span className="text-primary">Twojej spiżarni</span>
        </h1>
        <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
          Mealer wykorzystuje AI, aby dostosować przepisy do Twoich preferencji żywieniowych i produktów, które masz w
          domu. Koniec z marnowaniem jedzenia!
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">Rozpocznij za darmo</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Mam już konto</Link>
          </Button>
        </div>

        {/* Features */}
        <div className="mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
              <ScanIcon className="text-primary h-6 w-6" />
            </div>
            <h3 className="font-semibold">Skanuj paragony</h3>
            <p className="text-muted-foreground text-sm">
              Zrób zdjęcie paragonu, a AI doda produkty do Twojej spiżarni
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
              <RecipeIcon className="text-primary h-6 w-6" />
            </div>
            <h3 className="font-semibold">Dostosowane przepisy</h3>
            <p className="text-muted-foreground text-sm">
              Wklej link do przepisu, a AI zaproponuje zamienniki składników
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
              <CheckIcon className="text-primary h-6 w-6" />
            </div>
            <h3 className="font-semibold">Śledź zużycie</h3>
            <p className="text-muted-foreground text-sm">
              Po ugotowaniu, Mealer automatycznie zaktualizuje Twoją spiżarnię
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Mealer. Wszelkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect width="10" height="8" x="7" y="8" rx="1" />
    </svg>
  );
}

function RecipeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6" />
      <path d="M8 11h8" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
