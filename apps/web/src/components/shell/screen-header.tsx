import { Weave } from "@/components/brand/weave";

export function ScreenHeader({ title }: { title: string }) {
  return (
    <header className="relative isolate px-5 pt-7 pb-[18px]">
      <Weave variant="wave" surface="head" active />
      <h1 className="text-[2rem] leading-[1.05] font-bold tracking-[-0.035em]">{title}</h1>
    </header>
  );
}
