import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CredentialForm,
  type CredentialFormErrors,
  validateCredentialForm,
} from "@/lib/credentials/form";

type AutoLoginFormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: string | null;
  initialUsername: string;
  onSubmit: (form: CredentialForm) => void;
};

type FieldProps = {
  id: keyof CredentialForm;
  label: string;
  hint?: string;
  type?: "text" | "password";
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
};

function Field({ id, label, hint, type = "text", value, error, onChange }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={error !== undefined}
        aria-describedby={`${id}-note`}
        onChange={(event) => onChange(event.target.value)}
      />
      <p
        id={`${id}-note`}
        className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
      >
        {error ?? hint}
      </p>
    </div>
  );
}

function FormBody({
  pending,
  error,
  initialUsername,
  onSubmit,
}: Omit<AutoLoginFormDrawerProps, "open" | "onOpenChange">) {
  const [form, setForm] = useState<CredentialForm>({
    username: initialUsername,
    password: "",
    totpSecret: "",
  });
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
    if (Object.keys(found).length === 0) onSubmit(form);
  };

  return (
    <form
      onSubmit={submit}
      className="column min-h-0 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="pb-4">
        <DrawerTitle>Credenziali di Instagram</DrawerTitle>
        <DrawerDescription className="mt-1 text-pretty">
          Servono solo per rientrare quando la sessione scade.
        </DrawerDescription>
      </div>
      <div className="grid gap-4">
        <Field {...bind("username")} label="Nome utente" />
        <Field {...bind("password")} label="Password" type="password" />
        <Field
          {...bind("totpSecret")}
          label="Codice segreto 2FA (facoltativo)"
          hint="Se usi un'app di autenticazione, incolla qui il codice segreto per generare i codici."
          type="password"
        />
      </div>
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
        {pending ? "Salvo" : "Salva e attiva"}
      </Button>
    </form>
  );
}

export function AutoLoginFormDrawer({ open, onOpenChange, ...body }: AutoLoginFormDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <FormBody {...body} />
      </DrawerContent>
    </Drawer>
  );
}
