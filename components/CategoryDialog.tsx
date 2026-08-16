import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { Category } from '@/types/expense';
import {
  availableCategoryIcons,
  categoryColorOptions,
  getCategoryColor,
  getCategoryIcon,
} from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useFocusTrap } from '@/lib/useFocusTrap';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const previewColor = getCategoryColor(selectedTone);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm duration-150 animate-in fade-in sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-dialog-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-xl border border-border bg-card duration-200 ease-[var(--ease-drawer)] animate-in slide-in-from-bottom-4 sm:rounded-xl sm:zoom-in-[0.98] sm:slide-in-from-bottom-0"
      >
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
            onClick={onClose}
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

        {/* Manage */}
        {activeTab === 'manage' && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="divide-y divide-border">
              {categories.map((c) => {
                const currentColor = getCategoryColor(c.tone);
                const isEditing = editingId === c.id;

                return (
                  <div key={c.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon
                        color={currentColor}
                        icon={getCategoryIcon(c)}
                        size="xs"
                      />

                      {c.custom && onRenameCategory ? (
                        <input
                          defaultValue={c.label}
                          aria-label={`Rename ${c.label}`}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next && next !== c.label) {
                              onRenameCategory(c.id, next);
                            } else {
                              e.target.value = c.label;
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
                          className="field-plain min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-foreground hover:border-border"
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate px-1 text-[13px] font-medium text-foreground">
                          {c.label}
                        </span>
                      )}

                      {c.custom && (
                        <button
                          onClick={() => setEditingId(isEditing ? null : c.id)}
                          aria-expanded={isEditing}
                          className="shrink-0 cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          {isEditing ? 'Done' : 'Edit'}
                        </button>
                      )}

                      {c.custom && onDeleteCategory && (
                        <button
                          onClick={() => onDeleteCategory(c.id)}
                          title="Delete category"
                          aria-label={`Delete ${c.label}`}
                          className="grid size-6 shrink-0 cursor-pointer place-items-center rounded text-faint transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.9} />
                        </button>
                      )}
                    </div>

                    {isEditing && c.custom && (
                      <div className="mt-3 space-y-3 pl-[18px]">
                        <div>
                          <p className="label mb-1.5">Color</p>
                          <div className="flex flex-wrap gap-1">
                            {categoryColorOptions.map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() =>
                                  onUpdateCategoryColor(c.id, opt.key)
                                }
                                title={opt.label}
                                aria-label={opt.label}
                                className={`grid size-5 cursor-pointer place-items-center rounded transition-transform hover:scale-110 ${
                                  c.tone === opt.key
                                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                                    : ''
                                }`}
                                style={{ backgroundColor: opt.color }}
                              >
                                {c.tone === opt.key && (
                                  <Check
                                    className="size-3 text-white"
                                    strokeWidth={3}
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {onUpdateCategoryIcon && (
                          <div>
                            <p className="label mb-1.5">Icon</p>
                            <div className="flex flex-wrap gap-1">
                              {availableCategoryIcons.map(({ key, Icon }) => {
                                const active = (c.iconName ?? 'plus') === key;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    title={key}
                                    aria-label={key}
                                    onClick={() =>
                                      onUpdateCategoryIcon(c.id, key)
                                    }
                                    className={`grid size-7 cursor-pointer place-items-center rounded border transition-colors ${
                                      active
                                        ? 'border-border-strong bg-secondary text-foreground'
                                        : 'border-transparent text-faint hover:bg-secondary hover:text-muted-foreground'
                                    }`}
                                  >
                                    <Icon className="size-3.5" strokeWidth={1.9} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add */}
        {activeTab === 'add' && (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <label htmlFor="cat-name" className="label mb-1.5 block">
                  Name
                </label>
                <input
                  id="cat-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.nativeEvent.isComposing &&
                      e.keyCode !== 229
                    )
                      onAdd();
                  }}
                  placeholder="Subscriptions, Pets, Travel…"
                  className="field h-9 w-full rounded-lg border border-border bg-background px-2.5 text-[13px] text-foreground placeholder:text-faint"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="label">Color</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                    Custom
                    <input
                      type="color"
                      aria-label="Custom color"
                      value={
                        previewColor.startsWith('#') ? previewColor : '#5B85D6'
                      }
                      onChange={(e) => setSelectedTone(e.target.value)}
                      className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {categoryColorOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedTone(opt.key)}
                      title={opt.label}
                      aria-label={opt.label}
                      className={`grid size-6 cursor-pointer place-items-center rounded transition-transform hover:scale-110 ${
                        selectedTone === opt.key
                          ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                          : ''
                      }`}
                      style={{ backgroundColor: opt.color }}
                    >
                      {selectedTone === opt.key && (
                        <Check className="size-3 text-white" strokeWidth={3} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label mb-1.5">Icon</p>
                <div className="flex flex-wrap gap-1">
                  {availableCategoryIcons.map(({ key, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedIconName(key)}
                      title={key}
                      aria-label={key}
                      className={`grid size-8 cursor-pointer place-items-center rounded border transition-colors ${
                        selectedIconName === key
                          ? 'border-border-strong bg-secondary text-foreground'
                          : 'border-transparent text-faint hover:bg-secondary hover:text-muted-foreground'
                      }`}
                    >
                      <Icon className="size-4" strokeWidth={1.9} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="label mb-1.5">Preview</p>
                <div className="flex h-9 w-fit items-center gap-2 rounded-lg border border-border bg-card px-2.5">
                  <CategoryIcon
                    color={previewColor}
                    icon={getCategoryIcon({ iconName: selectedIconName })}
                    size="xs"
                  />
                  <span className="text-[13px] font-medium text-foreground">
                    {name.trim() || 'Category'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3">
              <button
                onClick={onAdd}
                disabled={!name.trim()}
                className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus className="size-3.5" strokeWidth={2.2} />
                Create category
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
