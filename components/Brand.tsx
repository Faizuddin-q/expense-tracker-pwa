import { IndianRupee } from 'lucide-react';

export const Brand = () => {
  return (
    <div className="flex items-center gap-3.5 px-1">
      <div className="grid size-10.5 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-2xs transition-transform duration-200 hover:scale-105">
        <IndianRupee className="size-5" />
      </div>
      <div>
        <p className="text-base font-extrabold tracking-tight text-foreground">
          Pocket
        </p>
        <p className="text-[11px] font-medium text-muted-foreground">
          Spend with clarity
        </p>
      </div>
    </div>
  );
};
