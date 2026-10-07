import { AutoLoginConfirmDrawer } from "@/components/profilo/auto-login-confirm-drawer";
import { AutoLoginFormDrawer } from "@/components/profilo/auto-login-form-drawer";
import { ConfirmDrawer } from "@/components/profilo/confirm-drawer";
import type { AutoLoginStep } from "@/hooks/use-auto-login";
import type { CredentialForm } from "@/lib/credentials/form";

export type AutoLoginDrawersProps = {
  step: AutoLoginStep;
  username: string;
  pending: boolean;
  error: string | null;
  onStep: (step: AutoLoginStep) => void;
  onSave: (form: CredentialForm) => void;
  onRemove: () => void;
};

export function AutoLoginDrawers({
  step,
  username,
  pending,
  error,
  onStep,
  onSave,
  onRemove,
}: AutoLoginDrawersProps) {
  const bind = (name: Exclude<AutoLoginStep, null>) => ({
    open: step === name,
    onOpenChange: (open: boolean) => onStep(open ? name : null),
  });

  return (
    <>
      <AutoLoginConfirmDrawer {...bind("confirm")} onContinue={() => onStep("form")} />
      <AutoLoginFormDrawer
        {...bind("form")}
        pending={pending}
        error={error}
        initialUsername={username}
        onSubmit={onSave}
      />
      <ConfirmDrawer
        {...bind("remove")}
        title="Disattivare l'accesso automatico?"
        description="La password salvata verrà cancellata. Quando la sessione scade dovrai usare di nuovo l'estensione."
        confirmLabel="Disattiva"
        onConfirm={onRemove}
      />
    </>
  );
}
