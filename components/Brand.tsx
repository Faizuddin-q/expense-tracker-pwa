import { IndianRupee } from 'lucide-react';

export const Brand = () => {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
        <IndianRupee className="size-5" />
      </div>
      <div>
        <p className="font-semibold tracking-tight text-foreground">Pocket</p>
        <p className="text-xs text-muted-foreground">Spend with clarity</p>
      </div>
    </div>
  );
};
