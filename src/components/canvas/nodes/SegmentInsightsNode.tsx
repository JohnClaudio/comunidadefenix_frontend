import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
    Smartphone, Monitor, Tv, Tablet, Users, BarChart3,
    Calendar, Globe, Loader2, Unplug, Search, Play, TrendingUp, DollarSign, Image
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentRow } from '@/types/googleAdsSegments';
import { DecryptedText } from '@/components/DecryptedText';
import { aggregateSegmentRows } from '@/lib/googleAdsUtils';

interface SegmentInsightsNodeData {
    label?: string;
    isLoading?: boolean;
    isConnected?: boolean;
    segmentData?: Record<string, SegmentRow[]>;
    funnelData?: any;
}

const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtShort = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return fmtNum(v);
};

const DEVICE_COLORS: Record<string, string> = {
    MOBILE: '#3b82f6', DESKTOP: '#8b5cf6', TABLET: '#f59e0b', CONNECTED_TV: '#10b981',
};
const DEVICE_LABELS: Record<string, string> = {
    MOBILE: 'Mobile', DESKTOP: 'Desktop', TABLET: 'Tablet', CONNECTED_TV: 'TV',
};
const DEVICE_ICONS: Record<string, React.ElementType> = {
    MOBILE: Smartphone, DESKTOP: Monitor, TABLET: Tablet, CONNECTED_TV: Tv,
};
const GENDER_LABELS: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Feminino', UNDETERMINED: 'N/D' };
const GENDER_COLORS: Record<string, string> = { MALE: '#3b82f6', FEMALE: '#ec4899', UNDETERMINED: '#6b7280' };
const AGE_LABELS: Record<string, string> = {
    AGE_RANGE_18_24: '18-24', AGE_RANGE_25_34: '25-34', AGE_RANGE_35_44: '35-44',
    AGE_RANGE_45_54: '45-54', AGE_RANGE_55_64: '55-64', AGE_RANGE_65_UP: '65+', AGE_RANGE_UNDETERMINED: 'N/D',
};
const DOW_LABELS: Record<string, string> = {
    MONDAY: 'Seg', TUESDAY: 'Ter', WEDNESDAY: 'Qua',
    THURSDAY: 'Qui', FRIDAY: 'Sex', SATURDAY: 'Sáb', SUNDAY: 'Dom',
};

