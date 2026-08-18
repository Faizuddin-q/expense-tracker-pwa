import { ChevronLeft, ChevronRight } from 'lucide-react';

export type TimeRangeOption = 'all' | '1d' | '7d' | '14d' | '30d' | 'month' | 'custom';

export const RANGES: { key: TimeRangeOption; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: '7d', label: '7D' },
  { key: '14d', label: '14D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
];

interface DashboardRangeControlsProps {
  timeRange: TimeRangeOption;
  onRangeSelect: (key: TimeRangeOption) => void;
  periodLabel: string;
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  filteredCount: number;
  filtersActive: boolean;
}

export const DashboardRangeControls = ({
  timeRange,
  onRangeSelect,
  periodLabel,
  canGoPrevMonth,
  canGoNextMonth,
  onPrevMonth,
  onNextMonth,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  filteredCount,
  filtersActive,
}: DashboardRangeControlsProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {RANGES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onRangeSelect(key)}
          className={`h-7 cursor-pointer rounded-md px-2.5 text-[12px] font-medium transition-colors ${
            timeRange === key
              ? 'bg-primary/12 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    {timeRange === 'month' && (
      <div className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-1">
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={!canGoPrevMonth}
          aria-label="Previous month"
          className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" strokeWidth={1.9} />
        </button>
        <span className="min-w-[112px] text-center text-[12px] font-medium text-foreground">
          {periodLabel}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={!canGoNextMonth}
          aria-label="Next month"
          className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-4" strokeWidth={1.9} />
        </button>
      </div>
    )}

    {timeRange === 'custom' && (
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          aria-label="From"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="field h-8 cursor-pointer rounded-lg border border-border bg-card px-2 text-[12px] text-foreground"
        />
        <span className="text-[12px] text-faint">to</span>
        <input
          type="date"
          aria-label="To"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="field h-8 cursor-pointer rounded-lg border border-border bg-card px-2 text-[12px] text-foreground"
        />
      </div>
    )}

    <span className="ml-auto text-[12px] text-muted-foreground">
      <span
        className={`font-mono-numbers ${
          filtersActive || filteredCount > 0 ? 'text-primary' : 'text-foreground'
        }`}
      >
        {filteredCount}
      </span>{' '}
      expenses
    </span>
  </div>
);
