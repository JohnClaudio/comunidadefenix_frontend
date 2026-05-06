import React from 'react';
import { cn } from '@/lib/utils';
import { SFFunnel, GoogleAdsFunnel, SFFunnelRates, GoogleAdsFunnelRates, CurrencyValue } from '@/types/googleAdsFunnel';
import { useTheme } from '@/components/ThemeProvider';

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

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

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

  // Refined, Minimalist Stage Styles for Dark & Light
  const stageStyles = isDark ? [
    { fill: '#6366f1', opacity: 0.9, text: '#ffffff', stroke: 'rgba(255,255,255,0.1)' },
    { fill: '#6366f1', opacity: 0.75, text: '#ffffff', stroke: 'rgba(255,255,255,0.1)' },
    { fill: '#6366f1', opacity: 0.55, text: '#ffffff', stroke: 'rgba(255,255,255,0.1)' },
    { fill: '#6366f1', opacity: 0.35, text: '#ffffff', stroke: 'rgba(255,255,255,0.1)' },
    { fill: '#6366f1', opacity: 0.20, text: '#ffffff', stroke: 'rgba(255,255,255,0.1)' },
  ] : [
    { fill: '#4f46e5', opacity: 0.9, text: '#ffffff', stroke: 'rgba(0,0,0,0.05)' },
    { fill: '#4f46e5', opacity: 0.75, text: '#ffffff', stroke: 'rgba(0,0,0,0.05)' },
    { fill: '#4f46e5', opacity: 0.55, text: '#ffffff', stroke: 'rgba(0,0,0,0.05)' },
    { fill: '#4f46e5', opacity: 0.35, text: '#1e293b', stroke: 'rgba(0,0,0,0.05)' },
    { fill: '#4f46e5', opacity: 0.20, text: '#1e293b', stroke: 'rgba(0,0,0,0.05)' },
  ];

  const steps = buildFunnelSteps();
  const n = steps.length;

  // SVG funnel dimensions
  const svgWidth = 420;
  const stageHeight = 76;
  const gapHeight = 36;
  const svgHeight = n * stageHeight + (n - 1) * gapHeight;
  const maxWidth = 420;
  const minWidth = 160;

  // Calculate widths for each stage top and bottom edges
  const getWidth = (i: number) => {
    return maxWidth - ((maxWidth - minWidth) / n) * i;
  };

  return (
    <div className="sf-card p-6 border-0 shadow-sm relative overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Funil {viewType === 'sf_funnels' ? 'de Conversão' : 'Google Ads'}
          </h3>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">
            {viewType === 'sf_funnels' ? 'Jornada completa do usuário ponto a ponto' : 'Performance e métricas de anúncios mapeadas'}
          </p>
        </div>
      </div>

      {/* Funnel + Metrics Grid */}
      <div className="flex gap-6 lg:gap-10 items-start relative z-10">
        {/* SVG Funnel */}
        <div className="flex-1 flex justify-center">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ maxWidth: svgWidth }}
            preserveAspectRatio="xMidYMid meet"
          >
            {steps.map((step, i) => {
              const topW = getWidth(i);
              const bottomW = getWidth(i + 1);
              const y = i * (stageHeight + gapHeight);
              const cx = svgWidth / 2;
              const style = stageStyles[i % stageStyles.length];

              // Trapezoid points
              const topLeft = cx - topW / 2;
              const topRight = cx + topW / 2;
              const bottomLeft = cx - bottomW / 2;
              const bottomRight = cx + bottomW / 2;

              // Use the inner (narrower) edge for safe text positioning
              const safeLeft = Math.max(topLeft, bottomLeft) + 20;
              const safeRight = Math.min(topRight, bottomRight) - 20;

              const points = `${topLeft},${y} ${topRight},${y} ${bottomRight},${y + stageHeight} ${bottomLeft},${y + stageHeight}`;

              const isLast = i === n - 1;
              const clipId = `funnel-clip-${i}`;

              // Dynamic connector line color
              const connectorColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
              const badgeBg = isDark ? "hsl(220, 14%, 11%)" : "#ffffff";
              const badgeBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

              return (
                <g key={step.label} className="group cursor-pointer">
                  <defs>
                    <clipPath id={clipId}>
                      <polygon points={points} />
                    </clipPath>
                  </defs>

                  {/* Minimalist trapezoid */}
                  <polygon
                    points={points}
                    fill={style.fill}
                    fillOpacity={style.opacity}
                    stroke={style.stroke}
                    strokeWidth="1"
                    className="transition-transform duration-300 ease-in-out hover:brightness-110"
                    style={{ transformOrigin: `${cx}px ${y + stageHeight / 2}px` }}
                  />

                  {/* Subtle glass top highlight */}
                  <line
                    x1={topLeft + 4}
                    y1={y + 1.5}
                    x2={topRight - 4}
                    y2={y + 1.5}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="opacity-50"
                  />

                  {/* All text clipped to trapezoid */}
                  <g clipPath={`url(#${clipId})`} className="pointer-events-none">
                    {/* Label */}
                    <text
                      x={safeLeft}
                      y={y + 28}
                      fill="rgba(255,255,255,0.9)"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="Inter, sans-serif"
                      textAnchor="start"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.12em', filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}
                    >
                      {step.label}
                    </text>

                    {/* Value */}
                    <text
                      x={safeLeft}
                      y={y + 60}
                      fill="#ffffff"
                      fontSize="26"
                      fontWeight="800"
                      fontFamily="Inter, sans-serif"
                      textAnchor="start"
                      style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))' }}
                    >
                      {formatNumber(step.value)}
                    </text>

                    {/* Decorative Dots on right */}
                    <circle cx={safeRight - 20} cy={y + stageHeight / 2} r="2.5" fill="rgba(255,255,255,0.5)" />
                    <circle cx={safeRight - 10} cy={y + stageHeight / 2} r="2.5" fill="rgba(255,255,255,0.5)" />
                    <circle cx={safeRight} cy={y + stageHeight / 2} r="2.5" fill="rgba(255,255,255,0.5)" />
                  </g>

                  {/* Connector line + rate badge between stages */}
                  {!isLast && (
                    <>
                      {/* Premium Connector line */}
                      <path
                        d={`M${cx},${y + stageHeight} L${cx},${y + stageHeight + gapHeight}`}
                        stroke={connectorColor}
                        strokeWidth="3"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        fill="none"
                      />

                      {/* Rate badge — dynamic width based on text length */}
                      {step.rate !== undefined && (() => {
                        const rateText = formatPercent(step.rate);
                        const badgeW = Math.max(70, rateText.length * 9 + 24);
                        return (
                          <g className="transition-transform duration-300 transform-origin-center hover:scale-110" style={{ transformOrigin: `${cx}px ${y + stageHeight + gapHeight / 2}px` }}>
                            {/* Outer shadow for badge */}
                            <rect
                              x={cx - badgeW / 2}
                              y={y + stageHeight + gapHeight / 2 - 14}
                              width={badgeW}
                              height="28"
                              rx="14"
                              fill="rgba(0,0,0,0.1)"
                              transform="translate(0, 2)"
                              filter="blur(2px)"
                            />
                            {/* Inner badge */}
                            <rect
                              x={cx - badgeW / 2}
                              y={y + stageHeight + gapHeight / 2 - 14}
                              width={badgeW}
                              height="28"
                              rx="14"
                              fill={badgeBg}
                              stroke={style.fill}
                              strokeWidth="1.5"
                            />
                            <text
                              x={cx}
                              y={y + stageHeight + gapHeight / 2 + 4.5}
                              fill={style.fill}
                              fontSize="12"
                              fontWeight="800"
                              fontFamily="Inter, sans-serif"
                              textAnchor="middle"
                            >
                              {rateText}
                            </text>
                          </g>
                        );
                      })()}
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Cost Metrics Sidebar */}
        <div className="w-28 lg:w-40 shrink-0 flex flex-col" style={{ paddingTop: 0 }}>
          {steps.map((step, i) => {
            const y = i * (stageHeight + gapHeight);
            const style = stageStyles[i % stageStyles.length];
            return (
              <div
                key={`cost-${i}`}
                className="text-right flex flex-col justify-center group"
                style={{
                  height: stageHeight,
                  marginBottom: i < n - 1 ? gapHeight : 0,
                }}
              >
                <div className="p-3 rounded-xl border border-border/40 bg-secondary/20 backdrop-blur-sm transition-all duration-300 group-hover:bg-secondary/40 group-hover:border-border/80">
                  <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                    {step.costLabel}
                  </p>
                  <p className="text-sm lg:text-lg font-black text-foreground" style={{ color: style.fill }}>
                    {formatCurrency(step.costValue, investment.currency)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: Overall conversion */}
      <div className="mt-12 pt-6 border-t border-border/40 relative z-10 hidden lg:block">
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 rounded-full bg-gradient-to-b from-primary to-emerald-400" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Taxa de Conversão Global</span>
          </div>
          {(() => {
            const first = steps[0]?.value || 0;
            const last = steps[steps.length - 1]?.value || 0;
            const overallRate = first > 0 ? ((last / first) * 100).toFixed(2) : '0.00';
            const rateNum = parseFloat(overallRate);
            return (
              <span
                className={cn(
                  'text-xl font-black px-6 py-2 rounded-xl shadow-sm border border-border/50',
                  rateNum > 5
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : rateNum > 1
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                )}
              >
                {overallRate}%
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
