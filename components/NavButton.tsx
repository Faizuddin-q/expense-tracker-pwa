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
      className={`group relative flex cursor-pointer items-center transition-all duration-200 active:scale-[0.96] ${
        active
          ? 'bg-primary text-primary-foreground shadow-2xs'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      } ${
        mobile
          ? 'flex-col gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-bold'
          : 'w-full gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold'
      }`}
    >
      <Icon
        className={`shrink-0 transition-transform duration-200 ${
          mobile ? 'size-3.5 sm:size-4' : 'size-4.5'
        } ${active ? 'scale-105' : 'group-hover:scale-110'}`}
      />
      <span className={mobile ? 'text-[10px] leading-tight' : ''}>{label}</span>
    </button>
  );
};
