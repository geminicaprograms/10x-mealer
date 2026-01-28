import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się do swojego konta Mealer",
};

/**
 * Login page - displays login form with email and password fields.
 */
export default function LoginPage() {
  return (
    <main>
      <AuthCard title="Zaloguj się" description="Wprowadź dane logowania do swojego konta">
        <LoginForm />
      </AuthCard>
    </main>
  );
}