export const SegmentInsightsNode: React.FC<NodeProps> = ({ data }) => {
    const { isLoading, isConnected, segmentData, funnelData } = data as SegmentInsightsNodeData;

    const devices = aggregateSegmentRows((segmentData?.device || []) as SegmentRow[], (r) => r.segment_data?.device || 'OTHER');
    const genders = aggregateSegmentRows((segmentData?.gender || []) as SegmentRow[], (r) => r.segment_data?.type || 'UNDETERMINED');
    const ages = aggregateSegmentRows((segmentData?.age_range || []) as SegmentRow[], (r) => r.segment_data?.type || 'AGE_RANGE_UNDETERMINED');
    const keywords = aggregateSegmentRows((segmentData?.keyword || []) as SegmentRow[], (r) => r.segment_data?.text || r.segment_key);
    const placements = aggregateSegmentRows((segmentData?.placement || []) as SegmentRow[], (r) => r.segment_data?.url || r.segment_data?.name || 'Placement');
    const daysOfWeek = aggregateSegmentRows((segmentData?.day_of_week || []) as SegmentRow[], (r) => r.segment_data?.day_of_week || 'UNKNOWN');
    const ads = aggregateSegmentRows((segmentData?.ad || []) as SegmentRow[], (r) => r.segment_data?.id || r.segment_key);

    // True totals from backend Funnel Data (supports multi-source accurately)
    const totalImp = funnelData?.impressions || devices.reduce((s, r) => s + Number(r.impressions || 0), 0);
    const totalClicks = funnelData?.clicks || devices.reduce((s, r) => s + Number(r.clicks || 0), 0);
    // funnelData cost is not explicitly stored under 'cost', but checkouts/purchases might vary
    // We will use funnelData if available, otherwise sum segments safely.
    // Notice: StoryboardCanvas doesn't pass 'cost' in funnelData directly, it passes 'investment' potentially. Let's rely on segment sum safely casted if needed!
    // Wait, let's use accurate safe sums for segment visual proportions:
    const safeTotalImp = devices.reduce((s, r) => s + Number(r.impressions || 0), 0);
    const safeTotalClicks = devices.reduce((s, r) => s + Number(r.clicks || 0), 0);
    const safeTotalCost = funnelData?.cost !== undefined ? funnelData.cost : devices.reduce((s, r) => s + Number(r.cost || 0), 0);
    const safeTotalConv = funnelData?.conversions !== undefined ? funnelData.conversions : devices.reduce((s, r) => s + Number(r.conversions || 0), 0);
    const safeTotalConvValue = funnelData?.conversion_value !== undefined ? funnelData.conversion_value : devices.reduce((s, r) => s + Number(r.conversion_value || 0), 0);

    return (
        <div className="bg-background border border-border rounded-xl shadow-lg min-w-[360px] max-w-[420px]">
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-violet-500 !border-2 !border-background" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Segment Insights</h3>
                        <p className="text-[10px] text-muted-foreground">Análise completa de segmentos</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto nowheel">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Unplug className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">Conecte a uma campanha</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                        <span className="ml-2 text-xs text-muted-foreground">Carregando...</span>
                    </div>
                ) : (
                    <>
                        {/* ═══ Summary KPI Cards ═══ */}
                        <div className="grid grid-cols-5 gap-1.5">
                            <MiniKpi label="Impressões" value={fmtShort(totalImp || safeTotalImp)} color="text-blue-400" />
                            <MiniKpi label="Cliques" value={fmtShort(totalClicks || safeTotalClicks)} color="text-emerald-400" />
                            <MiniKpi label="Custo" value={fmtCur(safeTotalCost)} color="text-red-400" />
                            <MiniKpi label="Conversões" value={fmtNum(funnelData?.conversions || safeTotalConv)} color="text-purple-400" />
                            <MiniKpi label="Valor Conv." value={fmtCur(safeTotalConvValue)} color="text-amber-400" />
                        </div>

                        {/* ═══ Dispositivos ═══ */}
                        {devices.length > 0 && (
                            <Section title="Dispositivos" icon={Smartphone}>
                                {devices.slice(0, 4).map(r => {
                                    const dev = r.segment_data?.device || 'OTHER';
                                    const DevIcon = DEVICE_ICONS[dev] || Globe;
                                    const pct = safeTotalImp > 0 ? (Number(r.impressions || 0) / safeTotalImp) * 100 : 0;
                                    return (
                                        <div key={r.segment_key} className="flex items-center gap-1.5 text-[10px]">
                                            <DevIcon className="w-3 h-3 shrink-0" style={{ color: DEVICE_COLORS[dev] || '#6b7280' }} />
                                            <span className="w-12 truncate text-foreground font-medium">{DEVICE_LABELS[dev] || dev}</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: DEVICE_COLORS[dev] || '#6b7280' }} />
                                            </div>
                                            <span className="w-10 text-right text-muted-foreground">{fmtPct(pct)}</span>
                                            <span className="w-14 text-right text-red-400">{fmtCur(r.cost)}</span>
                                            <span className="w-8 text-right text-purple-400">{r.conversions}</span>
                                        </div>
                                    );
                                })}
                                <div className="flex justify-between text-[8px] text-muted-foreground px-5 mt-0.5">
                                    <span></span><span></span><span></span><span>Share</span><span>Custo</span><span>Conv.</span>
                                </div>
                            </Section>
                        )}

                        {/* ═══ Gênero ═══ */}
                        {genders.length > 0 && (
                            <Section title="Gênero" icon={Users}>
                                <div className="grid grid-cols-3 gap-1">
                                    {genders.slice(0, 3).map(r => {
                                        const type = r.segment_data?.type || 'N/D';
                                        const totalG = genders.reduce((s, g) => s + Number(g.impressions || 0), 0);
                                        const pct = totalG > 0 ? (Number(r.impressions || 0) / totalG) * 100 : 0;
                                        return (
                                            <div key={r.segment_key} className="bg-muted/40 rounded-lg p-2 text-center space-y-0.5">
                                                <p className="text-[9px] text-muted-foreground">{GENDER_LABELS[type] || type}</p>
                                                <p className="text-sm font-bold" style={{ color: GENDER_COLORS[type] || '#6b7280' }}>{fmtPct(pct)}</p>
                                                <div className="flex justify-between text-[8px] text-muted-foreground">
                                                    <span className="text-red-400">{fmtCur(r.cost)}</span>
                                                    <span className="text-purple-400">{r.conversions} conv</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Section>
                        )}

                        {/* ═══ Faixa Etária ═══ */}
                        {ages.length > 0 && (
                            <Section title="Faixa Etária" icon={BarChart3}>
                                <div className="space-y-1">
                                    {ages.slice(0, 7).map(r => {
                                        const type = r.segment_data?.type || '';
                                        const maxCost = Math.max(...ages.map(a => a.cost), 1);
                                        const barW = (r.cost / maxCost) * 100;
                                        return (
                                            <div key={r.segment_key} className="flex items-center gap-1.5 text-[10px]">
                                                <span className="w-10 text-muted-foreground font-medium">{AGE_LABELS[type] || type}</span>
                                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full rounded-full bg-blue-500/70 transition-all" style={{ width: `${barW}%` }} />
                                                </div>
                                                <span className="w-14 text-right text-red-400">{fmtCur(r.cost)}</span>
                                                <span className="w-10 text-right text-emerald-400">{fmtNum(r.clicks)}</span>
                                                <span className="w-6 text-right text-purple-400">{r.conversions}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between text-[8px] text-muted-foreground px-11 mt-0.5">
                                        <span></span><span>Custo</span><span>Cliques</span><span>Conv.</span>
                                    </div>
                                </div>
                            </Section>
                        )}

                        {/* ═══ Dia da Semana ═══ */}
                        {daysOfWeek.length > 0 && (
                            <Section title="Dia da Semana" icon={Calendar}>
                                {(() => {
                                    const orderedDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
                                    const ordered = orderedDays.map(d => daysOfWeek.find(r => r.segment_data?.day_of_week === d)).filter(Boolean) as SegmentRow[];
                                    const maxCost = Math.max(...ordered.map(r => r.cost), 1);
                                    return (
                                        <div className="flex items-end gap-1 h-14">
                                            {ordered.map(r => {
                                                const day = r.segment_data?.day_of_week;
                                                const barH = (r.cost / maxCost) * 100;
                                                return (
                                                    <div key={r.segment_key} className="flex-1 flex flex-col items-center gap-0.5" title={`${DOW_LABELS[day]}: ${fmtCur(r.cost)} | ${r.clicks} cliques | ${r.conversions} conv`}>
                                                        <span className="text-[7px] text-purple-400 font-mono">{r.conversions}</span>
                                                        <div className="w-full flex items-end" style={{ height: '32px' }}>
                                                            <div className="w-full rounded-t-sm bg-gradient-to-t from-orange-500/80 to-orange-400/40 transition-all" style={{ height: `${Math.max(barH, 4)}%`, minHeight: '2px' }} />
                                                        </div>
                                                        <span className="text-[8px] text-muted-foreground font-semibold">{DOW_LABELS[day] || ''}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </Section>
                        )}

                        {/* ═══ Top Keywords ═══ */}
                        {keywords.length > 0 && (
                            <Section title="Top Keywords" icon={Search}>
                                <div className="space-y-1">
                                    {keywords.slice(0, 5).map((r, i) => (
                                        <div key={r.segment_key} className={cn("flex items-center gap-1.5 text-[10px] p-1 rounded", i === 0 && "bg-emerald-500/5")}>
                                            <span className="w-4 text-muted-foreground font-mono">{i + 1}</span>
                                            <span className="flex-1 truncate text-foreground font-medium" title={r.segment_data?.text}>
                                                <DecryptedText value={r.segment_data?.text || r.segment_key || ''} />
                                            </span>
                                            <span className="w-10 text-right text-emerald-400">{fmtNum(r.clicks)}</span>
                                            <span className="w-14 text-right text-red-400">{fmtCur(r.cost)}</span>
                                            <span className="w-6 text-right text-purple-400">{r.conversions}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-[8px] text-muted-foreground">
                                        <span></span><span></span><span>Cliques</span><span>Custo</span><span>Conv.</span>
                                    </div>
                                </div>
                            </Section>
                        )}

                        {/* ═══ Top Placements ═══ */}
                        {placements.length > 0 && (
                            <Section title="Top Placements" icon={Play}>
                                <div className="space-y-1">
                                    {placements.slice(0, 4).map(r => (
                                        <div key={r.segment_key} className="flex items-center gap-1.5 text-[10px]">
                                            <Play className="w-2.5 h-2.5 text-red-500 shrink-0" />
                                            <span className="flex-1 truncate text-foreground" title={r.segment_data?.name || r.segment_data?.url}>
                                                {r.segment_data?.name || r.segment_data?.url || 'Placement'}
                                            </span>
                                            <span className="w-10 text-right text-emerald-400">{fmtNum(r.clicks)}</span>
                                            <span className="w-14 text-right text-red-400">{fmtCur(r.cost)}</span>
                                            <span className="w-6 text-right text-purple-400">{r.conversions}</span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* ═══ Criativos (Ads) ═══ */}
                        {ads.length > 0 && (
                            <Section title={`Criativos (${ads.length})`} icon={Image}>
                                <div className="space-y-1">
                                    {/* Header */}
                                    <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground font-semibold px-1">
                                        <span className="w-4">#</span>
                                        <span className="flex-1">Anúncio</span>
                                        <span className="w-10 text-right">Impr.</span>
                                        <span className="w-10 text-right">Cliques</span>
                                        <span className="w-14 text-right">Custo</span>
                                        <span className="w-10 text-right">CTR</span>
                                        <span className="w-6 text-right">Conv.</span>
                                    </div>
                                    {ads
                                        .sort((a, b) => b.cost - a.cost)
                                        .slice(0, 8)
                                        .map((r, i) => {
                                            const adName = r.segment_data?.name || r.segment_data?.headlines?.[0] || `Ad ${r.segment_data?.id || r.segment_key}`;
                                            const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
                                            return (
                                                <div key={r.segment_key} className={cn("flex items-center gap-1.5 text-[10px] p-1 rounded", i === 0 && "bg-violet-500/5")}>
                                                    <span className="w-4 text-muted-foreground font-mono text-[9px]">{i + 1}</span>
                                                    <span className="flex-1 truncate text-foreground font-medium" title={adName}>
                                                        <DecryptedText value={adName} />
                                                    </span>
                                                    <span className="w-10 text-right text-blue-400">{fmtShort(r.impressions)}</span>
                                                    <span className="w-10 text-right text-emerald-400">{fmtNum(r.clicks)}</span>
                                                    <span className="w-14 text-right text-red-400">{fmtCur(r.cost)}</span>
                                                    <span className="w-10 text-right text-amber-400">{fmtPct(ctr)}</span>
                                                    <span className="w-6 text-right text-purple-400">{r.conversions}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </Section>
                        )}
                    </>
                )}
            </div>

            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-violet-500 !border-2 !border-background" />
        </div>
    );
};

// ─── Reusable Sub-Components ──────────────────────────────────

const MiniKpi: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="bg-muted/30 rounded-md p-1.5 text-center">
        <p className="text-[7px] text-muted-foreground leading-tight">{label}</p>
        <p className={cn("text-[10px] font-bold leading-tight mt-0.5", color)}>{value}</p>
    </div>
);

const Section: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="space-y-1.5 pt-1 border-t border-border/30">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Icon className="w-3 h-3" /> {title}
        </h4>
        {children}
    </div>
);
