import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RANGES, type TimeRangeOption } from '@/components/dashboard/DashboardRangeControls';

interface ExpensesFilterBarProps {
  timeRange: TimeRangeOption;
  onRangeSelect: (key: TimeRangeOption) => void;
  monthLabel: string;
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  filtersActive: boolean;
  onClear: () => void;
  filteredCount: number;
  totalCount: number;
}

export const ExpensesFilterBar = ({
  timeRange,
  onRangeSelect,
  monthLabel,
  canGoPrevMonth,
  canGoNextMonth,
  onPrevMonth,
  onNextMonth,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  filtersActive,
  onClear,
  filteredCount,
  totalCount,
}: ExpensesFilterBarProps) => (
  <div className="mt-2 flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {RANGES.map(({ key, label }) => (
        <button
          key={key}
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
          onClick={onPrevMonth}
          disabled={!canGoPrevMonth}
          aria-label="Previous month"
          className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" strokeWidth={1.9} />
        </button>
        <span className="min-w-[112px] text-center text-[12px] font-medium text-foreground">
          {monthLabel}
        </span>
        <button
          onClick={onNextMonth}
          disabled={!canGoNextMonth}
          aria-label="Next month"
          className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
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

    {filtersActive && (
      <button
        onClick={onClear}
        className="cursor-pointer text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Clear
      </button>
    )}

    <span className="ml-auto text-[12px] text-muted-foreground">
      <span
        className={`font-mono-numbers ${filtersActive ? 'text-primary' : 'text-foreground'}`}
      >
        {filteredCount}
      </span>{' '}
      of <span className="font-mono-numbers">{totalCount}</span>
    </span>
  </div>
);
