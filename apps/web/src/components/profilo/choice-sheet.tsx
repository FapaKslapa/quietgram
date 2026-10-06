import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

export type Choice<T extends string | number> = {
  value: T;
  label: string;
  description?: string | undefined;
};

type ChoiceSheetProps<T extends string | number> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  name: string;
  options: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function ChoiceSheet<T extends string | number>({
  open,
  onOpenChange,
  title,
  description,
  name,
  options,
  value,
  onChange,
}: ChoiceSheetProps<T>) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <div className="column min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="pt-2 pb-4">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="mt-1">{description}</DrawerDescription>
          </div>
          <fieldset className="grid divide-y border-y">
            <legend className="sr-only">{title}</legend>
            {options.map((option) => (
              <label
                key={option.value}
                className="relative flex min-h-14 cursor-pointer items-center gap-3 py-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={option.value === value}
                  onChange={() => onChange(option.value)}
                  className="peer sr-only"
                />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <strong className="text-base font-semibold">{option.label}</strong>
                  {option.description ? (
                    <span className="text-sm text-muted-foreground">{option.description}</span>
                  ) : null}
                </span>
                <Check
                  aria-hidden="true"
                  strokeWidth={2.25}
                  className="size-5 flex-none opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                />
              </label>
            ))}
          </fieldset>
          <DrawerClose render={<Button size="lg" className="mt-6 w-full" />}>Fatto</DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
