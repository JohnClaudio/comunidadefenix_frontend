import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleAdsAccounts, fetchFunnelData, fetchSegmentInsights, fetchCampaignDailyMetrics } from '@/services/googleAdsApi';
import { GoogleAdsCampaign, GoogleAdsDailyMetric } from '@/types/googleAds';
import { SegmentType } from '@/types/googleAdsSegments';
import {
    ArrowLeft, DollarSign, Eye, MousePointerClick, Target, TrendingUp, BarChart3,
    ShoppingCart, Percent, Users, Search, Monitor, Calendar,
    ChevronDown, ChevronUp, Layers, ChevronRight, Activity, Zap,
    Wallet, Crosshair, Link2, Settings2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import { DecryptedText } from '@/components/DecryptedText';

// ── Formatting helpers ──
const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

// ── Bidding strategy translation ──
const STRATEGY_LABELS: Record<string, string> = {
    TARGET_CPA: 'CPA Desejado',
    TARGET_ROAS: 'ROAS Desejado',
    MAXIMIZE_CONVERSIONS: 'Maximizar Conversões',
    MAXIMIZE_CONVERSION_VALUE: 'Maximizar Valor de Conversão',
    MANUAL_CPC: 'CPC Manual',
    MANUAL_CPM: 'CPM Manual',
    TARGET_IMPRESSION_SHARE: 'Parcela de Impressão',
    ENHANCED_CPC: 'CPC Otimizado',
    TARGET_SPEND: 'Maximizar Cliques',
    MANUAL_CPV: 'CPV Manual',
};

// ── Segment label translation ──
const formatSegmentLabel = (raw: string): string => {
    if (!raw) return '-';
    const clean = raw.replace(/^(dev|gender|age|keyword|placement|ad|search_term|day_of_week):/i, '');
    const dic: Record<string, string> = {
        'MOBILE': 'Mobile', 'DESKTOP': 'Computador', 'TABLET': 'Tablet', 'CONNECTED_TV': 'Smart TV', 'UNKNOWN': 'Desconhecido',
        'MALE': 'Masculino', 'FEMALE': 'Feminino', 'UNDETERMINED': 'Não Determinado',
        'AGE_RANGE_18_24': '18 a 24 anos', 'AGE_RANGE_25_34': '25 a 34 anos',
        'AGE_RANGE_35_44': '35 a 44 anos', 'AGE_RANGE_45_54': '45 a 54 anos',
        'AGE_RANGE_55_64': '55 a 64 anos', 'AGE_RANGE_65_UP': '65+ anos',
        'MONDAY': 'Segunda-feira', 'TUESDAY': 'Terça-feira', 'WEDNESDAY': 'Quarta-feira',
        'THURSDAY': 'Quinta-feira', 'FRIDAY': 'Sexta-feira', 'SATURDAY': 'Sábado', 'SUNDAY': 'Domingo'
    };
    return dic[clean] || clean;
};

// ── Globe SVG icon ──
function Globe(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
}

// ── KPI Card ──
const KPICard: React.FC<{
    label: string; value: string; icon: React.ElementType; colorClass: string; bgClass: string;
    isLoading?: boolean; featured?: boolean; subtitle?: string;
}> = ({ label, value, icon: Icon, colorClass, bgClass, isLoading, featured, subtitle }) => (
    <div className={`rounded-xl border border-border/40 bg-card/30 px-4 py-3.5 transition-colors hover:bg-card/60 ${featured ? 'sm:p-5' : ''}`}>
        <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
                <p className={`${featured ? 'text-xs' : 'text-[10px]'} font-semibold text-muted-foreground uppercase tracking-widest mb-1`}>{label}</p>
                {isLoading ? <Skeleton className="h-6 w-20" /> : (
                    <>
                        <p className={cn(featured ? 'text-2xl font-bold' : 'text-lg font-semibold', 'truncate', colorClass)}>{value}</p>
                        {subtitle && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>}
                    </>
                )}
            </div>
            <div className={cn(`rounded-lg flex items-center justify-center shrink-0 ml-2 ${featured ? 'w-10 h-10' : 'w-8 h-8'}`, bgClass)}>
                <Icon className={cn(featured ? 'w-5 h-5' : 'w-4 h-4', colorClass)} />
            </div>
        </div>
    </div>
);

// ── Config Info Item ──
const ConfigItem: React.FC<{ label: string; value: string; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/20 border border-border/20">
        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary/60" />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
            <p className="text-sm font-semibold text-foreground truncate">{value}</p>
        </div>
    </div>
);

// ── Segment Accordion ──
const SegmentSection: React.FC<{
    title: string; icon: React.ElementType; data: any[]; isLoading: boolean;
}> = ({ title, icon: Icon, data, isLoading }) => {
    const [expanded, setExpanded] = useState(false);
    const visibleRows = expanded ? data : data.slice(0, 5);

    return (
        <div className="rounded-xl border border-border/20 bg-background/30 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-border/40">
            <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold tracking-wide">{title}</span>
                    <span className="bg-muted/30 px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground">{data.length}</span>
                </div>
                {data.length > 0 && (expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
            </button>
            {(expanded || data.length <= 5) && data.length > 0 && (
                <div className="border-t border-border/10">
                    {isLoading ? (
                        <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full opacity-50" />)}</div>
                    ) : (
                        <div className="overflow-x-auto pb-1">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-transparent border-b-border/10 hover:bg-transparent">
                                        <TableHead className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest h-8">Segmento</TableHead>
                                        <TableHead className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest h-8 text-right">Imp.</TableHead>
                                        <TableHead className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest h-8 text-right">Cliques</TableHead>
                                        <TableHead className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest h-8 text-right">Custo</TableHead>
                                        <TableHead className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest h-8 text-right">Conv.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleRows.map((row: any, i: number) => (
                                        <TableRow key={i} className="hover:bg-white/[0.02] border-b-border/5 transition-colors">
                                            <TableCell className="text-xs font-medium max-w-[150px] truncate text-foreground/90" title={row.segment_data?.name || row.segment_data?.text || row.segment_key || '-'}>
                                                {formatSegmentLabel(row.segment_data?.name || row.segment_data?.text || row.segment_key || '-')}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-mono text-muted-foreground">{fmt(row.impressions)}</TableCell>
                                            <TableCell className="text-xs text-right font-mono text-blue-600 dark:text-blue-400">{fmt(row.clicks)}</TableCell>
                                            <TableCell className="text-xs text-right font-mono text-rose-600 dark:text-rose-400">{fmtCurrency(row.cost)}</TableCell>
                                            <TableCell className="text-xs text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">{fmt(row.conversions)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {!expanded && data.length > 5 && (
                        <button onClick={() => setExpanded(true)}
                            className="w-full py-2.5 text-[10px] uppercase tracking-widest font-semibold text-primary/70 hover:text-primary hover:bg-primary/5 transition-colors">
                            Ver todos os {data.length} registros
                        </button>
                    )}
                </div>
            )}
            {data.length === 0 && !isLoading && (
                <div className="px-5 pb-4"><p className="text-xs text-muted-foreground/50">Nenhum dado disponível para este segmento no período.</p></div>
            )}
        </div>
    );
};

// ══════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════
const CampaignDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const campaignId = parseInt(id || '0');

    // Inherit date range from URL params (passed from campaigns list) or default to 7 days
    const [dateFrom, setDateFrom] = useState(
        searchParams.get('from') || format(subDays(new Date(), 7), 'yyyy-MM-dd')
    );
    const [dateTo, setDateTo] = useState(
        searchParams.get('to') || format(new Date(), 'yyyy-MM-dd')
    );

    const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ['googleAds', dateFrom, dateTo],
        queryFn: () => fetchGoogleAdsAccounts(token!, { start_date: dateFrom, end_date: dateTo }),
        enabled: !!token,
    });

    const campaign: (GoogleAdsCampaign & { accountName?: string }) | undefined = useMemo(() => {
        if (!accountsData?.data) return undefined;
        for (const acct of accountsData.data) {
            const found = acct.campaigns.find((c: GoogleAdsCampaign) => c.id === campaignId);
            if (found) return { ...found, accountName: acct.name };
        }
        return undefined;
    }, [accountsData, campaignId]);

    const { data: funnelData, isLoading: isLoadingFunnel } = useQuery({
        queryKey: ['campaignFunnel', campaignId, dateFrom, dateTo],
        queryFn: () => fetchFunnelData(token!, {
            view_type: 'sf_funnels', from: `${dateFrom} 00:00:00`, to: `${dateTo} 23:59:59`,
            google_ads_campaign_id: campaignId,
        }),
        enabled: !!token && !!campaignId,
    });

    const allSegTypes: SegmentType[] = ['device', 'gender', 'age_range', 'keyword', 'search_term', 'placement', 'day_of_week', 'ad'];
    const { data: segData, isLoading: isLoadingSegs } = useQuery({
        queryKey: ['campaignSegments', campaignId, dateFrom, dateTo],
        queryFn: () => fetchSegmentInsights(token!, {
            segment_types: allSegTypes, start_date: dateFrom, end_date: dateTo,
            google_ads_campaign_id: campaignId,
        }),
        enabled: !!token && !!campaignId,
    });

    const { data: dailyData, isLoading: isLoadingDaily } = useQuery({
        queryKey: ['campaignDailyMetrics', campaignId, dateFrom, dateTo],
        queryFn: () => fetchCampaignDailyMetrics(token!, campaignId, { start_date: dateFrom, end_date: dateTo }),
        enabled: !!token && !!campaignId,
    });

    // ── Derived metrics ──
    const impressions = campaign?.snapshots_sum_impressions || 0;
    const clicks = campaign?.snapshots_sum_clicks || 0;
    const cost = parseFloat(campaign?.snapshots_sum_cost || '0');
    const conversions = campaign?.snapshots_sum_conversions || 0;
    const convValue = parseFloat(campaign?.snapshots_sum_conversion_value || '0');
    const checkouts = campaign?.snapshots_sum_checkout_conversions || 0;
    const checkoutValue = parseFloat(campaign?.snapshots_sum_checkout_value || '0');
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const costPerConv = conversions > 0 ? cost / conversions : 0;
    const roas = cost > 0 ? convValue / cost : 0;

    const funnel = funnelData?.data?.funnel as any || {};
    const cards = funnelData?.data?.cards as any || {};
    const sfPageViews = funnel.page_views || 0;
    const sfPassed = funnel.passed || 0;
    const sfCheckouts = funnel.checkouts || 0;
    const sfPurchases = funnel.purchases || 0;

    const isLoading = isLoadingAccounts;
    const dailyMetrics: GoogleAdsDailyMetric[] = dailyData?.data || [];

    // Chart data (oldest to newest)
    const chartData = useMemo(() => {
        return [...dailyMetrics].reverse().map(d => ({
            date: format(parseISO(d.date), 'dd/MM'),
            cost: parseFloat(d.cost),
            revenue: parseFloat(d.conversion_value),
            conversions: Number(d.conversions)
        }));
    }, [dailyMetrics]);

    // ── Strategy-specific meta value ──
    const getMetaInfo = () => {
        const s = campaign?.bidding_strategy || '';
        if (s === 'TARGET_CPA' || s === 'MAXIMIZE_CONVERSIONS') {
            return { label: 'CPA Desejado', value: campaign?.target_cpa != null ? fmtCurrency(campaign.target_cpa) : '—' };
        } else if (s === 'TARGET_ROAS' || s === 'MAXIMIZE_CONVERSION_VALUE') {
            return { label: 'ROAS Desejado', value: campaign?.target_roas != null ? `${campaign.target_roas}x` : '—' };
        } else if (s === 'MANUAL_CPC' || s === 'ENHANCED_CPC' || s === 'TARGET_SPEND') {
            return { label: 'CPC Máximo', value: campaign?.max_cpc_limit != null ? fmtCurrency(campaign.max_cpc_limit) : '—' };
        } else if (s === 'TARGET_IMPRESSION_SHARE') {
            return { label: 'Meta Impressão', value: campaign?.target_impression_share != null ? `${campaign.target_impression_share}%` : '—' };
        }
        return { label: 'Meta', value: '—' };
    };

    const metaInfo = getMetaInfo();

    // Funnel steps
    const funnelSteps = [
        { label: 'Impressões', value: impressions, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-600 dark:bg-violet-400', icon: Eye },
        { label: 'Cliques', value: clicks, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-600 dark:bg-blue-400', icon: MousePointerClick },
        { label: 'Visitas SF', value: sfPageViews, colorClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-600 dark:bg-cyan-400', icon: Globe },
        { label: 'Passagens', value: sfPassed, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-600 dark:bg-emerald-400', icon: Zap },
        { label: 'Checkouts', value: sfCheckouts || checkouts, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-600 dark:bg-amber-400', icon: ShoppingCart },
        { label: 'Vendas', value: sfPurchases || conversions, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-600 dark:bg-emerald-400', icon: DollarSign },
    ];

    // Daily meta label/value helper
    const getDailyMeta = (row: GoogleAdsDailyMetric) => {
        const s = campaign?.bidding_strategy || '';
        if (s === 'TARGET_CPA' || s === 'MAXIMIZE_CONVERSIONS') {
            return row.snapshot_target_cpa != null ? fmtCurrency(parseFloat(String(row.snapshot_target_cpa))) : '—';
        } else if (s === 'TARGET_ROAS' || s === 'MAXIMIZE_CONVERSION_VALUE') {
            return row.snapshot_target_roas != null ? `${parseFloat(String(row.snapshot_target_roas))}x` : '—';
        } else if (s === 'MANUAL_CPC' || s === 'ENHANCED_CPC' || s === 'TARGET_SPEND') {
            return row.snapshot_max_cpc_limit != null ? fmtCurrency(parseFloat(String(row.snapshot_max_cpc_limit))) : '—';
        }
        return '—';
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6 selection:bg-primary/30">

            {/* ═══════════ HEADER ═══════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard/campanhas')}
                        className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        {isLoading ? <Skeleton className="h-8 w-64" />
                            : <h1 className="text-2xl font-bold tracking-tight"><DecryptedText value={campaign?.name || 'Carregando...'} /></h1>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary uppercase tracking-widest">
                                {STRATEGY_LABELS[campaign?.bidding_strategy || ''] || campaign?.bidding_strategy?.replace(/_/g, ' ') || '—'}
                            </span>
                            {campaign?.accountName && (
                                <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-[10px] font-medium text-muted-foreground">
                                    <DecryptedText value={campaign.accountName} />
                                </span>
                            )}
                            {campaign?.tracker && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-500 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> <DecryptedText value={campaign.tracker.name} />
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Date range picker */}
                <div className="flex items-center gap-2 p-1 rounded-lg border border-border/50 bg-card/30">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/30">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <input type="date" value={dateFrom}
                            onChange={e => { const y = parseInt(e.target.value.split('-')[0]); if (y >= 2020 && y <= 2100) setDateFrom(e.target.value); }}
                            min="2020-01-01" max={dateTo}
                            className="bg-transparent border-none text-sm font-medium outline-none w-[115px] cursor-pointer" />
                    </div>
                    <span className="text-muted-foreground font-light px-1">—</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/30">
                        <input type="date" value={dateTo}
                            onChange={e => { const y = parseInt(e.target.value.split('-')[0]); if (y >= 2020 && y <= 2100) setDateTo(e.target.value); }}
                            min={dateFrom} max={format(new Date(), 'yyyy-MM-dd')}
                            className="bg-transparent border-none text-sm font-medium outline-none w-[115px] cursor-pointer" />
                    </div>
                </div>
            </div>

            {/* ═══════════ CAMPAIGN CONFIG ═══════════ */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ConfigItem
                    label="Orçamento Diário"
                    value={campaign?.budget_daily != null ? `${fmtCurrency(campaign.budget_daily)}/dia` : '—'}
                    icon={Wallet}
                />
                <ConfigItem
                    label={metaInfo.label}
                    value={metaInfo.value}
                    icon={Crosshair}
                />
                <ConfigItem
                    label="Estratégia de Lance"
                    value={STRATEGY_LABELS[campaign?.bidding_strategy || ''] || campaign?.bidding_strategy?.replace(/_/g, ' ') || '—'}
                    icon={Settings2}
                />
                <ConfigItem
                    label="Tracker Vinculado"
                    value={campaign?.tracker?.name || 'Não vinculado'}
                    icon={Link2}
                />
            </section>

            {/* ═══════════ KPI SECTIONS ═══════════ */}
            <div className="space-y-6">
                {/* Google Ads Metrics */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded bg-indigo-500/10 flex items-center justify-center">
                            <Layers className="w-3 h-3 text-indigo-500" />
                        </div>
                        <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">Google Ads</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        <KPICard label="Impressões" value={fmt(impressions)} icon={Eye} colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-600/10 dark:bg-violet-400/10" isLoading={isLoading} />
                        <KPICard label="Cliques" value={fmt(clicks)} icon={MousePointerClick} colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-600/10 dark:bg-blue-400/10" isLoading={isLoading} />
                        <KPICard label="CTR" value={fmtPct(ctr)} icon={Percent} colorClass="text-cyan-600 dark:text-cyan-400" bgClass="bg-cyan-600/10 dark:bg-cyan-400/10" isLoading={isLoading} />
                        <KPICard label="Custo Total" value={fmtCurrency(cost)} icon={DollarSign} colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-600/10 dark:bg-rose-400/10" isLoading={isLoading} />
                        <KPICard label="CPC Médio" value={fmtCurrency(cpc)} icon={DollarSign} colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-600/10 dark:bg-amber-400/10" isLoading={isLoading} />
                        <KPICard label="Part. Impressões" value={fmtPct(parseFloat(campaign?.snapshots_avg_impression_share || '0'))} icon={Layers} colorClass="text-indigo-600 dark:text-indigo-400" bgClass="bg-indigo-600/10 dark:bg-indigo-400/10" isLoading={isLoading} />
                        <KPICard label="Part. Topo" value={fmtPct(parseFloat(campaign?.snapshots_avg_top_impression_share || '0'))} icon={TrendingUp} colorClass="text-indigo-600 dark:text-indigo-400" bgClass="bg-indigo-600/10 dark:bg-indigo-400/10" isLoading={isLoading} />
                        <KPICard label="Part. Abs. Topo" value={fmtPct(parseFloat(campaign?.snapshots_avg_abs_top_impression_share || '0'))} icon={TrendingUp} colorClass="text-indigo-600 dark:text-indigo-400" bgClass="bg-indigo-600/10 dark:bg-indigo-400/10" isLoading={isLoading} />
                    </div>
                </section>

                {/* Conversions & Revenue */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center">
                            <Target className="w-3 h-3 text-emerald-500" />
                        </div>
                        <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">Conversões e Receita</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        <KPICard label="Conversões" value={fmt(conversions)} icon={Target} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-600/10 dark:bg-emerald-400/10" isLoading={isLoading} />
                        <KPICard label="Checkouts" value={fmt(checkouts)} icon={ShoppingCart} colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-600/10 dark:bg-amber-400/10" isLoading={isLoading} />
                        <KPICard label="Receita" value={fmtCurrency(convValue)} icon={TrendingUp} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-600/10 dark:bg-emerald-400/10" isLoading={isLoading} />
                        <KPICard label="Receita Checkouts" value={fmtCurrency(checkoutValue)} icon={ShoppingCart} colorClass="text-orange-600 dark:text-orange-400" bgClass="bg-orange-600/10 dark:bg-orange-400/10" isLoading={isLoading} />
                        <KPICard label="ROAS" value={`${roas.toFixed(2)}x`} icon={Activity} colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-600/10 dark:bg-violet-400/10" isLoading={isLoading} />
                        <KPICard label="Custo/Conv." value={fmtCurrency(costPerConv)} icon={DollarSign} colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-600/10 dark:bg-amber-400/10" isLoading={isLoading} />
                        <KPICard label="Visitas SF" value={fmt(sfPageViews)} icon={Globe} colorClass="text-cyan-600 dark:text-cyan-400" bgClass="bg-cyan-600/10 dark:bg-cyan-400/10" isLoading={isLoadingFunnel} />
                        <KPICard label="Vendas SF" value={fmt(sfPurchases)} icon={DollarSign} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-600/10 dark:bg-emerald-400/10" isLoading={isLoadingFunnel} />
                    </div>
                </section>
            </div>

            {/* ═══════════ CONVERSION FUNNEL ═══════════ */}
            <section className="rounded-2xl border border-border/50 bg-card/20 p-6">
                <div className="flex items-center gap-2.5 mb-6">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-tight">Jornada de Conversão</h2>
                </div>

                {isLoadingFunnel ? <Skeleton className="h-28 w-full rounded-xl" /> : (
                    <div className="flex flex-col md:flex-row items-center w-full gap-2 md:gap-0">
                        {funnelSteps.map((step, i, arr) => {
                            const prev = i > 0 ? arr[i - 1].value : step.value;
                            const rate = i > 0 && prev > 0 ? `${((step.value / prev) * 100).toFixed(1)}%` : null;
                            const Ico = step.icon;

                            return (
                                <React.Fragment key={i}>
                                    {i > 0 && (
                                        <div className="flex md:flex-col items-center justify-center px-1 py-3 md:py-0 w-full md:w-auto">
                                            <div className="hidden md:block h-[1px] w-4 bg-border/50" />
                                            <div className="flex items-center gap-1.5 md:flex-col bg-background px-2.5 py-1 md:py-1.5 md:px-1.5 rounded-md border border-border/50 z-10 md:-mx-2">
                                                <ChevronRight className="w-3 h-3 text-muted-foreground rotate-90 md:rotate-0" />
                                                {rate && <span className="text-[10px] font-semibold text-muted-foreground">{rate}</span>}
                                            </div>
                                            <div className="hidden md:block h-[1px] w-4 bg-border/50" />
                                        </div>
                                    )}
                                    <div className="flex-1 w-full md:w-auto bg-card border border-border/50 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className={cn("absolute top-0 left-0 w-1 h-full opacity-50", step.bgClass)} />
                                        <div className="flex items-center justify-between mb-2 pl-2">
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{step.label}</p>
                                            <Ico className={cn("w-4 h-4 opacity-50", step.colorClass)} />
                                        </div>
                                        <p className={cn("text-xl sm:text-2xl font-bold tabular-nums pl-2", step.colorClass)}>{fmt(step.value)}</p>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ═══════════ PERFORMANCE CHART ═══════════ */}
            <section className="rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold tracking-tight">Evolução de Receita e Custo</h2>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-medium">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f87171]" /><span className="text-muted-foreground">Custo</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#34d399]" /><span className="text-muted-foreground">Receita</span></div>
                    </div>
                </div>
                <div className="h-[280px] w-full">
                    {isLoadingDaily ? <Skeleton className="w-full h-full rounded-xl" /> : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
                                <XAxis dataKey="date" stroke="currentColor" className="opacity-50" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="currentColor" className="opacity-50" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                    labelStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
                                    formatter={(value: number, name: string) => [fmtCurrency(value), name === 'revenue' ? 'Receita' : 'Custo']}
                                />
                                <Area type="monotone" dataKey="cost" stroke="#f87171" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                                <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Nenhum dado para o gráfico.</div>
                    )}
                </div>
            </section>

            {/* ═══════════ DAILY TABLE ═══════════ */}
            <section className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                <div className="p-6 border-b border-border/30">
                    <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold tracking-tight">Histórico Diário</h2>
                        <span className="ml-auto bg-muted px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground">{dailyMetrics.length} Dias</span>
                    </div>
                </div>
                <div className="overflow-x-auto p-1">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-border/30 hover:bg-transparent">
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest h-10 whitespace-nowrap sticky left-0 bg-card z-10 border-r border-border/30">Data</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Orçamento</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">{metaInfo.label}</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Imp.</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Cliques</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Custo</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">CPC</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">CTR</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Conv.</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Checkouts</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Custo/Conv.</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Receita</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">ROAS</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Part. Impr.</TableHead>
                                <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Part. Top</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingDaily ? (
                                Array.from({ length: 5 }).map((_, i) => <TableRow key={i} className="border-border/30">{Array.from({ length: 15 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
                            ) : dailyMetrics.length === 0 ? (
                                <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground text-sm">Nenhum registro diário.</TableCell></TableRow>
                            ) : dailyMetrics.map(row => {
                                const imp = Number(row.impressions) || 0, clk = Number(row.clicks) || 0, cst = parseFloat(row.cost) || 0;
                                const cnv = Number(row.conversions) || 0, cv = parseFloat(row.conversion_value) || 0;
                                const chk = Number(row.checkout_conversions) || 0;
                                const imprSh = parseFloat(row.impression_share_percent) || 0;
                                const topSh = parseFloat(row.top_impression_share_percent) || 0;
                                const dayCpc = clk > 0 ? cst / clk : 0;
                                const dayCtr = imp > 0 ? (clk / imp) * 100 : 0;
                                const dayCostConv = cnv > 0 ? cst / cnv : 0;
                                const dayRoas = cst > 0 ? cv / cst : 0;
                                const budgetVal = row.snapshot_budget_daily != null ? parseFloat(String(row.snapshot_budget_daily)) : null;

                                return (
                                    <TableRow key={row.date} className="hover:bg-muted/30 border-b-border/30 transition-colors group">
                                        <TableCell className="text-xs font-semibold whitespace-nowrap sticky left-0 bg-card z-10 border-r border-border/30 group-hover:bg-muted/50 transition-colors">
                                            {format(parseISO(row.date), 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-mono text-muted-foreground">
                                            {budgetVal != null ? fmtCurrency(budgetVal) : <span className="text-muted-foreground/40">—</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-mono text-primary/80">
                                            {getDailyMeta(row) !== '—' ? getDailyMeta(row) : <span className="text-muted-foreground/40">—</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-mono text-muted-foreground">{fmt(imp)}</TableCell>
                                        <TableCell className="text-xs text-right font-mono text-blue-600 dark:text-blue-400">{fmt(clk)}</TableCell>
                                        <TableCell className="text-xs text-right font-mono text-rose-600 dark:text-rose-400">{fmtCurrency(cst)}</TableCell>
                                        <TableCell className="text-xs text-right font-mono text-amber-600 dark:text-amber-400">{fmtCurrency(dayCpc)}</TableCell>
                                        <TableCell className="text-xs text-right font-mono text-cyan-600 dark:text-cyan-400">{fmtPct(dayCtr)}</TableCell>
                                        <TableCell className="text-xs text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(cnv)}</TableCell>
                                        <TableCell className="text-xs text-right font-mono text-amber-600 dark:text-amber-400">{fmt(chk)}</TableCell>
                                        <TableCell className="text-xs text-right font-mono text-orange-600 dark:text-orange-400">{fmtCurrency(dayCostConv)}</TableCell>
                                        <TableCell className="text-xs text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(cv)}</TableCell>
                                        <TableCell className={cn("text-xs text-right font-mono font-semibold", dayRoas >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                            {dayRoas > 0 ? `${dayRoas.toFixed(2)}x` : '—'}
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-mono text-violet-600 dark:text-violet-400">{imprSh > 0 ? fmtPct(imprSh) : '<10%'}</TableCell>
                                        <TableCell className="text-xs text-right font-mono text-violet-600 dark:text-violet-400">{topSh > 0 ? fmtPct(topSh) : '<10%'}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* ═══════════ SEGMENT INSIGHTS ═══════════ */}
            <section className="rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex items-center gap-2.5 mb-6">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Insights por Segmento</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Dispositivo, Demografia, Termos de Pesquisa e mais</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <SegmentSection title="Dispositivos" icon={Monitor} data={segData?.data?.device || []} isLoading={isLoadingSegs} />
                    <SegmentSection title="Gênero" icon={Users} data={segData?.data?.gender || []} isLoading={isLoadingSegs} />
                    <SegmentSection title="Faixa Etária" icon={Users} data={segData?.data?.age_range || []} isLoading={isLoadingSegs} />
                    <SegmentSection title="Termos de Pesquisa" icon={Search} data={segData?.data?.search_term || []} isLoading={isLoadingSegs} />
                    <SegmentSection title="Canais / Placement" icon={Layers} data={segData?.data?.placement || []} isLoading={isLoadingSegs} />
                    <SegmentSection title="Anúncios" icon={BarChart3} data={segData?.data?.ad || []} isLoading={isLoadingSegs} />
                </div>
            </section>

        </div>
    );
};

export default CampaignDetail;
