import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountScreen, AccountSkeleton } from "@/components/account/account-screen";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Profilo" };

const USER_ID = /^\d{1,32}$/;

export default async function AccountPage({ params }: PageProps<"/account/[userId]">) {
  const { userId } = await params;
  if (!USER_ID.test(userId)) notFound();
  prefetch(trpc.profile.get.queryOptions({ userId }));

  return (
    <HydrateClient>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountScreen userId={userId} />
      </Suspense>
    </HydrateClient>
  );
}
