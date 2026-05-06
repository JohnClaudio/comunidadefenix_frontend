import React, { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';
import { Filter, Info } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface SalesFunnelProps {
    visitors: number;
    checkouts: number;
    purchases: number;
    refunds: number;
    // Previous-period data (optional, for comparison bars)
    prevVisitors?: number;
    prevCheckouts?: number;
    prevPurchases?: number;
    prevRefunds?: number;
    // Google Ads metrics (optional — kept for backward compat)
    impressions?: number;
    clicks?: number;
    gadsCheckouts?: number;
    conversions?: number;
}

interface FunnelStage {
    key: string;
    label: string;
    value: number;
    prevValue: number;
}

export const SalesFunnel: React.FC<SalesFunnelProps> = ({
    visitors,
    checkouts,
    purchases,
    refunds: _refunds,
    prevVisitors = 0,
    prevCheckouts = 0,
    prevPurchases = 0,
    prevRefunds: _prevRefunds = 0,
    impressions: _impressions = 0,
    clicks: _clicks = 0,
    gadsCheckouts: _gadsCheckouts = 0,
    conversions: _conversions = 0,
}) => {
    const [showImpression, setShowImpression] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Build funnel stages
    const stages: FunnelStage[] = useMemo(() => {
        const base: FunnelStage[] = [
            { key: 'visit', label: 'Visita', value: visitors, prevValue: prevVisitors },
            { key: 'cart', label: 'Carrinho', value: checkouts, prevValue: prevCheckouts },
            { key: 'order', label: 'Pedido', value: purchases, prevValue: prevPurchases },
        ];
        if (showImpression) {
            base.unshift({ key: 'impression', label: 'Impressão', value: _impressions, prevValue: 0 });
        }
        return base;
    }, [visitors, checkouts, purchases, prevVisitors, prevCheckouts, prevPurchases, showImpression, _impressions]);

    // Conversion rate formatter
    const getRate = (current: number, base: number): string => {
        if (base === 0) return '0,00%';
        return ((current / base) * 100).toFixed(2).replace('.', ',') + '%';
    };

    // Overall conversion rate (first → last)
    const overallRate = useMemo(() => {
        const first = stages[0]?.value || 0;
        const last = stages[stages.length - 1]?.value || 0;
        return getRate(last, first);
    }, [stages]);

    // Format number with locale
    const formatNum = (n: number) =>
        new Intl.NumberFormat('pt-BR').format(n);

    // Dynamic Resizing State
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgWidth, setSvgWidth] = useState(400);

    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width;
            if (w && w > 100) setSvgWidth(w);
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    // --- SVG Funnel Layout ---
    const n = stages.length;
    const stageHeight = 72;
    const gapHeight = 4;
    const svgHeight = n * stageHeight + (n - 1) * gapHeight;
    
    // Dynamic top/bottom width limits
    const maxTopWidth = Math.max(100, Math.min(320, svgWidth));
    const minBottomWidth = Math.max(80, svgWidth * 0.4);

    const getEdgeWidth = (i: number): { top: number; bottom: number } => {
        const topW = maxTopWidth - ((maxTopWidth - minBottomWidth) / n) * i;
        const bottomW = maxTopWidth - ((maxTopWidth - minBottomWidth) / n) * (i + 1);
        return { top: topW, bottom: bottomW };
    };

    const prevFill = isDark ? 'hsl(215, 15%, 25%)' : '#e5e7eb';
    // Colors based on site's primary hue 235
    const currentFills = [
        isDark ? 'hsl(235, 89%, 70%)' : 'hsl(235, 89%, 65%)', 
        isDark ? 'hsl(235, 85%, 65%)' : 'hsl(235, 85%, 58%)',
        isDark ? 'hsl(235, 80%, 60%)' : 'hsl(235, 80%, 51%)',
        isDark ? 'hsl(235, 75%, 55%)' : 'hsl(235, 75%, 44%)',
    ];

    return (
        <div className="sf-card overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-3">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                        <Filter className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Conversão de tráfego</h3>
                        <p className="text-xs text-muted-foreground">Funil de conversão entre etapas</p>
                    </div>
                </div>

                {/* Checkbox toggle */}
                <label className="flex items-center gap-2 cursor-pointer group w-fit select-none">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={showImpression}
                            onChange={(e) => setShowImpression(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className={cn(
                            "w-4 h-4 rounded border-2 transition-all duration-200",
                            "border-border/60 bg-secondary/30",
                            "peer-checked:border-primary peer-checked:bg-primary",
                            "group-hover:border-primary/60"
                        )}>
                            {showImpression && (
                                <svg className="w-full h-full text-white p-0.5" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        Exibir etapa de impressão
                    </span>
                </label>
            </div>

            {/* Main Content */}
            <div className="w-full pb-4 px-2 custom-scrollbar">
                <div className="flex items-start gap-2 w-full">
                    
                    {/* Left: Labels (Hidden to test inside labels) */}
                    <div className="shrink-0 flex flex-col relative hidden w-24">
                        {/* Connecting lines to funnel */}
                        <div className="absolute inset-y-0 right-[-10px] w-12 pointer-events-none hidden md:block">
                            {stages.map((stage, i) => {
                                const yCenter = i * (stageHeight + gapHeight) + stageHeight / 2;
                                return (
                                    <div 
                                        key={`ldot-${i}`}
                                        className="absolute left-0 border-t-[2px] border-dashed border-foreground/30 opacity-70"
                                        style={{ top: yCenter, width: '100%' }}
                                    />
                                );
                            })}
                        </div>
                        
                        {stages.map((stage, i) => (
                            <div
                                key={`label-${stage.key}`}
                                className="flex items-center justify-between"
                                style={{
                                    height: stageHeight,
                                    marginBottom: i < n - 1 ? gapHeight : 0,
                                }}
                            >
                                <div className="flex items-center gap-1 relative z-10 bg-card pr-1">
                                    <span className="text-[13px] font-semibold text-foreground/90">
                                        {stage.label}
                                    </span>
                                    <Info className="h-3 w-3 text-muted-foreground/40 cursor-help" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Center: Static Split Funnel SVG */}
                    <div 
                        ref={containerRef}
                        className="flex-1 min-w-[150px] max-w-[360px] shrink-0 flex justify-center px-4 relative mx-auto"
                    >
                        <svg
                            width={svgWidth}
                            height={svgHeight}
                            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                            className="block"
                        >
                            {stages.map((stage, i) => {
                                const { top: topW, bottom: bottomW } = getEdgeWidth(i);
                                const y = i * (stageHeight + gapHeight);
                                const cx = svgWidth / 2;

                                // Half widths
                                const topHalfW = topW / 2;
                                const bottomHalfW = bottomW / 2;

                                // Prev (Left) Polygon: Slanted left, straight right
                                const prevPoints = `
                                    ${cx - topHalfW},${y} 
                                    ${cx},${y} 
                                    ${cx},${y + stageHeight} 
                                    ${cx - bottomHalfW},${y + stageHeight}
                                `;

                                // Curr (Right) Polygon: Straight left, slanted right
                                const currPoints = `
                                    ${cx},${y} 
                                    ${cx + topHalfW},${y} 
                                    ${cx + bottomHalfW},${y + stageHeight} 
                                    ${cx},${y + stageHeight}
                                `;

                                // Conversion rates vs prev stage
                                const prevRate = i > 0 ? getRate(stage.prevValue, stages[i - 1].prevValue) : '0,00%';
                                const currRate = i > 0 ? getRate(stage.value, stages[i - 1].value) : '0,00%';

                                return (
                                    <g key={`stage-${i}`}>
                                        {/* Left Side (Prev) */}
                                        <polygon points={prevPoints} fill={prevFill} />
                                        
                                        {/* Centered Label (Left/Prev) */}
                                        <text
                                            x={cx - 24}
                                            y={y + 18}
                                            fill={isDark ? '#9ca3af' : '#6b7280'}
                                            fontSize="9"
                                            fontFamily="Inter, system-ui, sans-serif"
                                            textAnchor="end"
                                            fontWeight="700"
                                            letterSpacing="0.05em"
                                        >
                                            {stage.label.toUpperCase()}
                                        </text>
                                        
                                        <text
                                            x={cx - 24}
                                            y={y + 36}
                                            fill={isDark ? '#d1d5db' : '#4b5563'}
                                            fontSize="14"
                                            fontWeight="600"
                                            fontFamily="Inter, system-ui, sans-serif"
                                            textAnchor="end"
                                        >
                                            {formatNum(stage.prevValue)}
                                        </text>
                                        <text
                                            x={cx - 24}
                                            y={y + 54}
                                            fill={isDark ? '#6b7280' : '#9ca3af'}
                                            fontSize="10"
                                            fontFamily="Inter, system-ui, sans-serif"
                                            textAnchor="end"
                                        >
                                            {prevRate}
                                        </text>

                                        {/* Right Side (Curr) */}
                                        <polygon points={currPoints} fill={currentFills[i % currentFills.length]} />
                                        
                                        {/* Centered Label (Right/Curr) */}
                                        <text
                                            x={cx + 24}
                                            y={y + 18}
                                            fill="rgba(255,255,255,0.7)"
                                            fontSize="9"
                                            fontFamily="Inter, system-ui, sans-serif"
                                            textAnchor="start"
                                            fontWeight="700"
                                            letterSpacing="0.05em"
                                        >
                                            {stage.label.toUpperCase()}
                                        </text>
                                        
                                        <text
                                            x={cx + 24}
                                            y={y + 36}
                                            fill="#ffffff"
                                            fontSize="15"
                                            fontWeight="700"
                                            textAnchor="start"
                                            fontFamily="Inter, system-ui, sans-serif"
                                        >
                                            {formatNum(stage.value)}
                                        </text>
                                        <text
                                            x={cx + 24}
                                            y={y + 54}
                                            fill="rgba(255,255,255,0.7)"
                                            fontSize="10"
                                            fontFamily="Inter, system-ui, sans-serif"
                                            textAnchor="start"
                                        >
                                            {currRate}
                                        </text>

                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    {/* Right: Conversion Rates + Overall */}
                    <div className="shrink-0 flex flex-col justify-between relative" style={{ width: 220 }}>
                        {stages.map((stage, i) => {
                            if (i >= stages.length - 1) return null;
                            const nextStage = stages[i + 1];
                            const rate = getRate(nextStage.value, stage.value);

                            return (
                                <div
                                    key={`rate-${i}`}
                                    className="flex items-center pl-4 relative"
                                    style={{
                                        position: 'absolute',
                                        top: i * (stageHeight + gapHeight) + stageHeight - 16,
                                        height: gapHeight + 32,
                                        width: '100%',
                                    }}
                                >
                                    <div className="absolute left-[-16px] top-1/2 w-[28px] border-t-[2px] border-dashed border-foreground/40 -translate-y-1/2 hidden md:block" />
                                    <div className="text-left w-full pl-3 border-l border-border/40 bg-card z-10 py-1">
                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                            Taxa de conversão de
                                        </p>
                                        <p className="text-[10px] text-muted-foreground leading-tight mb-1">
                                            {stage.label.toLowerCase()} p/ {nextStage.label.toLowerCase()}
                                        </p>
                                        <p className="text-sm font-bold text-foreground tabular-nums leading-none">
                                            {rate}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Overall Conversion (Bottom Right aligned) */}
                        <div 
                            className="absolute right-0 bottom-6 flex flex-col items-end whitespace-nowrap pl-6"
                        >
                            <p className="text-xs text-muted-foreground leading-tight">
                                Taxa de conversão
                            </p>
                            <p className="text-xs text-muted-foreground leading-tight mb-1">
                                de visitas em pedidos
                            </p>
                            <p className="text-2xl font-black text-foreground tabular-nums leading-none">
                                {overallRate}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="px-6 pb-5 pt-4 flex items-center gap-6 border-t border-border/30 mt-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ background: prevFill }}
                    />
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                        Período anterior
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ background: currentFills[0] }}
                    />
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                        Período atual
                    </span>
                </div>
            </div>
        </div>
    );
};
