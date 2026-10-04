import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { createServices } from "@/lib/auth/server";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function ShellLayout({ children }: { children: ReactNode }) {
  await connection();
  const { env } = await getCloudflareContext({ async: true });
  const session = await createServices(env).auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  prefetch(trpc.refresh.overview.queryOptions());
  prefetch(trpc.messages.threads.queryOptions());

  return (
    <HydrateClient>
      <Suspense fallback={<div className="min-h-dvh" />}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </HydrateClient>
  );
}
