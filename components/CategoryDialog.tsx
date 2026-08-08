import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { Category } from '@/types/expense';
import { categoryColorOptions, getCategoryColor } from '@/lib/utils';

interface CategoryDialogProps {
  categories: Category[];
  name: string;
  setName: (v: string) => void;
  selectedTone: string;
  setSelectedTone: (v: string) => void;
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
  onAdd,
  onUpdateCategoryColor,
  onDeleteCategory,
  onClose,
}: CategoryDialogProps) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'add'>('manage');

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-5 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl ring-1 ring-border"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Categories & Colors</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Customize colors or create custom categories.
            </p>
          </div>
          <button
            aria-label="Close category dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="mt-5 flex rounded-xl bg-muted p-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 rounded-lg py-2 transition ${activeTab === 'manage' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
          >
            Manage Colors ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 rounded-lg py-2 transition ${activeTab === 'add' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
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
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-background/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="grid size-7 place-items-center rounded-lg text-white"
                        style={{ backgroundColor: currentColor }}
                      >
                        <IconComponent className="size-4" />
                      </div>
                      <span className="text-sm font-medium">{c.label}</span>
                      {c.custom && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">
                          custom
                        </span>
                      )}
                    </div>
                    {c.custom && onDeleteCategory && (
                      <button
                        onClick={() => onDeleteCategory(c.id)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete category"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Color Palette Options */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {categoryColorOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => onUpdateCategoryColor(c.id, opt.key)}
                        title={opt.label}
                        className={`size-5 rounded-full transition hover:scale-110 ${c.tone === opt.key ? 'ring-2 ring-foreground ring-offset-1 ring-offset-card' : ''}`}
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
            <label className="flex flex-col gap-2 text-sm font-medium">
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
                placeholder="e.g. Subscriptions, Gaming..."
                className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Choose Color
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {categoryColorOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedTone(opt.key)}
                    title={opt.label}
                    className={`grid size-7 place-items-center rounded-full transition hover:scale-110 ${selectedTone === opt.key ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''}`}
                    style={{ backgroundColor: opt.color }}
                  >
                    {selectedTone === opt.key && (
                      <Check className="size-3.5 text-slate-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onAdd}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-xs hover:opacity-90"
            >
              Add Category <Plus className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
