import type { Metadata } from "next";
import { ProfiloScreen } from "@/components/profilo/profilo-screen";

export const metadata: Metadata = { title: "Profilo" };

export default function ProfiloPage() {
  return <ProfiloScreen />;
}
