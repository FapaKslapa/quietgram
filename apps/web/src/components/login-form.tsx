"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, createBootstrapClient } from "@/lib/auth/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async (action: () => Promise<{ error: { message?: string | undefined } | null }>) => {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Operazione non riuscita");
      return;
    }
    router.push("/pair");
  };

  const signIn = (event: FormEvent) => {
    event.preventDefault();
    return run(() => authClient.signIn.passkey());
  };

  const register = () =>
    run(() =>
      createBootstrapClient(secret).passkey.addPasskey({ context: email, createSession: true }),
    );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Accedi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={signIn} className="flex flex-col gap-4">
            <Button type="submit" disabled={pending}>
              Accedi con passkey
            </Button>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username webauthn"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="secret">Codice di registrazione</Label>
              <Input
                id="secret"
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={pending || email === "" || secret === ""}
              onClick={register}
            >
              Registra passkey
            </Button>
            {error ? <p role="alert">{error}</p> : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
