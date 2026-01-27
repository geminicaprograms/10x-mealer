import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase/server";
import { OnboardingWizard } from "./components/OnboardingWizard";

export const metadata = {
  title: "Konfiguracja konta | Mealer",
  description: "Skonfiguruj swoje preferencje żywieniowe, alergie i sprzęt kuchenny.",
};

/**
 * Onboarding page - Server Component.
 * Handles authentication check and onboarding status redirect.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Check profile onboarding status
  const { data: profile } = await supabase.from("profiles").select("onboarding_status").eq("id", user.id).single();

  // If onboarding is already completed, redirect to inventory
  if (profile?.onboarding_status === "completed") {
    redirect("/inventory");
  }

  return (
    <main className="bg-background min-h-screen">
      <OnboardingWizard />
    </main>
  );
}
