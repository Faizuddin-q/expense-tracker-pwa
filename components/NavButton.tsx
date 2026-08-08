import { LucideIcon } from 'lucide-react';

interface NavButtonProps {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  mobile?: boolean;
}

export const NavButton = ({
  label,
  icon: Icon,
  active,
  onClick,
  mobile,
}: NavButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
        active
          ? 'bg-primary text-primary-foreground shadow-xs'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      } ${
        mobile
          ? 'flex-col gap-1 px-4 py-1.5 text-[11px]'
          : 'w-full px-3.5 py-3 text-left'
      }`}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </button>
  );
};
