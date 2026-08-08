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
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'} ${mobile ? 'flex-col gap-1 px-4 py-1 text-[11px]' : 'w-full text-left'}`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
};
