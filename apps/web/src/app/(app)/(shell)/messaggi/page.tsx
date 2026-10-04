import type { Metadata } from "next";
import { ScreenHeader } from "@/components/shell/screen-header";

export const metadata: Metadata = { title: "Messaggi" };

export default function MessaggiPage() {
  return <ScreenHeader title="Messaggi" />;
}
