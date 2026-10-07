import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

export type ConfirmDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

type ConfirmDrawerContent = { title: string; description: string };

export function ConfirmDrawer({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: ConfirmDrawerProps & ConfirmDrawerContent) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <div className="column min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="pt-2 pb-5">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="mt-1 text-pretty">{description}</DrawerDescription>
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
