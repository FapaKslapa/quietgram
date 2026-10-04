import { connection } from "next/server";
import { Suspense } from "react";
import { HealthStatus } from "@/components/health-status";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function Home() {
  await connection();
  prefetch(trpc.health.queryOptions());

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center gap-2">
        <h1 className="text-3xl font-semibold">nodistraction</h1>
        <Suspense fallback={<p className="text-muted-foreground">checking</p>}>
          <HealthStatus />
        </Suspense>
      </main>
    </HydrateClient>
  );
}
