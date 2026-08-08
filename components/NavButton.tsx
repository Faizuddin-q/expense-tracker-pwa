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
      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${
        active
          ? 'bg-primary text-primary-foreground shadow-2xs'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      } ${
        mobile
          ? 'flex-col gap-1 px-4 py-2 text-[11px]'
          : 'w-full px-4 py-3 text-left'
      }`}
    >
      <Icon
        className={`size-4.5 shrink-0 transition-transform duration-200 ${
          active ? 'scale-105' : 'group-hover:scale-110'
        }`}
      />
      <span>{label}</span>
    </button>
  );
};
