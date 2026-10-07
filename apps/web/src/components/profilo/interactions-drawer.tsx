import { ConfirmDrawer, type ConfirmDrawerProps } from "@/components/profilo/confirm-drawer";
import { INTERACTIONS_WARNING } from "@/lib/interactions";

export function InteractionsDrawer(props: ConfirmDrawerProps) {
  return (
    <ConfirmDrawer {...props} title="Attivare le interazioni?" description={INTERACTIONS_WARNING} />
  );
}
