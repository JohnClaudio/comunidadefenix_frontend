import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  prefix?: string;
  loading?: boolean;
  sparkline?: number[];
  accentColor?: string;
  invertTrend?: boolean; // For CPA/Cost where down is good
}

// Mini sparkline SVG
const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="w-16 h-8 overflow-visible opacity-40" viewBox="0 -5 100 110" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({
  label, value, change, icon: Icon, loading, sparkline, accentColor, invertTrend,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-5 bg-card border border-border/60 rounded-xl animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-7 w-28 bg-muted rounded" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
    );
  }

  const hasChange = change !== undefined && change !== 0;
  const isPositiveRaw = change !== undefined && change >= 0;
  const isGood = invertTrend ? !isPositiveRaw : isPositiveRaw;
  const accent = accentColor || 'hsl(var(--muted-foreground))';

  return (
    <div className="group relative flex flex-col gap-1 p-5 bg-card border border-border/60 rounded-xl transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 overflow-hidden">
      {/* Accent top line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: accent }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <div className="p-1.5 rounded-lg bg-muted/40 group-hover:bg-muted/60 transition-colors">
          <Icon className="h-4 w-4 text-muted-foreground/70" />
        </div>
      </div>

      {/* Value + Sparkline */}
      <div className="flex items-end justify-between mt-1">
        <div className="text-[24px] font-bold tracking-tight text-foreground leading-none">
          {value}
        </div>
        {sparkline && sparkline.length > 1 && (
          <MiniSparkline data={sparkline} color={isGood ? '#10b981' : '#ef4444'} />
        )}
      </div>

      {/* Change indicator */}
      {hasChange ? (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium mt-1",
          isGood ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
        )}>
          {isPositiveRaw ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositiveRaw ? '+' : ''}{change!.toFixed(1)}% vs anterior</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-xs text-muted-foreground/50 mt-1">
          <Minus size={12} />
          <span>sem variação</span>
        </div>
      )}
    </div>
  );
};

export { MetricCard };
