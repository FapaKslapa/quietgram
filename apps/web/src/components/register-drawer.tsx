"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canRegister } from "@/lib/auth-errors";

type RegisterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: string | null;
  onSubmit: (email: string, secret: string) => Promise<void>;
};

const FIELD =
  "h-12 rounded-2xl border-0 bg-sheet px-4 text-base shadow-[0_0_0_1px_var(--line)] focus-visible:ring-2 focus-visible:ring-accent dark:bg-sheet";

export function RegisterDrawer({
  open,
  onOpenChange,
  pending,
  error,
  onSubmit,
}: RegisterDrawerProps) {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canRegister(email, secret)) void onSubmit(email.trim(), secret.trim());
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <form
          onSubmit={submit}
          className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="pb-4">
            <DrawerTitle>Primo accesso</DrawerTitle>
            <DrawerDescription className="mt-1">
              Crea la passkey di questo dispositivo. Servono la tua email e il codice di
              registrazione.
            </DrawerDescription>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={FIELD}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secret">Codice di registrazione</Label>
              <Input
                id="secret"
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className={FIELD}
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="mt-4 text-sm text-balance text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={pending || !canRegister(email, secret)}
            aria-busy={pending}
            className="mt-5 h-[52px] w-full rounded-full text-base font-semibold shadow-(--shadow-lift) disabled:bg-line disabled:text-soft disabled:opacity-100 disabled:shadow-none"
          >
            {pending ? "Creo la passkey" : "Crea passkey"}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
