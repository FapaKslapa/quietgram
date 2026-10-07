import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { AUTO_LOGIN_POINTS, AUTO_LOGIN_SUMMARY } from "@/lib/credentials/copy";

type AutoLoginConfirmDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
};

export function AutoLoginConfirmDrawer({
  open,
  onOpenChange,
  onContinue,
}: AutoLoginConfirmDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <div className="column min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="pt-2 pb-4">
            <DrawerTitle>Attivare l&apos;accesso automatico?</DrawerTitle>
            <DrawerDescription className="mt-1 text-pretty">{AUTO_LOGIN_SUMMARY}</DrawerDescription>
          </div>
          <ul className="mb-5 grid gap-3 text-[0.9375rem] text-pretty">
            {AUTO_LOGIN_POINTS.map((point) => (
              <li key={point} className="flex gap-3">
                <span
                  className="mt-[0.55em] size-1.5 flex-none rounded-full bg-foreground"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
          <div className="grid gap-2">
            <Button size="lg" className="w-full" onClick={onContinue}>
              Continua
            </Button>
            <DrawerClose render={<Button size="lg" variant="outline" className="w-full" />}>
              Annulla
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
