import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Conversation } from "@/components/messaggi/conversation";

export const metadata: Metadata = { title: "Conversazione" };

const THREAD_ID = /^[\w-]{1,64}$/;

export default async function ConversationPage({ params }: PageProps<"/messaggi/[threadId]">) {
  const { threadId } = await params;
  if (!THREAD_ID.test(threadId)) notFound();
  return <Conversation threadId={threadId} />;
}
