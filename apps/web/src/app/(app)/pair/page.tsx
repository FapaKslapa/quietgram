import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PairingToken } from "@/components/pairing-token";
import { createServices } from "@/lib/auth/server";

export default async function PairPage() {
  await connection();
  const { env } = await getCloudflareContext({ async: true });
  const session = await createServices(env).auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <PairingToken />;
}
