import React, { useMemo } from 'react';
import { GoogleAdsCampaign, KanbanRules } from '@/types/googleAds';
import { Rocket, AlertTriangle, AlertOctagon, Hourglass, ShieldAlert, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DecryptedText } from '@/components/DecryptedText';

interface CampaignHealthKanbanProps {
    campaigns: (GoogleAdsCampaign & { accountName: string })[];
    rules: KanbanRules;
}

type HealthCategory = 'high_performance' | 'learning' | 'attention' | 'critical' | 'stuck';

const COLUMNS = [
    {
        id: 'high_performance',
        title: 'Alta Performance',
        subtitle: 'ROAS positivo',
        icon: Rocket,
        gradient: 'bg-emerald-500/5 dark:bg-emerald-500/[0.02]',
        headerGlow: 'border-b border-emerald-500/10',
        accentColor: 'bg-emerald-500',
        iconBg: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400',
        countBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold',
        cardAccent: 'border-l-emerald-500',
        cardGlow: 'hover:border-emerald-500/30 hover:shadow-sm hover:shadow-emerald-500/10',
        pulse: 'bg-emerald-500',
    },
    {
        id: 'learning',
        title: 'Em Aprendizado',
        subtitle: 'Fase inicial',
        icon: Hourglass,
        gradient: 'bg-blue-500/5 dark:bg-blue-500/[0.02]',
        headerGlow: 'border-b border-blue-500/10',
        accentColor: 'bg-blue-500',
        iconBg: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400',
        countBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold',
        cardAccent: 'border-l-blue-500',
        cardGlow: 'hover:border-blue-500/30 hover:shadow-sm hover:shadow-blue-500/10',
        pulse: 'bg-blue-500',
    },
    {
        id: 'attention',
        title: 'Em Observação',
        subtitle: 'Requer atenção',
        icon: AlertTriangle,
        gradient: 'bg-amber-500/5 dark:bg-amber-500/[0.02]',
        headerGlow: 'border-b border-amber-500/10',
        accentColor: 'bg-amber-500',
        iconBg: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
        countBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold',
        cardAccent: 'border-l-amber-500',
        cardGlow: 'hover:border-amber-500/30 hover:shadow-sm hover:shadow-amber-500/10',
        pulse: 'bg-amber-500',
    },
    {
        id: 'critical',
        title: 'Ação Crítica',
        subtitle: 'Parar sangria',
        icon: AlertOctagon,
        gradient: 'bg-rose-500/5 dark:bg-rose-500/[0.02]',
        headerGlow: 'border-b border-rose-500/10',
        accentColor: 'bg-rose-500',
        iconBg: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400',
        countBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold',
        cardAccent: 'border-l-rose-500',
        cardGlow: 'hover:border-rose-500/30 hover:shadow-sm hover:shadow-rose-500/10',
        pulse: 'bg-rose-500',
    },
    {
        id: 'stuck',
        title: 'Pausadas',
        subtitle: 'Sem tráfego',
        icon: ShieldAlert,
        gradient: 'bg-zinc-500/5 dark:bg-zinc-500/[0.02]',
        headerGlow: 'border-b border-zinc-500/10',
        accentColor: 'bg-zinc-500',
        iconBg: 'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400',
        countBg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-bold',
        cardAccent: 'border-l-zinc-300 dark:border-l-zinc-600',
        cardGlow: 'hover:border-zinc-400/30 hover:shadow-sm',
        pulse: 'bg-zinc-400',
    }
];

const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const fmtNumber = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

const formatBiddingStrategy = (strategy: string) => {
    if (!strategy) return 'N/A';
    const mapping: Record<string, string> = {
        'MAXIMIZE_CONVERSIONS': 'Max. Conversões',
        'MAXIMIZE_CONVERSION_VALUE': 'Max. Valor',
        'TARGET_CPA': 'CPA Alvo',
        'TARGET_ROAS': 'ROAS Alvo',
        'MAXIMIZE_CLICKS': 'Max. Cliques',
        'MANUAL_CPC': 'CPC Manual',
        'UNKNOWN': 'Desconhecida'
    };
    return mapping[strategy.toUpperCase()] || strategy.replace(/_/g, ' ');
};

