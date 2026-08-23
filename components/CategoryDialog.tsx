import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Category } from '@/types/expense';
import { CategoryManageTab } from '@/components/CategoryManageTab';
import { CategoryAddTab } from '@/components/CategoryAddTab';

interface CategoryDialogProps {
  categories: Category[];
  name: string;
  setName: (v: string) => void;
  selectedTone: string;
  setSelectedTone: (v: string) => void;
  selectedIconName: string;
  setSelectedIconName: (v: string) => void;
  onAdd: () => void;
  onUpdateCategoryColor: (id: string, newTone: string) => void;
  onUpdateCategoryIcon?: (id: string, iconName: string) => void;
  onRenameCategory?: (id: string, label: string) => void;
  onDeleteCategory?: (id: string) => void;
  onClose: () => void;
}

export const CategoryDialog = ({
  categories,
  name,
  setName,
  selectedTone,
  setSelectedTone,
  selectedIconName,
  setSelectedIconName,
  onAdd,
  onUpdateCategoryColor,
  onUpdateCategoryIcon,
  onRenameCategory,
  onDeleteCategory,
  onClose,
}: CategoryDialogProps) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'add'>('manage');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // The default "Manage" tab has no input field to focus — showModal()
    // would otherwise default to focusing the close button, since it's the
    // first focusable descendant. Focus the dialog container instead.
    dialogRef.current?.showModal();
    dialogRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-labelledby="category-dialog-title"
      className="m-0 h-full max-h-full w-full max-w-full border-0 bg-background/70 p-0 backdrop-blur-sm flex items-end justify-center duration-150 animate-in fade-in sm:items-center sm:p-5"
    >
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-xl border border-border bg-card duration-200 ease-[var(--ease-drawer)] animate-in slide-in-from-bottom-4 sm:rounded-xl sm:zoom-in-[0.98] sm:slide-in-from-bottom-0">
        {/* Header */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <h2
            id="category-dialog-title"
            className="text-[13px] font-semibold text-foreground"
          >
            Categories
          </h2>
          <button
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="grid size-6 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b border-border px-4 pt-2.5">
          <div className="flex gap-4">
            {(
              [
                ['manage', `Manage (${categories.length})`],
                ['add', 'New category'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`-mb-px cursor-pointer border-b-2 pb-2 text-[12px] font-medium transition-colors ${
                  activeTab === key
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'manage' ? (
          <CategoryManageTab
            categories={categories}
            onUpdateCategoryColor={onUpdateCategoryColor}
            onUpdateCategoryIcon={onUpdateCategoryIcon}
            onRenameCategory={onRenameCategory}
            onDeleteCategory={onDeleteCategory}
          />
        ) : (
          <CategoryAddTab
            name={name}
            setName={setName}
            selectedTone={selectedTone}
            setSelectedTone={setSelectedTone}
            selectedIconName={selectedIconName}
            setSelectedIconName={setSelectedIconName}
            onAdd={onAdd}
          />
        )}
      </div>
    </dialog>
  );
};
