import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Ustaw nowe hasło",
  description: "Ustaw nowe hasło do swojego konta Mealer",
};

/**
 * Update password page - displays form to set new password after reset link clicked.
 */
export default function UpdatePasswordPage() {
  return (
    <main>
      <AuthCard title="Ustaw nowe hasło" description="Wprowadź i potwierdź swoje nowe hasło">
        <UpdatePasswordForm />
      </AuthCard>
    </main>
  );
}
