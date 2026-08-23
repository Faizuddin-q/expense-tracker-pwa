import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Category } from '@/types/expense';
import {
  availableCategoryIcons,
  categoryColorOptions,
  getCategoryColor,
  getCategoryIcon,
} from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';

interface CategoryManageTabProps {
  categories: Category[];
  onUpdateCategoryColor: (id: string, newTone: string) => void;
  onUpdateCategoryIcon?: (id: string, iconName: string) => void;
  onRenameCategory?: (id: string, label: string) => void;
  onDeleteCategory?: (id: string) => void;
}

export const CategoryManageTab = ({
  categories,
  onUpdateCategoryColor,
  onUpdateCategoryIcon,
  onRenameCategory,
  onDeleteCategory,
}: CategoryManageTabProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
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
                          onClick={() => onUpdateCategoryColor(c.id, opt.key)}
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
                            <Check className="size-3 text-white" strokeWidth={3} />
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
                              onClick={() => onUpdateCategoryIcon(c.id, key)}
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
  );
};
