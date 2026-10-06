import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

type DmSendDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const DM_SEND_WARNING =
  "Instagram può limitare l'account se rifiuta i messaggi. Attivalo solo se vuoi scrivere da qui.";

export function DmSendDrawer({ open, onOpenChange, onConfirm }: DmSendDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <div className="column min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="pt-2 pb-5">
            <DrawerTitle>Attivare l'invio dei messaggi?</DrawerTitle>
            <DrawerDescription className="mt-1 text-pretty">{DM_SEND_WARNING}</DrawerDescription>
          </div>
          <div className="grid gap-2">
            <DrawerClose render={<Button size="lg" className="w-full" onClick={onConfirm} />}>
              Attiva
            </DrawerClose>
            <DrawerClose render={<Button size="lg" variant="outline" className="w-full" />}>
              Annulla
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
