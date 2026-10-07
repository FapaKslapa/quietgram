import {
  Bookmark,
  ChevronRight,
  Clock,
  Contrast,
  Heart,
  Link2,
  LogOut,
  MessageSquare,
  Palette,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ScreenHeader } from "@/components/shell/screen-header";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/user-avatar";
import { INTERACTIONS_WARNING } from "@/lib/interactions";
import { DM_SEND_WARNING } from "@/lib/messages";
import { type SessionStatus, sessionAction, sessionLabel } from "@/lib/profile";
import { cn } from "@/lib/utils";

type ProfiloViewProps = {
  name: string;
  sessionStatus: SessionStatus;
  modeLabel: string;
  grayscale: boolean;
  dmSend: boolean;
  interactions: boolean;
  budgetLabel: string;
  themeLabel: string;
  loggingOut: boolean;
  onGrayscale: (value: boolean) => void;
  onDmSend: (value: boolean) => void;
  onInteractions: (value: boolean) => void;
  onOpenFeed: () => void;
  onOpenBudget: () => void;
  onOpenTheme: () => void;
  onLogout: () => void;
};

const ROW = "min-h-14 w-full rounded-none px-4 text-left active:bg-accent";

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="overflow-hidden rounded-lg border bg-card">
      <div className="grid divide-y">{children}</div>
    </section>
  );
}

function Value({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="text-sm text-muted-foreground">{children}</span>
      <ChevronRight
        className="size-5 flex-none text-muted-foreground"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </>
  );
}

export function ProfiloView({
  name,
  sessionStatus,
  modeLabel,
  grayscale,
  dmSend,
  interactions,
  budgetLabel,
  themeLabel,
  loggingOut,
  onGrayscale,
  onDmSend,
  onInteractions,
  onOpenFeed,
  onOpenBudget,
  onOpenTheme,
  onLogout,
}: ProfiloViewProps) {
  return (
    <>
      <ScreenHeader title="Profilo" variant="hatch" />
      <div className="column grid gap-4 px-4">
        <div className="flex items-center gap-3.5 px-1 pb-2">
          <UserAvatar username={name} avatarUrl={null} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-[-0.02em]">{name}</p>
            <p className="text-sm text-muted-foreground">
              Instagram {sessionLabel(sessionStatus).toLowerCase()}
            </p>
          </div>
        </div>

        <Group label="Contenuti">
          <Item className={ROW} render={<Link href="/salvati" />}>
            <ItemMedia variant="icon">
              <Bookmark strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Salvati</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ChevronRight
                className="size-5 text-muted-foreground"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </ItemActions>
          </Item>
          <Item className={ROW} render={<button type="button" onClick={onOpenFeed} />}>
            <ItemMedia variant="icon">
              <SlidersHorizontal strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Aggiornamento e feed</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Value>{modeLabel}</Value>
            </ItemActions>
          </Item>
        </Group>

        <Group label="Aspetto e uso">
          <Item className={ROW} render={<div />}>
            <ItemMedia variant="icon">
              <Contrast strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Bianco e nero</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Switch
                checked={grayscale}
                onCheckedChange={onGrayscale}
                aria-label="Bianco e nero"
              />
            </ItemActions>
          </Item>
          <Item className={cn(ROW, "items-start py-3")} render={<div />}>
            <ItemMedia variant="icon">
              <MessageSquare strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Invio messaggi</ItemTitle>
              <ItemDescription id="dm-send-warning" className="line-clamp-none">
                {DM_SEND_WARNING}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Switch
                checked={dmSend}
                onCheckedChange={onDmSend}
                aria-label="Invio messaggi"
                aria-describedby="dm-send-warning"
              />
            </ItemActions>
          </Item>
          <Item className={cn(ROW, "items-start py-3")} render={<div />}>
            <ItemMedia variant="icon">
              <Heart strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Interazioni</ItemTitle>
              <ItemDescription id="interactions-warning" className="line-clamp-none">
                {INTERACTIONS_WARNING}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Switch
                checked={interactions}
                onCheckedChange={onInteractions}
                aria-label="Interazioni"
                aria-describedby="interactions-warning"
              />
            </ItemActions>
          </Item>
          <Item className={ROW} render={<button type="button" onClick={onOpenBudget} />}>
            <ItemMedia variant="icon">
              <Clock strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Tempo di utilizzo</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Value>{budgetLabel}</Value>
            </ItemActions>
          </Item>
          <Item className={ROW} render={<button type="button" onClick={onOpenTheme} />}>
            <ItemMedia variant="icon">
              <Palette strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Tema</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Value>{themeLabel}</Value>
            </ItemActions>
          </Item>
        </Group>

        <Group label="Account">
          <Item className={ROW} render={<Link href="/pair" />}>
            <ItemMedia variant="icon">
              <Link2 strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Sessione Instagram</ItemTitle>
            </ItemContent>
            <ItemActions>
              <span className="text-sm text-muted-foreground">{sessionLabel(sessionStatus)}</span>
              <span className="rounded-full border px-3 py-1 text-sm font-medium">
                {sessionAction(sessionStatus)}
              </span>
            </ItemActions>
          </Item>
          <Item
            className={ROW}
            render={<button type="button" onClick={onLogout} disabled={loggingOut} />}
          >
            <ItemMedia variant="icon">
              <LogOut strokeWidth={1.8} aria-hidden="true" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{loggingOut ? "Esco" : "Esci"}</ItemTitle>
            </ItemContent>
          </Item>
        </Group>
      </div>
    </>
  );
}
