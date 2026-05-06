import React, { useMemo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SFFunnel, GoogleAdsFunnel, SFFunnelRates, GoogleAdsFunnelRates, CurrencyValue } from '@/types/googleAdsFunnel';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedNumber } from '../dashboard/AnimatedNumber';
import { Filter, Info } from 'lucide-react';

interface FunnelStep {
  label: string;
  value: number;
  rate?: number;
  costLabel: string;
  costValue: number;
}

interface FunnelVisualizationProps {
  viewType: 'sf_funnels' | 'google_ads';
  funnel: SFFunnel | GoogleAdsFunnel;
  rates: SFFunnelRates | GoogleAdsFunnelRates;
  investment: CurrencyValue;
}

export const FunnelVisualization: React.FC<FunnelVisualizationProps> = ({
  viewType,
  funnel,
  rates,
  investment,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR').format(Math.round(value));

  const formatCurrency = (value: number, currency: string = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(2).replace('.', ',')}%`;

  const buildFunnelSteps = (): FunnelStep[] => {
    if (viewType === 'sf_funnels') {
      const f = funnel as SFFunnel;
      const r = rates as SFFunnelRates;
      return [
        { label: 'Impressões', value: f.impressions, rate: r.impressions_to_clicks_percent, costLabel: 'Investimento', costValue: investment.value },
        { label: 'Cliques', value: f.clicks, rate: r.clicks_to_page_views_percent, costLabel: 'Custo/Clique', costValue: f.clicks > 0 ? investment.value / f.clicks : 0 },
        { label: 'Passagem', value: f.passed, rate: r.page_views_to_pass_through_percent, costLabel: 'Custo/Passagem', costValue: f.passed > 0 ? investment.value / f.passed : 0 },
        { label: 'Checkouts', value: f.checkouts, rate: r.checkouts_to_purchases_percent, costLabel: 'Custo/Checkout', costValue: f.checkouts > 0 ? investment.value / f.checkouts : 0 },
        { label: 'Vendas', value: f.purchases, costLabel: 'Custo/Venda', costValue: f.purchases > 0 ? investment.value / f.purchases : 0 },
      ];
    } else {
      const f = funnel as GoogleAdsFunnel;
      const r = rates as GoogleAdsFunnelRates;
      return [
        { label: 'Impressões', value: f.impressions, rate: r.impressions_to_clicks_percent, costLabel: 'Investimento', costValue: investment.value },
        { label: 'Cliques', value: f.clicks, rate: r.clicks_to_conversions_percent, costLabel: 'CPC', costValue: f.clicks > 0 ? investment.value / f.clicks : 0 },
        { label: 'Conversões', value: f.conversions, costLabel: 'Custo/Conv.', costValue: f.conversions > 0 ? investment.value / f.conversions : 0 },
      ];
    }
  };

  const steps = buildFunnelSteps();
  const n = steps.length;

  // Max value for bar scaling
  const maxVal = useMemo(() => {
    return Math.max(...steps.map(s => s.value), 1);
  }, [steps]);

  // Overall conversion rate
  const overallRate = useMemo(() => {
    const first = steps[0]?.value || 0;
    const last = steps[steps.length - 1]?.value || 0;
    if (first === 0) return '0,00%';
    return formatPercent((last / first) * 100);
  }, [steps]);

  // Dynamic Resizing State
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(450);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 100) setSvgWidth(w);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Styling & dimensions
  const stageHeight = 68;
  const gapHeight = 4;
  const svgHeight = n * stageHeight + (n - 1) * gapHeight;
  
  const maxTopWidth = Math.max(100, Math.min(360, svgWidth));
  const minBottomWidth = Math.max(80, svgWidth * 0.4);

  const getEdgeWidth = (i: number): { top: number; bottom: number } => {
    const topW = maxTopWidth - ((maxTopWidth - minBottomWidth) / n) * i;
    const bottomW = maxTopWidth - ((maxTopWidth - minBottomWidth) / n) * (i + 1);
    return { top: topW, bottom: bottomW };
  };

  // Colors based on site's primary hue 235
  const currentFills = [
    isDark ? 'hsl(235, 89%, 70%)' : 'hsl(235, 89%, 65%)', 
    isDark ? 'hsl(235, 85%, 65%)' : 'hsl(235, 85%, 58%)',
    isDark ? 'hsl(235, 80%, 60%)' : 'hsl(235, 80%, 51%)',
    isDark ? 'hsl(235, 75%, 55%)' : 'hsl(235, 75%, 44%)',
    isDark ? 'hsl(235, 70%, 50%)' : 'hsl(235, 70%, 37%)',
  ];
  const bgFill = isDark ? 'hsl(215, 15%, 18%)' : 'hsl(215, 25%, 92%)';
  const bgOpacity = isDark ? 0.5 : 0.35;
  const labelColor = isDark ? 'hsl(215, 10%, 55%)' : 'hsl(215, 15%, 45%)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <div className="sf-card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Filter className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Funil {viewType === 'sf_funnels' ? 'de Conversão' : 'Google Ads'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {viewType === 'sf_funnels' ? 'Jornada completa do usuário ponto a ponto' : 'Performance e métricas de anúncios'}
            </p>
          </div>
        </div>
        {/* Footer style Global Conversion added to header for cleaner layout */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
            Conversão Global
          </span>
          <span className={cn(
            "text-sm font-black px-3 py-1 rounded-lg border shadow-sm",
            parseFloat(overallRate) > 5 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
            parseFloat(overallRate) > 1 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
            "bg-red-500/10 text-red-500 border-red-500/20"
          )}>
            {overallRate}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full pb-4 px-2 custom-scrollbar">
        <div className="flex items-start gap-0 w-full pt-2">
          
          {/* Left Col: Step Labels (Hidden to test labels inside funnel) */}
          <div className="shrink-0 flex flex-col relative hidden" style={{ width: 120 }}>
            {/* Connecting lines to funnel */}
            <div className="absolute inset-y-0 right-[-10px] w-12 pt-1 pointer-events-none hidden md:block">
                {steps.map((step, i) => {
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
            
            {steps.map((step, i) => (
              <div
                key={`label-${step.label}`}
                className="flex items-center justify-between pr-3"
                style={{ height: stageHeight, marginBottom: i < n - 1 ? gapHeight : 0 }}
              >
                <div className="flex items-center gap-1.5 relative z-10 bg-card pr-2">
                  <span className="text-[13px] font-semibold text-foreground/90">
                    {step.label}
                  </span>
                  <Info className="h-3 w-3 text-muted-foreground/40 cursor-help" />
                </div>
              </div>
            ))}
          </div>

          {/* Center SVG Funnel */}
          <div 
            ref={containerRef}
            className="flex-1 min-w-[150px] max-w-[400px] shrink-0 flex justify-center px-4 relative mx-auto"
          >
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="block"
            >
              <defs>
                <filter id="fv-shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.08)" />
                </filter>
              </defs>

              {steps.map((step, i) => {
                const { top: topW, bottom: bottomW } = getEdgeWidth(i);
                const y = i * (stageHeight + gapHeight);
                const cx = svgWidth / 2;

                const trapW = topW;
                const trapB = bottomW;
                
                const currPoints = `
                    ${cx - trapW / 2},${y} 
                    ${cx + trapW / 2},${y} 
                    ${cx + trapB / 2},${y + stageHeight} 
                    ${cx - trapB / 2},${y + stageHeight}
                `;

                const currRate = i > 0 ? (step.rate ? formatPercent(step.rate) : formatPercent((step.value / steps[i-1].value) * 100 || 0)) : '0,00%';
                const currBg = currentFills[i % currentFills.length];

                return (
                  <g key={step.label}>
                    {/* Full Width Trapezoid */}
                    <polygon points={currPoints} fill={currBg} />
                    
                    {/* Centered Label */}
                    <text
                        x={cx}
                        y={y + 20}
                        fill="rgba(255,255,255,0.8)"
                        fontSize="10"
                        fontFamily="Inter, system-ui, sans-serif"
                        textAnchor="middle"
                        fontWeight="700"
                        letterSpacing="0.05em"
                    >
                        {step.label.toUpperCase()}
                    </text>
                    
                    {/* Centered Value */}
                    <text
                        x={cx}
                        y={y + 40}
                        fill="#ffffff"
                        fontSize="18"
                        fontWeight="800"
                        textAnchor="middle"
                        fontFamily="Inter, system-ui, sans-serif"
                    >
                        {formatNumber(step.value)}
                    </text>
                    
                    {/* Centered Rate (if not first) */}
                    <text
                        x={cx}
                        y={y + 56}
                        fill="rgba(255,255,255,0.9)"
                        fontSize="10"
                        fontFamily="Inter, system-ui, sans-serif"
                        textAnchor="middle"
                        fontWeight="600"
                    >
                        {i > 0 && steps[i-1].value > 0 ? formatPercent((step.value / steps[i-1].value) * 100) : (i > 0 ? '0,00%' : ' ')}
                    </text>

                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right Col 1: Conversion Rates */}
          <div className="shrink-0 flex flex-col relative" style={{ width: 160 }}>
            {steps.map((step, i) => {
              if (i === steps.length - 1) return <div key="rate-last" style={{ height: stageHeight, marginBottom: 0 }} />;
              const nextStep = steps[i + 1];
              const rateVal = step.rate !== undefined ? formatPercent(step.rate) : '0,00%';
              
              return (
                <div
                  key={`rate-${i}`}
                  className="flex items-center pl-4 relative"
                  style={{ height: stageHeight + gapHeight, marginBottom: 0 }}
                >
                  <div className="absolute left-[-24px] top-1/2 w-[28px] border-t-[2px] border-dashed border-foreground/40 -translate-y-1/2 hidden md:block" />
                  <div className="text-left w-full border-l border-border/40 pl-3">
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Conversão de
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight mb-0.5 truncate">
                      {step.label} p/ {nextStep.label}
                    </p>
                    <p className="text-base font-bold text-foreground tabular-nums leading-none">
                      {rateVal}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Col 2: Cost Metrics */}
          <div className="shrink-0 flex flex-col" style={{ width: 130 }}>
            {steps.map((step, i) => (
              <div
                key={`cost-${i}`}
                className="flex items-center justify-end pl-2"
                style={{ height: stageHeight, marginBottom: i < n - 1 ? gapHeight : 0 }}
              >
                <div className="text-right w-full">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                    {step.costLabel}
                  </p>
                  <div className="bg-secondary/30 rounded-md px-2.5 py-1 border border-border/40 inline-flex items-center justify-center">
                    <p className="text-[13px] font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[96px]">
                      {formatCurrency(step.costValue, investment.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
