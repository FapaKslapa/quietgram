"use client";

import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Postmark } from "@/components/brand/postmark";
import { Weave } from "@/components/brand/weave";
import { RegisterDrawer } from "@/components/register-drawer";
import { Button } from "@/components/ui/button";
import { authClient, createBootstrapClient } from "@/lib/auth/client";
import { type AuthFailure, describeAuthError } from "@/lib/auth-errors";
import { formatStampDay, formatStampYear } from "@/lib/time";

type AuthResult = { error: AuthFailure | null };

export function LoginForm() {
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const now = Date.now();

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setLoginError(null);
    const result: AuthResult = await authClient.signIn.passkey();
    setPending(false);
    if (result.error) {
      setLoginError(describeAuthError(result.error, "login"));
      return;
    }
    router.push("/posta");
  };

  const register = async (email: string, secret: string) => {
    setPending(true);
    setRegisterError(null);
    const result: AuthResult = await createBootstrapClient(secret).passkey.addPasskey({
      context: email,
      createSession: true,
    });
    setPending(false);
    if (result.error) {
      setRegisterError(describeAuthError(result.error, "register"));
      return;
    }
    router.push("/pair");
  };

  const changeRegisterOpen = (open: boolean) => {
    setRegisterOpen(open);
    if (!open) setRegisterError(null);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-120 flex-col justify-center pb-10">
      <header className="relative isolate grid justify-items-center gap-3 px-6 pt-14 pb-10 text-center">
        <Weave variant="double" surface="head" active />
        <Postmark
          top={formatStampDay(now)}
          bottom={formatStampYear(now)}
          topSize={11}
          className="size-28"
        />
        <h1 className="text-[2.25rem] leading-none font-bold tracking-[-0.035em]">Posta</h1>
        <p className="max-w-[30ch] text-balance text-soft">
          Instagram, finito e calmo. Solo la posta che vuoi leggere.
        </p>
      </header>
      <section className="mx-3 grid gap-4 rounded-[28px] bg-sheet p-5 shadow-(--shadow-letter)">
        <form onSubmit={(event) => void signIn(event)} className="grid gap-3">
          <Button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="h-[52px] w-full rounded-full text-base font-semibold shadow-(--shadow-lift)"
          >
            <Fingerprint className="size-5" strokeWidth={1.6} aria-hidden="true" />
            Accedi con passkey
          </Button>
          <p className="text-center text-sm text-balance text-soft">
            Usa il Face ID, l&apos;impronta o la chiave di questo dispositivo.
          </p>
        </form>
        {loginError ? (
          <p role="alert" className="text-center text-sm text-balance text-destructive">
            {loginError}
          </p>
        ) : null}
        <div className="h-px bg-line" aria-hidden="true" />
        <Button
          type="button"
          variant="outline"
          onClick={() => changeRegisterOpen(true)}
          className="h-11 w-full rounded-full bg-sheet text-[0.9375rem] font-semibold"
        >
          Primo accesso
        </Button>
      </section>
      <RegisterDrawer
        open={registerOpen}
        onOpenChange={changeRegisterOpen}
        pending={pending}
        error={registerError}
        onSubmit={register}
      />
    </main>
  );
}
