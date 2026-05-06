import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';
import { Filter, BarChart3 } from 'lucide-react';

type FunnelView = 'sf' | 'google_ads';

interface FunnelStage {
    label: string;
    value: number;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    icon: string;
}

interface SalesFunnelProps {
    visitors: number;
    checkouts: number;
    purchases: number;
    refunds: number;
    // Google Ads metrics (optional)
    impressions?: number;
    clicks?: number;
    gadsCheckouts?: number;
    conversions?: number;
}

export const SalesFunnelLegacy: React.FC<SalesFunnelProps> = ({
    visitors,
    checkouts,
    purchases,
    refunds,
    impressions = 0,
    clicks = 0,
    gadsCheckouts = 0,
    conversions = 0,
}) => {
    const [view, setView] = useState<FunnelView>('sf');

    const sfStages: FunnelStage[] = useMemo(() => [
        {
            label: 'Visitantes',
            value: visitors,
            color: 'text-blue-400',
            gradientFrom: 'from-blue-500',
            gradientTo: 'to-blue-600',
            icon: '👁️',
        },
        {
            label: 'Checkouts',
            value: checkouts,
            color: 'text-amber-400',
            gradientFrom: 'from-amber-500',
            gradientTo: 'to-amber-600',
            icon: '🛒',
        },
        {
            label: 'Vendas',
            value: purchases,
            color: 'text-emerald-400',
            gradientFrom: 'from-emerald-500',
            gradientTo: 'to-emerald-600',
            icon: '💰',
        },
        {
            label: 'Reembolsos',
            value: refunds,
            color: 'text-red-400',
            gradientFrom: 'from-red-500',
            gradientTo: 'to-red-600',
            icon: '↩️',
        },
    ], [visitors, checkouts, purchases, refunds]);

    const gadsStages: FunnelStage[] = useMemo(() => [
        {
            label: 'Impressões',
            value: impressions,
            color: 'text-sky-400',
            gradientFrom: 'from-sky-500',
            gradientTo: 'to-sky-600',
            icon: '📣',
        },
        {
            label: 'Cliques',
            value: clicks,
            color: 'text-indigo-400',
            gradientFrom: 'from-indigo-500',
            gradientTo: 'to-indigo-600',
            icon: '👆',
        },
        {
            label: 'Checkouts',
            value: gadsCheckouts,
            color: 'text-amber-400',
            gradientFrom: 'from-amber-500',
            gradientTo: 'to-amber-600',
            icon: '🛒',
        },
        {
            label: 'Conversões',
            value: conversions,
            color: 'text-emerald-400',
            gradientFrom: 'from-emerald-500',
            gradientTo: 'to-emerald-600',
            icon: '🏆',
        },
    ], [impressions, clicks, gadsCheckouts, conversions]);

    const stages = view === 'sf' ? sfStages : gadsStages;
    const maxValue = Math.max(...stages.map(s => s.value), 1);

    const getConversionRate = (current: number, previous: number): string => {
        if (previous === 0) return '—';
        return ((current / previous) * 100).toFixed(1) + '%';
    };

    const hasGadsData = impressions > 0 || clicks > 0 || conversions > 0;

    return (
        <div className="sf-card">
            {/* Header with Tab Switch */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
                        <Filter className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Funil de Vendas</h3>
                        <p className="text-xs text-muted-foreground">Conversão entre etapas</p>
                    </div>
                </div>

                {/* Tab Toggle */}
                <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 border border-border/50">
                    <button
                        onClick={() => setView('sf')}
                        className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                            view === 'sf'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Funil SF
                    </button>
                    {hasGadsData && (
                        <button
                            onClick={() => setView('google_ads')}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                                view === 'google_ads'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <BarChart3 className="h-3 w-3" />
                            Google Ads
                        </button>
                    )}
                </div>
            </div>

            {/* Funnel Visualization */}
            <div className="space-y-3">
                {stages.map((stage, index) => {
                    const widthPercent = maxValue > 0 ? Math.max((stage.value / maxValue) * 100, 8) : 8;
                    const prevValue = index > 0 ? stages[index - 1].value : null;
                    const convRate = prevValue !== null ? getConversionRate(stage.value, prevValue) : null;

                    return (
                        <div key={stage.label} className="group">
                            {/* Conversion Arrow Between Stages */}
                            {convRate !== null && (
                                <div className="flex items-center justify-center py-1">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="w-8 h-px bg-border" />
                                        <span className={cn(
                                            "font-semibold px-2 py-0.5 rounded-full text-[11px]",
                                            parseFloat(convRate) > 50
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : parseFloat(convRate) > 20
                                                    ? "bg-amber-500/10 text-amber-400"
                                                    : "bg-red-500/10 text-red-400"
                                        )}>
                                            {convRate}
                                        </span>
                                        <div className="w-8 h-px bg-border" />
                                    </div>
                                </div>
                            )}

                            {/* Stage Row */}
                            <div className="flex items-center gap-4">
                                {/* Label */}
                                <div className="w-24 shrink-0 text-right">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {stage.icon} {stage.label}
                                    </span>
                                </div>

                                {/* Bar */}
                                <div className="flex-1 relative">
                                    <div className="h-10 bg-secondary/30 rounded-lg overflow-hidden border border-border/30">
                                        <div
                                            className={cn(
                                                'h-full rounded-lg bg-gradient-to-r transition-all duration-700 ease-out flex items-center justify-end pr-3',
                                                stage.gradientFrom,
                                                stage.gradientTo,
                                            )}
                                            style={{
                                                width: `${widthPercent}%`,
                                                opacity: 0.85,
                                            }}
                                        >
                                            {widthPercent > 25 && (
                                                <span className="text-white font-bold text-sm drop-shadow-sm">
                                                    <AnimatedNumber value={stage.value} className="" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Value (outside bar if bar is too small) */}
                                {widthPercent <= 25 && (
                                    <div className="w-16 shrink-0">
                                        <span className={cn("font-bold text-sm", stage.color)}>
                                            <AnimatedNumber value={stage.value} className="" />
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Summary */}
            <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Taxa de conversão geral</span>
                    <span className={cn(
                        "font-bold text-sm px-3 py-1 rounded-full",
                        view === 'sf'
                            ? (visitors > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground")
                            : (impressions > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground")
                    )}>
                        {view === 'sf'
                            ? getConversionRate(purchases, visitors)
                            : getConversionRate(conversions, impressions)
                        }
                    </span>
                </div>
            </div>
        </div>
    );
};
