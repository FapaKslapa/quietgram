"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";

export function PairingToken() {
  const trpc = useTRPC();
  const issue = useMutation(trpc.pairing.issueToken.mutationOptions());

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Collega Instagram</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={() => issue.mutate()} disabled={issue.isPending}>
            Genera token
          </Button>
          {issue.data ? (
            <>
              <code className="break-all">{issue.data.token}</code>
              <p>Incollalo nell'estensione entro 10 minuti. Vale una sola volta.</p>
            </>
          ) : null}
          {issue.error ? <p role="alert">Impossibile generare il token</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
