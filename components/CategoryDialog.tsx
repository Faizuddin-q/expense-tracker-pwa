import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { Category } from '@/types/expense';
import {
  availableCategoryIcons,
  categoryColorOptions,
  getCategoryColor,
} from '@/lib/utils';

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
  onDeleteCategory,
  onClose,
}: CategoryDialogProps) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'add'>('manage');

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-5 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl bg-card p-7 shadow-2xl ring-1 ring-border"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Categories & Icons
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Customize colors, select custom icons, or create new categories.
            </p>
          </div>
          <button
            aria-label="Close category dialog"
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="mt-6 flex rounded-xl bg-muted/80 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 cursor-pointer rounded-lg py-2.5 transition-all duration-200 ${
              activeTab === 'manage'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Manage Colors ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 cursor-pointer rounded-lg py-2.5 transition-all duration-200 ${
              activeTab === 'add'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            + Add Custom
          </button>
        </div>

        {/* Tab 1: Manage Colors for existing categories */}
        {activeTab === 'manage' && (
          <div className="mt-5 flex max-h-[340px] flex-col gap-3.5 overflow-y-auto pr-1">
            {categories.map((c) => {
              const currentColor = getCategoryColor(c.tone);
              const IconComponent = c.Icon || Plus;
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-background/60 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="grid size-7.5 place-items-center rounded-lg text-white shadow-2xs"
                        style={{ backgroundColor: currentColor }}
                      >
                        <IconComponent className="size-4" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {c.label}
                      </span>
                      {c.custom && (
                        <span className="rounded-full bg-accent/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        title="Pick custom color"
                        className="relative flex cursor-pointer items-center justify-center rounded-full ring-1 ring-border"
                      >
                        <input
                          type="color"
                          value={
                            currentColor.startsWith('#')
                              ? currentColor
                              : '#10b981'
                          }
                          onChange={(e) =>
                            onUpdateCategoryColor(c.id, e.target.value)
                          }
                          className="size-6 cursor-pointer border-0 bg-transparent opacity-0"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 size-6 rounded-full"
                          style={{ backgroundColor: currentColor }}
                        />
                      </label>
                      {c.custom && onDeleteCategory && (
                        <button
                          onClick={() => onDeleteCategory(c.id)}
                          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                          title="Delete category"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Color Palette Swatches */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {categoryColorOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => onUpdateCategoryColor(c.id, opt.key)}
                        title={opt.label}
                        className={`size-5 cursor-pointer rounded-full transition-transform hover:scale-110 active:scale-95 ${
                          c.tone === opt.key
                            ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                            : ''
                        }`}
                        style={{ backgroundColor: opt.color }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Create new Custom Category */}
        {activeTab === 'add' && (
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category Name
              <input
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
                placeholder="e.g. Subscriptions, Gaming, Pets..."
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Choose Icon
              </label>
              <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                {availableCategoryIcons.map(({ key, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedIconName(key)}
                    title={key}
                    className={`grid size-9 cursor-pointer place-items-center rounded-xl transition-all hover:scale-105 active:scale-95 ${
                      selectedIconName === key
                        ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/40'
                        : 'bg-muted/70 text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose Color
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary">
                  Custom Picker
                  <input
                    type="color"
                    value={
                      getCategoryColor(selectedTone).startsWith('#')
                        ? getCategoryColor(selectedTone)
                        : '#10b981'
                    }
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="size-6 cursor-pointer rounded-full border-0 p-0"
                  />
                </label>
              </div>

              <div className="mt-2.5 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                {categoryColorOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedTone(opt.key)}
                    title={opt.label}
                    className={`grid size-7 cursor-pointer place-items-center rounded-full transition-transform hover:scale-110 active:scale-95 ${
                      selectedTone === opt.key
                        ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                        : ''
                    }`}
                    style={{ backgroundColor: opt.color }}
                  >
                    {selectedTone === opt.key && (
                      <Check className="size-3.5 text-white drop-shadow-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onAdd}
              className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-2xs transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Add Category <Plus className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
