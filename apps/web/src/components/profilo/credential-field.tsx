import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CredentialForm } from "@/lib/credentials/form";

type CredentialFieldProps = {
  id: keyof CredentialForm;
  label: string;
  hint?: string;
  type?: "text" | "password";
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
};

export function CredentialField({
  id,
  label,
  hint,
  type = "text",
  value,
  error,
  onChange,
}: CredentialFieldProps) {
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
