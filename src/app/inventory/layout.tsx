import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inwentarz | Mealer",
  description: "Zarządzaj swoją spiżarnią i podstawowymi produktami",
};

interface InventoryLayoutProps {
  children: React.ReactNode;
}

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  return <>{children}</>;
}
