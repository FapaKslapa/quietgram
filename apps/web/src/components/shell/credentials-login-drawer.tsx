import { type FormEvent, useState } from "react";
import { CredentialField } from "@/components/profilo/credential-field";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LOGIN_REMEMBER_HINT,
  LOGIN_REMEMBER_LABEL,
  LOGIN_SPEED_NOTE,
} from "@/lib/credentials/copy";
import {
  type CredentialForm,
  type CredentialFormErrors,
  validateCredentialForm,
} from "@/lib/credentials/form";

export type LoginSubmission = CredentialForm & { remember: boolean };

type CredentialsLoginDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: string | null;
  initialUsername: string;
  onSubmit: (submission: LoginSubmission) => void;
};

function FormBody({
  pending,
  error,
  initialUsername,
  onSubmit,
}: Omit<CredentialsLoginDrawerProps, "open" | "onOpenChange">) {
  const [form, setForm] = useState<CredentialForm>({
    username: initialUsername,
    password: "",
    totpSecret: "",
  });
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<CredentialFormErrors>({});

  const bind = (id: keyof CredentialForm) => ({
    id,
    value: form[id],
    error: errors[id],
    onChange: (value: string) => setForm((current) => ({ ...current, [id]: value })),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateCredentialForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit({ ...form, remember });
  };

  return (
    <form
      onSubmit={submit}
      className="column min-h-0 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="pb-4">
        <DrawerTitle>Accedi con le credenziali</DrawerTitle>
        <DrawerDescription className="mt-1 text-pretty">
          Accedo subito a Instagram e riprendo da dove eri.
        </DrawerDescription>
      </div>
      <div className="grid gap-4">
        <CredentialField {...bind("username")} label="Nome utente" />
        <CredentialField {...bind("password")} label="Password" type="password" />
        <CredentialField
          {...bind("totpSecret")}
          label="Codice segreto 2FA (facoltativo)"
          hint="Se usi un'app di autenticazione, incolla qui il codice segreto per generare i codici."
          type="password"
        />
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Label htmlFor="remember">{LOGIN_REMEMBER_LABEL}</Label>
          <p id="remember-note" className="text-sm text-pretty text-muted-foreground">
            {LOGIN_REMEMBER_HINT}
          </p>
        </div>
        <Switch
          id="remember"
          checked={remember}
          onCheckedChange={setRemember}
          aria-describedby="remember-note"
        />
      </div>
      <p className="mt-5 border-l-2 border-foreground pl-3 text-sm text-pretty">
        {LOGIN_SPEED_NOTE}
      </p>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-balance text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        size="lg"
        className="mt-6 w-full"
      >
        {pending ? "Accedo" : "Accedi"}
      </Button>
    </form>
  );
}

export function CredentialsLoginDrawer({
  open,
  onOpenChange,
  ...body
}: CredentialsLoginDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <FormBody {...body} />
      </DrawerContent>
    </Drawer>
  );
}
