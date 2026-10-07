import { ConfirmDrawer, type ConfirmDrawerProps } from "@/components/profilo/confirm-drawer";
import { DM_SEND_WARNING } from "@/lib/messages";

export function DmSendDrawer(props: ConfirmDrawerProps) {
  return (
    <ConfirmDrawer
      {...props}
      title="Attivare l'invio dei messaggi?"
      description={DM_SEND_WARNING}
    />
  );
}
