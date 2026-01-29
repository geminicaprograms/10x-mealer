import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Przepisy | Mealer",
  description: "Importuj i analizuj przepisy kulinarne",
};

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
