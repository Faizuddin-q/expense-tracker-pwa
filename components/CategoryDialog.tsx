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

  const PreviewIcon =
    availableCategoryIcons.find((i) => i.key === selectedIconName)?.Icon ||
    Plus;
  const previewColor = getCategoryColor(selectedTone);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 p-0 sm:p-5 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-5 sm:p-7 shadow-2xl ring-1 ring-border duration-200 ease-[var(--ease-drawer)] animate-in slide-in-from-bottom-5 sm:zoom-in-95"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Categories & Icons
            </h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              Customize colors and icons, or create new categories.
            </p>
          </div>
          <button
            aria-label="Close category dialog"
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="mt-4 sm:mt-5 flex rounded-xl bg-muted/80 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 cursor-pointer rounded-lg py-2 transition duration-200 active:scale-95 sm:py-2.5 ${
              activeTab === 'manage'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Manage ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 cursor-pointer rounded-lg py-2 transition duration-200 active:scale-95 sm:py-2.5 ${
              activeTab === 'add'
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            + Add Custom
          </button>
        </div>

        {/* Standardized Viewport Container */}
        <div className="mt-4 sm:mt-5 h-[420px] sm:h-[500px] max-h-[68vh] sm:max-h-[75vh] overflow-hidden">
          {/* Tab 1: Manage Colors for existing categories */}
          {activeTab === 'manage' && (
            <div className="flex h-full flex-col gap-3.5 overflow-y-auto pr-1.5">
              {categories.map((c) => {
                const currentColor = getCategoryColor(c.tone);
                const IconComponent = c.Icon || Plus;
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-background/60 p-3.5 transition-colors duration-150 hover:bg-background"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div
                          className="grid size-7.5 shrink-0 place-items-center rounded-lg text-white"
                          style={{ backgroundColor: currentColor }}
                        >
                          <IconComponent className="size-4 text-white" />
                        </div>
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
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-bold text-foreground outline-none hover:border-border focus:border-input focus:bg-background focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          <span className="truncate text-sm font-bold text-foreground">
                            {c.label}
                          </span>
                        )}
                        {c.custom && (
                          <span className="shrink-0 rounded-lg bg-accent/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          title="Pick custom color"
                          className="relative flex cursor-pointer items-center justify-center rounded-lg ring-1 ring-border transition-transform hover:scale-110 active:scale-95"
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
                            className="pointer-events-none absolute inset-0 size-6 rounded-lg"
                            style={{ backgroundColor: currentColor }}
                          />
                        </label>
                        {c.custom && onDeleteCategory && (
                          <button
                            onClick={() => onDeleteCategory(c.id)}
                            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-95"
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
                          className={`size-5 cursor-pointer rounded-lg transition-transform hover:scale-110 active:scale-95 ${
                            c.tone === opt.key
                              ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                              : ''
                          }`}
                          style={{ backgroundColor: opt.color }}
                        />
                      ))}
                    </div>

                    {onUpdateCategoryIcon && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Icon
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {availableCategoryIcons.map(({ key, Icon }) => {
                            const active =
                              (c.iconName ?? 'plus') === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                title={key}
                                onClick={() =>
                                  onUpdateCategoryIcon(c.id, key)
                                }
                                className={`grid size-8 cursor-pointer place-items-center rounded-lg transition-transform hover:scale-110 active:scale-95 ${
                                  active
                                    ? 'bg-foreground text-background ring-2 ring-foreground ring-offset-2 ring-offset-card'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <Icon className="size-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Create new Custom Category */}
          {activeTab === 'add' && (
            <div className="flex h-full flex-col justify-between">
              {/* Scrollable Form Body */}
              <div className="flex-1 space-y-4 overflow-y-auto pr-1.5 pb-2">
                {/* Live Button Preview Card */}
                <div className="rounded-2xl border border-border/80 bg-background/80 p-3.5 ring-1 ring-border/50">
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Live category button preview
                  </p>
                  <div className="mt-2 flex items-center gap-3.5">
                    <div
                      className="flex min-w-24 shrink-0 flex-col items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-sm transition"
                      style={{ backgroundColor: previewColor }}
                    >
                      <PreviewIcon className="size-5 text-white" />
                      <span>{name.trim() || 'Category'}</span>
                    </div>
                    <p className="text-xs leading-relaxed font-medium text-muted-foreground">
                      Solid background with white icon and text.
                    </p>
                  </div>
                </div>

                <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                    className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Choose Icon ({availableCategoryIcons.length})
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableCategoryIcons.map(({ key, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedIconName(key)}
                        title={key}
                        className={`grid size-9 cursor-pointer place-items-center rounded-xl transition hover:scale-105 active:scale-95 ${
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
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Choose Color ({categoryColorOptions.length})
                    </label>
                    <label className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      Custom Picker
                      <input
                        type="color"
                        value={
                          previewColor.startsWith('#')
                            ? previewColor
                            : '#10b981'
                        }
                        onChange={(e) => setSelectedTone(e.target.value)}
                        className="size-5.5 cursor-pointer rounded-lg border-0 p-0"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {categoryColorOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSelectedTone(opt.key)}
                        title={opt.label}
                        className={`grid size-7 cursor-pointer place-items-center rounded-lg transition-transform hover:scale-110 active:scale-95 ${
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
              </div>

              {/* Sticky Always-Visible Footer Action Button */}
              <div className="shrink-0 border-t border-border/60 pt-3">
                <button
                  onClick={onAdd}
                  className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98]"
                >
                  Add Category <Plus className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
