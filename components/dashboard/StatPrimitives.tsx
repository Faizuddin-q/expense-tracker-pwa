import { Bar } from '@/components/Bar';

/** One figure in the top stat strip. */
export const Stat = ({
  label,
  children,
  tone,
  emphasize,
  meter,
}: {
  label: string;
  children: React.ReactNode;
  tone?: 'default' | 'positive' | 'destructive';
  emphasize?: boolean;
  meter?: { value: number; color?: string; caption: string } | null;
}) => (
  <div className="px-3 py-2.5 sm:px-4 sm:py-3">
    <p className="label">{label}</p>
    <p
      className={`font-mono-numbers mt-1 text-[15px] font-semibold tracking-tight sm:text-[17px] ${
        tone === 'positive'
          ? 'text-positive'
          : tone === 'destructive'
            ? 'text-destructive'
            : emphasize
              ? 'text-primary'
              : 'text-foreground'
      }`}
    >
      {children}
    </p>
    {meter && (
      <div className="mt-2">
        <Bar value={meter.value} color={meter.color} className="h-1.5" />
        <p className="font-mono-numbers mt-1 text-[11px] text-muted-foreground">
          {meter.caption}
        </p>
      </div>
    )}
  </div>
);

/** Labeled % meter — used for spend vs budget / salary. */
export const PercentMeter = ({
  label,
  percent,
  over,
  detail,
}: {
  label: string;
  percent: number;
  over?: boolean;
  detail: React.ReactNode;
}) => (
  <div className="min-w-0">
    <div className="flex items-baseline justify-between gap-2">
      <span className="label">{label}</span>
      <span
        className={`font-mono-numbers text-[18px] font-semibold tracking-tight ${
          over ? 'text-destructive' : 'text-primary'
        }`}
      >
        {percent}%
      </span>
    </div>
    <Bar
      value={percent}
      className="mt-2 h-2"
      color={over ? 'var(--destructive)' : 'var(--primary)'}
    />
    <p className="mt-1.5 text-[11px] text-muted-foreground">{detail}</p>
  </div>
);
