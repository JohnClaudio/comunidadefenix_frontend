import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Smartphone, Monitor, Tv, Tablet, Users, Calendar,
    Search, Play, MousePointer, Eye, DollarSign, TrendingUp,
    ChevronDown, BarChart3, Clock, MapPin, Globe, Loader2, Target
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSegmentInsights, fetchGoogleAdsAccounts } from '@/services/googleAdsApi';
import { SegmentRow, SegmentType } from '@/types/googleAdsSegments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────

const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

const DEVICE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    MOBILE: { icon: Smartphone, label: 'Mobile', color: '#3b82f6' },
    DESKTOP: { icon: Monitor, label: 'Desktop', color: '#8b5cf6' },
    TABLET: { icon: Tablet, label: 'Tablet', color: '#f59e0b' },
    CONNECTED_TV: { icon: Tv, label: 'Smart TV', color: '#10b981' },
    OTHER: { icon: Globe, label: 'Outros', color: '#6b7280' },
};

const GENDER_LABELS: Record<string, string> = {
    MALE: 'Masculino', FEMALE: 'Feminino', UNDETERMINED: 'Não Determinado',
};
const GENDER_COLORS: Record<string, string> = {
    MALE: '#3b82f6', FEMALE: '#ec4899', UNDETERMINED: '#6b7280',
};

const AGE_LABELS: Record<string, string> = {
    AGE_RANGE_18_24: '18-24', AGE_RANGE_25_34: '25-34', AGE_RANGE_35_44: '35-44',
    AGE_RANGE_45_54: '45-54', AGE_RANGE_55_64: '55-64', AGE_RANGE_65_UP: '65+',
    AGE_RANGE_UNDETERMINED: 'N/D',
};

const DOW_LABELS: Record<string, string> = {
    MONDAY: 'Seg', TUESDAY: 'Ter', WEDNESDAY: 'Qua',
    THURSDAY: 'Qui', FRIDAY: 'Sex', SATURDAY: 'Sáb', SUNDAY: 'Dom',
};

// ─── KPI Card ─────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: string; icon: React.ElementType; color: string; sub?: string }> = ({ label, value, icon: Icon, color, sub }) => (
    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
        <div className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", `bg-${color}/10`)}>
                <Icon className={cn("w-4 h-4", `text-${color}`)} />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
);

// ─── Segment Data Table ───────────────────────────────────────

