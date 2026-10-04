import type { Metadata } from "next";
import { MessaggiScreen } from "@/components/messaggi/messaggi-screen";

export const metadata: Metadata = { title: "Messaggi" };

export default function MessaggiPage() {
  return <MessaggiScreen />;
}
