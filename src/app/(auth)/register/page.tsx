import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Utwórz nowe konto w aplikacji Mealer",
};

/**
 * Registration page - displays registration form with email and password fields.
 */
export default function RegisterPage() {
  return (
    <main>
      <AuthCard title="Utwórz konto" description="Wprowadź swoje dane, aby utworzyć konto">
        <RegisterForm />
      </AuthCard>
    </main>
  );
}
