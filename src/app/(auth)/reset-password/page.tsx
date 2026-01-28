import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Resetowanie hasła",
  description: "Zresetuj hasło do swojego konta Mealer",
};

/**
 * Password reset request page - displays form to request password reset link.
 */
export default function ResetPasswordPage() {
  return (
    <main>
      <AuthCard title="Zresetuj hasło" description="Wprowadź swój email, a wyślemy Ci link do zresetowania hasła">
        <ResetPasswordForm />
      </AuthCard>
    </main>
  );
}
