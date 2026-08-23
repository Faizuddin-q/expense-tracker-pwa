import { Check, Plus } from 'lucide-react';
import {
  availableCategoryIcons,
  categoryColorOptions,
  getCategoryColor,
  getCategoryIcon,
} from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';

interface CategoryAddTabProps {
  name: string;
  setName: (v: string) => void;
  selectedTone: string;
  setSelectedTone: (v: string) => void;
  selectedIconName: string;
  setSelectedIconName: (v: string) => void;
  onAdd: () => void;
}

export const CategoryAddTab = ({
  name,
  setName,
  selectedTone,
  setSelectedTone,
  selectedIconName,
  setSelectedIconName,
  onAdd,
}: CategoryAddTabProps) => {
  const previewColor = getCategoryColor(selectedTone);

  return (
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
                value={previewColor.startsWith('#') ? previewColor : '#5B85D6'}
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
  );
};