export const CampaignHealthKanban: React.FC<CampaignHealthKanbanProps> = ({ campaigns, rules }) => {
    const navigate = useNavigate();

    const categorizedCampaigns = useMemo(() => {
        const columns: Record<HealthCategory, typeof campaigns> = {
            high_performance: [],
            learning: [],
            attention: [],
            critical: [],
            stuck: [],
        };

        const validCampaigns = campaigns.filter(c => parseFloat(c.snapshots_sum_cost || '0') > 0);
        const totalCost = validCampaigns.reduce((acc, c) => acc + parseFloat(c.snapshots_sum_cost || '0'), 0);
        const totalConversions = validCampaigns.reduce((acc, c) => acc + Number(c.snapshots_sum_conversions || 0), 0);
        const totalConversionValue = validCampaigns.reduce((acc, c) => acc + parseFloat(c.snapshots_sum_conversion_value || '0'), 0);
        const avgCpa = totalConversions > 0 ? totalCost / totalConversions : 0;
        const avgRoas = totalCost > 0 ? totalConversionValue / totalCost : 0;
        const safeCpa = avgCpa > 0 ? Math.max(avgCpa, 30) : 50;
        const safeRoas = avgRoas > 0 ? Math.max(avgRoas, 1.0) : 1.5;

        campaigns.forEach(campaign => {
            const cost = parseFloat(campaign.snapshots_sum_cost) || 0;
            const conversions = Number(campaign.snapshots_sum_conversions) || 0;
            const conversionValue = parseFloat(campaign.snapshots_sum_conversion_value) || 0;
            const impressions = Number(campaign.snapshots_sum_impressions) || 0;
            const cpa = conversions > 0 ? cost / conversions : cost;
            const roas = cost > 0 ? conversionValue / cost : 0;

            let category: HealthCategory = 'stuck';

            if (impressions === 0 || (impressions < 50 && cost === 0)) {
                category = 'stuck';
            } else if (rules.use_dynamic_rules) {
                const isBleeding = (conversions === 0 && cost >= safeCpa * 1.5) || (cost >= safeCpa * 2.5 && roas < 0.5);
                const isHighPerformance = roas >= Math.max(1.5, safeRoas * 1.1) || roas >= 2.5 || (conversions >= 2 && cpa <= safeCpa * 0.7 && roas >= 1.2);
                const isLearning = cost < safeCpa * 0.7 && conversions === 0;
                if (isBleeding) category = 'critical';
                else if (isHighPerformance) category = 'high_performance';
                else if (isLearning) category = 'learning';
                else category = 'attention';
            } else {
                const isManualBleeding = (conversions === 0 && cost >= rules.critical_spend_min) || (cost >= rules.critical_spend_min * 1.5 && roas < 0.5);
                const isManualHighPerformance = (rules.high_performance_roas_min > 0 && roas >= rules.high_performance_roas_min) || (conversions >= rules.high_performance_conv_min && cpa <= rules.high_performance_cpa_max && roas >= 1.0);
                const isManualLearning = cost <= rules.learning_spend_max && conversions <= rules.learning_conv_max;
                if (isManualBleeding) category = 'critical';
                else if (isManualHighPerformance) category = 'high_performance';
                else if (isManualLearning) category = 'learning';
                else category = 'attention';
            }

            columns[category].push(campaign);
        });

        Object.keys(columns).forEach(key => {
            columns[key as HealthCategory].sort((a, b) =>
                (parseFloat(b.snapshots_sum_cost) || 0) - (parseFloat(a.snapshots_sum_cost) || 0)
            );
        });

        return columns;
    }, [campaigns, rules]);

    return (
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 h-[calc(100vh-215px)] min-h-[600px]"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
            {COLUMNS.map(column => {
                const columnCampaigns = categorizedCampaigns[column.id as HealthCategory];
                const ColumnIcon = column.icon;
                const totalCost = columnCampaigns.reduce((s, c) => s + (parseFloat(c.snapshots_sum_cost) || 0), 0);

                return (
                    <div key={column.id} className="flex-1 min-w-[285px] lg:min-w-[300px] shrink-0 flex flex-col h-full rounded-2xl border border-border/50 dark:border-border/30 overflow-hidden bg-background/40 dark:bg-card/30 backdrop-blur-sm">

                        {/* ── Column Header ── */}
                        <div className={cn('relative overflow-hidden p-4 flex-shrink-0', column.headerGlow)}>
                            {/* Light background color on the header */}
                            <div className={cn('absolute inset-0', column.gradient)} />
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', column.iconBg)}>
                                        <ColumnIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-[13px] font-bold tracking-tight text-foreground leading-none mb-1">
                                            {column.title}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                            {column.subtitle}
                                        </p>
                                    </div>
                                </div>
                                <div className={cn('flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-mono', column.countBg)}>
                                    {columnCampaigns.length}
                                </div>
                            </div>

                            {/* total cost strip */}
                            {totalCost > 0 && (
                                <div className="relative mt-3 pt-2.5 border-t border-border/40 flex items-end justify-between">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Gasto</p>
                                    <p className="text-[13px] font-bold text-foreground font-mono leading-none">{fmtCurrency(totalCost)}</p>
                                </div>
                            )}
                        </div>

                        {/* ── Scrollable Cards ── */}
                        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
                            {columnCampaigns.map(campaign => {
                                const cost = parseFloat(campaign.snapshots_sum_cost) || 0;
                                const conversions = Number(campaign.snapshots_sum_conversions) || 0;
                                const cv = parseFloat(campaign.snapshots_sum_conversion_value) || 0;
                                const cpa = conversions > 0 ? cost / conversions : 0;
                                const roas = cost > 0 ? cv / cost : 0;
                                const profit = cv - cost;
                                const roasProgress = Math.min((roas / 3) * 100, 100);
                                const profitPositive = profit > 0;
                                const profitNegative = profit < 0;

                                return (
                                    <div
                                        key={campaign.id}
                                        onClick={() => navigate(`/dashboard/campanhas/${campaign.id}`)}
                                        className={cn(
                                            'group relative cursor-pointer rounded-xl border border-border/40 dark:border-border/30',
                                            'bg-card shadow-sm hover:shadow-md transition-all duration-200',
                                            'border-l-4',
                                            column.cardAccent,
                                            column.cardGlow,
                                            'hover:-translate-y-0.5'
                                        )}
                                    >
                                        <div className="p-3.5 space-y-3">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5 truncate">
                                                        <DecryptedText value={campaign.accountName} />
                                                    </p>
                                                    <h4 className="font-semibold text-sm leading-snug text-foreground line-clamp-2">
                                                        <DecryptedText value={campaign.name} />
                                                    </h4>
                                                </div>
                                            </div>

                                            {/* Metrics row */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <MetricCell label="Gasto" value={fmtCurrency(cost)} />
                                                <MetricCell
                                                    label="Lucro"
                                                    value={profit !== 0 ? `${profitPositive ? '+' : ''}${fmtCurrency(profit)}` : '-'}
                                                    valueClass={profitPositive ? 'text-emerald-600 dark:text-emerald-400' : profitNegative ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}
                                                />
                                                <MetricCell label="CPA" value={cpa > 0 ? fmtCurrency(cpa) : '-'} />
                                            </div>

                                            {/* ROAS + Conversions */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">ROAS</span>
                                                        <span className={cn(
                                                            'text-xs font-bold tabular-nums',
                                                            roas >= 2 ? 'text-emerald-600 dark:text-emerald-400' : roas >= 1 ? 'text-blue-500' : roas > 0 ? 'text-amber-500' : 'text-muted-foreground'
                                                        )}>
                                                            {roas > 0 ? `${roas.toFixed(2)}x` : '—'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-bold text-foreground">{fmtNumber(conversions)}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">vendas</span>
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full transition-all duration-700 ease-out',
                                                            roas >= 2 ? 'bg-emerald-500' : roas >= 1 ? 'bg-blue-400' : roas > 0 ? 'bg-amber-400' : 'bg-border'
                                                        )}
                                                        style={{ width: `${roasProgress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                                <span className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
                                                    {formatBiddingStrategy(campaign.bidding_strategy)}
                                                </span>
                                                <div className={cn('w-2 h-2 rounded-full', column.pulse, 'opacity-70')} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Empty state */}
                            {columnCampaigns.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-6 text-center h-32 rounded-xl border border-dashed border-border/60 bg-muted/30 mt-1">
                                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center mb-2', column.iconBg)}>
                                        <ColumnIcon className="w-4 h-4" />
                                    </div>
                                    <p className="text-[11px] font-medium text-muted-foreground">
                                        Nenhuma campanha
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── Small helper: metric cell ──────────────────────────────────────────────
const MetricCell: React.FC<{ label: string; value: string; valueClass?: string }> = ({ label, value, valueClass }) => (
    <div className="bg-muted/40 rounded-md p-2 border border-border/40">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
        <p className={cn('text-[11px] font-semibold font-mono truncate', valueClass || 'text-foreground')}>{value}</p>
    </div>
);
