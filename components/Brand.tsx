import { IndianRupee } from 'lucide-react';

export const Brand = () => {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-200 hover:scale-105">
        <IndianRupee className="size-5" />
      </div>
      <div>
        <p className="text-base leading-tight font-extrabold tracking-tight text-foreground">
          Pocket
        </p>
        <p className="text-[11px] font-medium text-muted-foreground">
          Spend with clarity
        </p>
      </div>
    </div>
  );
};
