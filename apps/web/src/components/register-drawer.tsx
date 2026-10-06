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
          className="column min-h-0 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
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
            size="lg"
            className="mt-6 w-full"
          >
            {pending ? "Creo la passkey" : "Crea passkey"}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
