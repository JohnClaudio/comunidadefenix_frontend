import React, { useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DollarSign, Tag, TrendingUp, ShoppingCart, Activity, Crosshair, Eye, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const METRIC_CONFIG = {
    impressions: { label: 'Impressões', icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-500/10', origin: 'google' },
    cost: { label: 'Custo', icon: DollarSign, color: 'text-red-400', bg: 'bg-red-500/10', origin: 'google' },
    clicks: { label: 'Cliques', icon: Tag, color: 'text-blue-400', bg: 'bg-blue-500/10', origin: 'google' },
    ctr: { label: 'CTR', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10', origin: 'google' },
    cpm: { label: 'CPM', icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-500/10', origin: 'google' },
    gads_conversions: { label: 'Conversões', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', origin: 'google' },
    gads_conversion_value: { label: 'Valor Conversão', icon: DollarSign, color: 'text-lime-400', bg: 'bg-lime-500/10', origin: 'google' },
    gads_checkouts: { label: 'Checkouts', icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10', origin: 'google' },
    gads_checkout_value: { label: 'Valor Checkout', icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10', origin: 'google' },
    cost_per_result: { label: 'CPA', icon: DollarSign, color: 'text-rose-400', bg: 'bg-rose-500/10', origin: 'google' },
    sf_purchases: { label: 'Vendas', icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', origin: 'sf' },
    sf_checkouts: { label: 'Checkouts', icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10', origin: 'sf' },
    impression_share: { label: 'Impr. Share', icon: Activity, color: 'text-teal-400', bg: 'bg-teal-500/10', origin: 'google' },
    top_impression_share: { label: 'Top Share', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10', origin: 'google' },
    abs_top_impression_share: { label: 'Abs Top Share', icon: Crosshair, color: 'text-sky-400', bg: 'bg-sky-500/10', origin: 'google' },
    roas: { label: 'ROAS', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10', origin: 'google' },
    page_views: { label: 'Visitas à Página', icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-500/10', origin: 'sf' },
    passed: { label: 'Passagens', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', origin: 'sf' },
    sf_cost_per_checkout: { label: 'Custo por Checkout', icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/10', origin: 'sf' },
    sf_cost_per_passage: { label: 'Custo por Passagem', icon: DollarSign, color: 'text-sky-400', bg: 'bg-sky-500/10', origin: 'sf' },
    escape_rate: { label: 'Taxa de Fuga', icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10', origin: 'sf' },
    avg_time_on_page: { label: 'Tempo de Sessão', icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-500/10', origin: 'sf' },
};

export const MetricNode = ({ data, selected }: any) => {
    const metricType = data.metricType as keyof typeof METRIC_CONFIG;
    const config = METRIC_CONFIG[metricType] || METRIC_CONFIG.clicks;
    const Icon = config.icon;

    // Emulate data fetching based on connection
    // React Flow passes data through state. We will update the node's data when an edge connects to it.
    const value = data.value !== undefined ? data.value : '---';
    const isConnected = data.isConnected;
    const dataSource = data.dataSource as string | undefined; // Original source node 'sf' or 'google'
    const metricOrigin = config.origin || 'google';

    const formatValue = (val: any) => {
        if (val === '---' || typeof val === 'string') return val;
        if (metricType === 'cost' || metricType === 'gads_conversion_value' || metricType === 'gads_checkout_value' || metricType === 'cost_per_result' || metricType === 'cpm' || metricType === 'sf_cost_per_checkout' || metricType === 'sf_cost_per_passage') {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        }
        if (metricType === 'ctr' || metricType.includes('share') || metricType === 'escape_rate') {
            return `${Number(val).toFixed(2)}%`;
        }
        if (metricType === 'roas') {
            return `${Number(val).toFixed(2)}x`;
        }
        if (metricType === 'impressions' || metricType === 'page_views' || metricType === 'passed') {
            return new Intl.NumberFormat('pt-BR').format(val);
        }
        if (metricType === 'avg_time_on_page') {
            return (data as any)?.formattedValue || `${val}s`;
        }
        return val;
    };

    return (
        <div className={cn(
            "bg-card border-2 rounded-xl p-4 shadow-lg min-w-[180px] transition-all duration-300",
            selected ? "border-primary ring-4 ring-primary/20" : (isConnected ? "border-primary/50 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.2)]" : "border-border border-dashed")
        )}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className={cn(
                    "w-3 h-3 border-2 border-background transition-colors",
                    isConnected ? "bg-primary" : "bg-muted-foreground"
                )}
            />

            <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                    <Icon className={cn("w-4 h-4", config.color)} strokeWidth={2} />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{config.label}</p>
                {isConnected && (
                    <span className={cn(
                        "ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                        metricOrigin === 'sf'
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            : "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                    )}>
                        {metricOrigin === 'sf' ? 'SF' : 'Google'}
                    </span>
                )}
            </div>

            <div className="mt-2">
                <p className={cn(
                    "text-2xl font-bold tracking-tight",
                    isConnected ? "text-foreground" : "text-muted-foreground/30"
                )}>
                    {formatValue(value)}
                </p>
            </div>

            {!isConnected && (
                <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-[10px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                        Conecte a um tracker
                    </span>
                </div>
            )}
        </div>
    );
};
