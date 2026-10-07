import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { type AutoLoginState, autoLoginDescription } from "@/lib/credentials/copy";
import { cn } from "@/lib/utils";

export type AutoLoginRowProps = {
  loading: boolean;
  state: AutoLoginState | null;
  username: string | null;
  resuming: boolean;
  onToggle: (value: boolean) => void;
  onResume: () => void;
};

export function AutoLoginRow({
  loading,
  state,
  username,
  resuming,
  onToggle,
  onResume,
}: AutoLoginRowProps) {
  const attention = state === "challenge" || state === "rejected";
  return (
    <Item className="min-h-14 w-full items-start rounded-none px-4 py-3 text-left" render={<div />}>
      <ItemMedia variant="icon">
        <KeyRound strokeWidth={1.8} aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Accesso automatico</ItemTitle>
        <ItemDescription
          id="auto-login-description"
          className={cn("line-clamp-none", attention && "text-foreground")}
        >
          {autoLoginDescription(state, username)}
        </ItemDescription>
        {state === "challenge" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 justify-self-start"
            disabled={resuming}
            aria-busy={resuming}
            onClick={onResume}
          >
            {resuming ? "Riattivo" : "Ho confermato, riprova"}
          </Button>
        ) : null}
      </ItemContent>
      <ItemActions>
        <Switch
          checked={state !== null}
          disabled={loading}
          onCheckedChange={onToggle}
          aria-label="Accesso automatico"
          aria-describedby="auto-login-description"
        />
      </ItemActions>
    </Item>
  );
}
