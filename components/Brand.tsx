import { CircleDollarSign } from 'lucide-react';

export const Brand = () => {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <CircleDollarSign className="size-5" />
      </div>
      <div>
        <p className="font-semibold tracking-tight">Pocket</p>
        <p className="text-xs text-muted-foreground">Spend with clarity</p>
      </div>
    </div>
  );
};
