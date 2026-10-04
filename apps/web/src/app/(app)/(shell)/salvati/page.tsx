import type { Metadata } from "next";
import { ScreenHeader } from "@/components/shell/screen-header";

export const metadata: Metadata = { title: "Salvati" };

export default function SalvatiPage() {
  return <ScreenHeader title="Salvati" />;
}