const SegmentTable: React.FC<{
    rows: SegmentRow[];
    labelFn: (r: SegmentRow) => string;
    iconFn?: (r: SegmentRow) => React.ElementType;
    colorFn?: (r: SegmentRow) => string;
    showConversions?: boolean;
    showCpc?: boolean;
    showCpm?: boolean;
}> = ({ rows, labelFn, iconFn, colorFn, showConversions = true, showCpc = true, showCpm = false }) => {
    if (rows.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Sem dados disponíveis</p>;

    return (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b border-border">
                        <th className="text-left font-semibold px-4 py-2.5 text-muted-foreground">Segmento</th>
                        <th className="text-right font-semibold px-3 py-2.5 text-muted-foreground">Impressões</th>
                        <th className="text-right font-semibold px-3 py-2.5 text-muted-foreground">Cliques</th>
                        <th className="text-right font-semibold px-3 py-2.5 text-muted-foreground">CTR</th>
                        <th className="text-right font-semibold px-3 py-2.5 text-muted-foreground">Custo</th>
                        {showCpc && <th className="text-right font-semibold px-3 py-2.5 text-muted-foreground">CPC</th>}
                        {showCpm && <th className="text-right font-semibold px-3 py-2.5 text-muted-foreground">CPM</th>}
                        {showConversions && <th className="text-right font-semibold px-3 py-2.5 text-muted-foreground">Conv.</th>}
                        {showConversions && <th className="text-right font-semibold px-3 py-2.5 text-muted-foreground">Valor Conv.</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const Icon = iconFn?.(row);
                        const color = colorFn?.(row);
                        return (
                            <tr key={row.segment_key} className={cn(
                                "border-b border-border/30 hover:bg-muted/30 transition-colors",
                                i === 0 && "bg-primary/5"
                            )}>
                                <td className="px-4 py-2.5 font-medium text-foreground max-w-[220px] truncate">
                                    <span className="flex items-center gap-2">
                                        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" style={color ? { color } : undefined} />}
                                        {labelFn(row)}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmtNum(row.impressions)}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-emerald-400">{fmtNum(row.clicks)}</td>
                                <td className="px-3 py-2.5 text-right font-mono">{fmtPct(row.ctr_percent)}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-red-400">{fmtCur(row.cost)}</td>
                                {showCpc && <td className="px-3 py-2.5 text-right font-mono">{fmtCur(row.avg_cpc)}</td>}
                                {showCpm && <td className="px-3 py-2.5 text-right font-mono">{fmtCur(row.cpm)}</td>}
                                {showConversions && <td className="px-3 py-2.5 text-right font-mono text-purple-400">{fmtNum(row.conversions)}</td>}
                                {showConversions && <td className="px-3 py-2.5 text-right font-mono text-amber-400">{fmtCur(row.conversion_value)}</td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─── Summary Row (for the overview) ───────────────────────────

const totals = (rows: SegmentRow[]) => ({
    impressions: rows.reduce((s, r) => s + r.impressions, 0),
    clicks: rows.reduce((s, r) => s + r.clicks, 0),
    cost: rows.reduce((s, r) => s + r.cost, 0),
    conversions: rows.reduce((s, r) => s + r.conversions, 0),
    convValue: rows.reduce((s, r) => s + r.conversion_value, 0),
});

// ─── Charts ───────────────────────────────────────────────────

const BarChartVertical: React.FC<{
    rows: SegmentRow[];
    labelFn: (r: SegmentRow) => string;
    metricKey: 'impressions' | 'clicks' | 'cost' | 'conversions';
    color: string;
    topLabel?: (r: SegmentRow) => string;
}> = ({ rows, labelFn, metricKey, color, topLabel }) => {
    const max = Math.max(...rows.map(r => r[metricKey] as number), 1);
    return (
        <div className="flex items-end gap-2 h-36">
            {rows.map(r => {
                const val = r[metricKey] as number;
                const barH = (val / max) * 100;
                return (
                    <div key={r.segment_key} className="flex-1 flex flex-col items-center gap-0.5"
                        title={`${labelFn(r)}: ${metricKey === 'cost' ? fmtCur(val) : fmtNum(val)}`}>
                        {topLabel && <span className="text-[8px] text-purple-400 font-mono">{topLabel(r)}</span>}
                        <div className="w-full flex items-end" style={{ height: '90px' }}>
                            <div
                                className="w-full rounded-t-md transition-all duration-500"
                                style={{
                                    height: `${Math.max(barH, 3)}%`,
                                    minHeight: '3px',
                                    background: `linear-gradient(to top, ${color}cc, ${color}55)`,
                                }}
                            />
                        </div>
                        <span className="text-[9px] font-semibold text-muted-foreground">{labelFn(r)}</span>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────

const SegmentInsights: React.FC = () => {
    const { token } = useAuth();
    const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
    const [dateTo, setDateTo] = useState<Date>(new Date());
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

    const { data: accountsData } = useQuery({
        queryKey: ['googleAdsAccounts', format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
        queryFn: () => fetchGoogleAdsAccounts(token!, {
            start_date: format(dateFrom, 'yyyy-MM-dd'),
            end_date: format(dateTo, 'yyyy-MM-dd'),
        }),
        enabled: !!token,
    });

    const accounts = accountsData?.data || [];
    const campaigns = useMemo(() => {
        const all: { id: number; name: string }[] = [];
        const filteredAccounts = selectedAccountId
            ? accounts.filter(a => a.id === selectedAccountId)
            : accounts;
        filteredAccounts.forEach(a => a.campaigns.forEach(c => all.push({ id: c.id, name: c.name })));
        return all;
    }, [accounts, selectedAccountId]);

    const segmentTypes: SegmentType[] = ['device', 'gender', 'age_range', 'keyword', 'placement', 'day_of_week', 'hour_of_day'];

    const { data: insightsData, isLoading } = useQuery({
        queryKey: ['segmentInsights', format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd'), selectedAccountId, selectedCampaignId],
        queryFn: () => fetchSegmentInsights(token!, {
            segment_types: segmentTypes,
            start_date: format(dateFrom, 'yyyy-MM-dd'),
            end_date: format(dateTo, 'yyyy-MM-dd'),
            google_ads_account_id: selectedAccountId || undefined,
            google_ads_campaign_id: selectedCampaignId || undefined,
        }),
        enabled: !!token,
    });

    const segments = insightsData?.data || {};

    const deviceRows = (segments.device || []) as SegmentRow[];
    const genderRows = (segments.gender || []) as SegmentRow[];
    const ageRows = (segments.age_range || []) as SegmentRow[];
    const keywordRows = (segments.keyword || []) as SegmentRow[];
    const placementRows = (segments.placement || []) as SegmentRow[];
    const dowRows = (segments.day_of_week || []) as SegmentRow[];
    const hourRows = (segments.hour_of_day || []) as SegmentRow[];

    // Compute aggregate totals from device rows (most reliable)
    const t = totals(deviceRows);

    const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
        if (range?.from) setDateFrom(range.from);
        if (range?.to) setDateTo(range.to);
        if (range?.from && range?.to) setCalendarOpen(false);
    };

    // ── Ordered day of week rows ─────────────
    const orderedDow = useMemo(() => {
        const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        return order.map(d => dowRows.find(r => r.segment_data?.day_of_week === d)).filter(Boolean) as SegmentRow[];
    }, [dowRows]);

    // ── Hourly aggregated rows ───────────────
    const hourlyData = useMemo(() => {
        const map: Record<number, { impressions: number; clicks: number; cost: number; conversions: number }> = {};
        hourRows.forEach(r => {
            const h = r.segment_data?.hour ?? 0;
            if (!map[h]) map[h] = { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
            map[h].impressions += r.impressions;
            map[h].clicks += r.clicks;
            map[h].cost += r.cost;
            map[h].conversions += r.conversions;
        });
        return Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            ...(map[i] || { impressions: 0, clicks: 0, cost: 0, conversions: 0 }),
        }));
    }, [hourRows]);

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-wrap gap-3 items-center">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="min-w-[240px] justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(dateFrom, 'dd MMM', { locale: ptBR })} - {format(dateTo, 'dd MMM yyyy', { locale: ptBR })}
                            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                            mode="range"
                            defaultMonth={dateFrom}
                            selected={{ from: dateFrom, to: dateTo }}
                            onSelect={handleDateRangeSelect}
                            numberOfMonths={2}
                            className="p-3 pointer-events-auto"
                        />
                    </PopoverContent>
                </Popover>

                <Select
                    value={selectedAccountId?.toString() || 'all'}
                    onValueChange={(v) => { setSelectedAccountId(v === 'all' ? null : Number(v)); setSelectedCampaignId(null); }}
                >
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as contas" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as contas</SelectItem>
                        {accounts.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedCampaignId?.toString() || 'all'}
                    onValueChange={(v) => setSelectedCampaignId(v === 'all' ? null : Number(v))}
                >
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas as campanhas" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as campanhas</SelectItem>
                        {campaigns.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">Carregando insights...</span>
                </div>
            ) : (
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-4">
                        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                        <TabsTrigger value="devices">Dispositivos</TabsTrigger>
                        <TabsTrigger value="demographics">Demografia</TabsTrigger>
                        <TabsTrigger value="clicks">Cliques</TabsTrigger>
                        <TabsTrigger value="conversions">Conversões</TabsTrigger>
                    </TabsList>

                    {/* ════════════════════════════════════════════════════ */}
                    {/* VISÃO GERAL */}
                    {/* ════════════════════════════════════════════════════ */}
                    <TabsContent value="overview" className="space-y-4">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Impressões</p>
                                <p className="text-xl font-bold text-blue-400">{fmtNum(t.impressions)}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Cliques</p>
                                <p className="text-xl font-bold text-emerald-400">{fmtNum(t.clicks)}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Custo Total</p>
                                <p className="text-xl font-bold text-red-400">{fmtCur(t.cost)}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Conversões</p>
                                <p className="text-xl font-bold text-purple-400">{fmtNum(t.conversions)}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Valor Conv.</p>
                                <p className="text-xl font-bold text-amber-400">{fmtCur(t.convValue)}</p>
                            </div>
                        </div>

                        {/* Quick visual: Devices + Gender + Age */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="w-4 h-4 text-blue-500" /> Dispositivos</CardTitle></CardHeader>
                                <CardContent className="space-y-2">
                                    {deviceRows.map(r => {
                                        const dev = r.segment_data?.device || 'OTHER';
                                        const meta = DEVICE_META[dev] || DEVICE_META.OTHER;
                                        const Icon = meta.icon;
                                        const pct = t.impressions > 0 ? (r.impressions / t.impressions) * 100 : 0;
                                        return (
                                            <div key={r.segment_key} className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="flex items-center gap-1.5"><Icon className="w-3 h-3" style={{ color: meta.color }} />{meta.label}</span>
                                                    <span className="text-muted-foreground">{fmtCur(r.cost)} · {r.conversions} conv</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-pink-500" /> Gênero</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-2">
                                        {genderRows.slice(0, 3).map(r => {
                                            const type = r.segment_data?.type || 'N/D';
                                            const totalG = genderRows.reduce((s, g) => s + g.impressions, 0);
                                            const pct = totalG > 0 ? (r.impressions / totalG) * 100 : 0;
                                            return (
                                                <div key={r.segment_key} className="bg-muted/30 rounded-lg p-2.5 text-center">
                                                    <p className="text-[10px] text-muted-foreground">{GENDER_LABELS[type] || type}</p>
                                                    <p className="text-lg font-bold" style={{ color: GENDER_COLORS[type] || '#6b7280' }}>{fmtPct(pct)}</p>
                                                    <p className="text-[9px] text-red-400">{fmtCur(r.cost)}</p>
                                                    <p className="text-[9px] text-purple-400">{r.conversions} conv</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Faixa Etária</CardTitle></CardHeader>
                                <CardContent className="space-y-1.5">
                                    {ageRows.slice(0, 7).map(r => {
                                        const type = r.segment_data?.type || '';
                                        const maxCost = Math.max(...ageRows.map(a => a.cost), 1);
                                        return (
                                            <div key={r.segment_key} className="flex items-center gap-2 text-xs">
                                                <span className="w-10 text-muted-foreground">{AGE_LABELS[type] || type}</span>
                                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(r.cost / maxCost) * 100}%` }} />
                                                </div>
                                                <span className="w-14 text-right text-red-400">{fmtCur(r.cost)}</span>
                                                <span className="w-6 text-right text-purple-400">{r.conversions}</span>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Day of Week + Hourly */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" /> Dia da Semana</CardTitle></CardHeader>
                                <CardContent>
                                    <BarChartVertical
                                        rows={orderedDow}
                                        labelFn={r => DOW_LABELS[r.segment_data?.day_of_week] || ''}
                                        metricKey="cost"
                                        color="#f97316"
                                        topLabel={r => `${r.conversions}`}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-500" /> Performance por Hora</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-px h-28">
                                        {hourlyData.map(d => {
                                            const maxImp = Math.max(...hourlyData.map(h => h.impressions), 1);
                                            const barH = (d.impressions / maxImp) * 100;
                                            const intensity = barH / 100;
                                            return (
                                                <div key={d.hour} className="flex-1 flex flex-col items-center"
                                                    title={`${d.hour}h: ${fmtNum(d.impressions)} imp, ${fmtNum(d.clicks)} cliques, ${d.conversions} conv`}>
                                                    <div className="w-full flex items-end" style={{ height: '90px' }}>
                                                        <div className="w-full rounded-t-sm transition-all" style={{
                                                            height: `${Math.max(barH, 2)}%`,
                                                            backgroundColor: `rgba(6, 182, 212, ${0.2 + intensity * 0.8})`,
                                                        }} />
                                                    </div>
                                                    {d.hour % 3 === 0 && <span className="text-[8px] text-muted-foreground mt-1">{d.hour}h</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ════════════════════════════════════════════════════ */}
                    {/* DISPOSITIVOS */}
                    {/* ════════════════════════════════════════════════════ */}
                    <TabsContent value="devices" className="space-y-4">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Smartphone className="w-4 h-4 text-blue-500" /> Métricas por Dispositivo</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <SegmentTable
                                    rows={deviceRows}
                                    labelFn={r => DEVICE_META[r.segment_data?.device || 'OTHER']?.label || r.segment_data?.device || 'Outro'}
                                    iconFn={r => DEVICE_META[r.segment_data?.device || 'OTHER']?.icon || Globe}
                                    colorFn={r => DEVICE_META[r.segment_data?.device || 'OTHER']?.color || '#6b7280'}
                                    showCpc
                                    showCpm
                                />
                            </CardContent>
                        </Card>

                        {/* Visual: share bars */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Custo</CardTitle></CardHeader>
                                <CardContent>
                                    <BarChartVertical rows={deviceRows} labelFn={r => DEVICE_META[r.segment_data?.device || 'OTHER']?.label || ''} metricKey="cost" color="#3b82f6" />
                                </CardContent>
                            </Card>
                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Cliques</CardTitle></CardHeader>
                                <CardContent>
                                    <BarChartVertical rows={deviceRows} labelFn={r => DEVICE_META[r.segment_data?.device || 'OTHER']?.label || ''} metricKey="clicks" color="#10b981" />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ════════════════════════════════════════════════════ */}
                    {/* DEMOGRAFIA */}
                    {/* ════════════════════════════════════════════════════ */}
                    <TabsContent value="demographics" className="space-y-4">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-pink-500" /> Métricas por Gênero</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <SegmentTable
                                    rows={genderRows}
                                    labelFn={r => GENDER_LABELS[r.segment_data?.type || 'UNDETERMINED'] || r.segment_data?.type || 'N/D'}
                                    colorFn={r => GENDER_COLORS[r.segment_data?.type || 'UNDETERMINED'] || '#6b7280'}
                                    showCpc
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Métricas por Faixa Etária</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <SegmentTable
                                    rows={ageRows}
                                    labelFn={r => AGE_LABELS[r.segment_data?.type || 'AGE_RANGE_UNDETERMINED'] || r.segment_data?.type || 'N/D'}
                                    showCpc
                                />
                            </CardContent>
                        </Card>

                        {/* Visual: Age cost chart */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Custo por Faixa Etária</CardTitle></CardHeader>
                                <CardContent>
                                    <BarChartVertical
                                        rows={ageRows.filter(r => r.segment_data?.type !== 'AGE_RANGE_UNDETERMINED')}
                                        labelFn={r => AGE_LABELS[r.segment_data?.type || ''] || ''}
                                        metricKey="cost"
                                        color="#8b5cf6"
                                        topLabel={r => `${r.conversions} conv`}
                                    />
                                </CardContent>
                            </Card>
                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Cliques por Gênero</CardTitle></CardHeader>
                                <CardContent>
                                    <BarChartVertical
                                        rows={genderRows}
                                        labelFn={r => GENDER_LABELS[r.segment_data?.type || ''] || ''}
                                        metricKey="clicks"
                                        color="#ec4899"
                                        topLabel={r => `${r.conversions} conv`}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ════════════════════════════════════════════════════ */}
                    {/* CLIQUES */}
                    {/* ════════════════════════════════════════════════════ */}
                    <TabsContent value="clicks" className="space-y-4">
                        {/* Keywords Table */}
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Search className="w-4 h-4 text-emerald-500" /> Top Keywords</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <SegmentTable
                                    rows={keywordRows.slice(0, 20)}
                                    labelFn={r => r.segment_data?.text || r.segment_key}
                                    showCpc
                                />
                            </CardContent>
                        </Card>

                        {/* Placements Table */}
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Play className="w-4 h-4 text-red-500" /> Top Placements</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <SegmentTable
                                    rows={placementRows.slice(0, 15)}
                                    labelFn={r => r.segment_data?.name || r.segment_data?.url || 'Placement'}
                                    showCpc
                                />
                            </CardContent>
                        </Card>

                        {/* Day of Week + Hour: Clicks focused */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" /> Cliques por Dia</CardTitle></CardHeader>
                                <CardContent>
                                    <BarChartVertical
                                        rows={orderedDow}
                                        labelFn={r => DOW_LABELS[r.segment_data?.day_of_week] || ''}
                                        metricKey="clicks"
                                        color="#10b981"
                                        topLabel={r => fmtCur(r.cost)}
                                    />
                                </CardContent>
                            </Card>
                            <Card className="border-border">
                                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-500" /> Cliques por Hora</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-px h-28">
                                        {hourlyData.map(d => {
                                            const maxClicks = Math.max(...hourlyData.map(h => h.clicks), 1);
                                            const barH = (d.clicks / maxClicks) * 100;
                                            return (
                                                <div key={d.hour} className="flex-1 flex flex-col items-center"
                                                    title={`${d.hour}h: ${fmtNum(d.clicks)} cliques, ${fmtCur(d.cost)}`}>
                                                    <div className="w-full flex items-end" style={{ height: '90px' }}>
                                                        <div className="w-full rounded-t-sm transition-all" style={{
                                                            height: `${Math.max(barH, 2)}%`,
                                                            background: `linear-gradient(to top, #10b981cc, #10b98155)`,
                                                        }} />
                                                    </div>
                                                    {d.hour % 3 === 0 && <span className="text-[8px] text-muted-foreground mt-1">{d.hour}h</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ════════════════════════════════════════════════════ */}
                    {/* CONVERSÕES */}
                    {/* ════════════════════════════════════════════════════ */}
                    <TabsContent value="conversions" className="space-y-4">
                        {/* Conversion KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Total Conversões</p>
                                <p className="text-2xl font-bold text-purple-400">{fmtNum(t.conversions)}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Valor Total</p>
                                <p className="text-2xl font-bold text-amber-400">{fmtCur(t.convValue)}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Custo/Conversão</p>
                                <p className="text-2xl font-bold text-red-400">{t.conversions > 0 ? fmtCur(t.cost / t.conversions) : '---'}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">ROAS</p>
                                <p className="text-2xl font-bold text-emerald-400">{t.cost > 0 ? (t.convValue / t.cost).toFixed(2) + 'x' : '---'}</p>
                            </div>
                        </div>

                        {/* Conversions by Device */}
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Smartphone className="w-4 h-4 text-blue-500" /> Conversões por Dispositivo</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <SegmentTable
                                    rows={deviceRows}
                                    labelFn={r => DEVICE_META[r.segment_data?.device || 'OTHER']?.label || 'Outro'}
                                    iconFn={r => DEVICE_META[r.segment_data?.device || 'OTHER']?.icon || Globe}
                                    colorFn={r => DEVICE_META[r.segment_data?.device || 'OTHER']?.color || '#6b7280'}
                                    showCpc={false}
                                />
                            </CardContent>
                        </Card>

                        {/* Conversions by Gender + Age */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-pink-500" /> Conversões por Gênero</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <SegmentTable
                                        rows={genderRows}
                                        labelFn={r => GENDER_LABELS[r.segment_data?.type || 'UNDETERMINED'] || 'N/D'}
                                        showCpc={false}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Conversões por Idade</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <SegmentTable
                                        rows={ageRows}
                                        labelFn={r => AGE_LABELS[r.segment_data?.type || ''] || 'N/D'}
                                        showCpc={false}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Conversions by Day of Week */}
                        <Card className="border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" /> Conversões por Dia da Semana</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarChartVertical
                                    rows={orderedDow}
                                    labelFn={r => DOW_LABELS[r.segment_data?.day_of_week] || ''}
                                    metricKey="conversions"
                                    color="#a855f7"
                                    topLabel={r => fmtCur(r.cost)}
                                />
                            </CardContent>
                        </Card>

                        {/* Top Converting Keywords */}
                        {keywordRows.filter(r => r.conversions > 0).length > 0 && (
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2"><Search className="w-4 h-4 text-emerald-500" /> Keywords com Conversões</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <SegmentTable
                                        rows={keywordRows.filter(r => r.conversions > 0).sort((a, b) => b.conversions - a.conversions).slice(0, 10)}
                                        labelFn={r => r.segment_data?.text || r.segment_key}
                                        showCpc
                                    />
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export { SegmentInsights };
export default SegmentInsights;
