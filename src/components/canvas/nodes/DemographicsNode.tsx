import { Handle, Position, NodeProps } from '@xyflow/react';
import { Users, Loader2, Unplug, Clock, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentRow } from '@/types/googleAdsSegments';
import { aggregateSegmentRows } from '@/lib/googleAdsUtils';

const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const fmtPct = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(v / 100);

const GENDER_LABELS: Record<string, string> = { MALE: 'Masc', FEMALE: 'Fem', UNDETERMINED: 'N/D' };
const GENDER_COLORS: Record<string, string> = { MALE: '#60a5fa', FEMALE: '#f472b6', UNDETERMINED: '#9ca3af' };
const AGE_LABELS: Record<string, string> = {
    AGE_RANGE_18_24: '18-24', AGE_RANGE_25_34: '25-34', AGE_RANGE_35_44: '35-44',
    AGE_RANGE_45_54: '45-54', AGE_RANGE_55_64: '55-64', AGE_RANGE_65_UP: '65+', AGE_RANGE_UNDETERMINED: 'N/D'
};

export const DemographicsNode = ({ data, selected }: NodeProps) => {
    const isConnected = data.isConnected as boolean;
    const isLoading = data.isLoading as boolean;

    // We only expect gender and age_range here
    const segmentData = data.segmentData as Record<string, any> | undefined;
    const genders = (segmentData?.gender || []) as SegmentRow[];
    const ages = (segmentData?.age_range || []) as SegmentRow[];

    // Aggregate by segment type before sorting
    const aggregatedGenders = aggregateSegmentRows(genders, (r) => r.segment_data?.type || 'UNDETERMINED');
    const aggregatedAges = aggregateSegmentRows(ages, (r) => r.segment_data?.type || 'AGE_RANGE_UNDETERMINED');
    
    // Sort by impressions
    const sortedGenders = [...aggregatedGenders].sort((a, b) => b.impressions - a.impressions);
    const sortedAges = [...aggregatedAges].sort((a, b) => b.impressions - a.impressions);

    return (
        <div className={cn(
            "bg-background border rounded-xl shadow-lg min-w-[340px] max-w-[400px] transition-all",
            selected ? "border-pink-500 shadow-pink-500/20" : "border-border"
        )}>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-pink-500 !border-2 !border-background" />

            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-pink-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Demografia</h3>
                        <p className="text-[10px] text-muted-foreground">Idade e Gênero</p>
                    </div>
                </div>
            </div>

            <div className="p-3">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <Unplug className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">Conecte a uma fonte</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto nowheel pr-1">

                        {/* Gênero */}
                        {sortedGenders.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" /> Gênero
                                </h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {sortedGenders.map(r => {
                                        const type = r.segment_data?.type || 'UNDETERMINED';
                                        const totalG = genders.reduce((s, g) => s + Number(g.impressions || 0), 0);
                                        const pct = totalG > 0 ? (Number(r.impressions || 0) / totalG) * 100 : 0;
                                        return (
                                            <div key={r.segment_key} className="bg-muted/40 rounded-2xl p-3 text-center border border-border/50 flex flex-col items-center gap-1 hover:bg-muted/60 transition-colors">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{GENDER_LABELS[type] || type}</p>
                                                <p className="text-lg font-black" style={{ color: GENDER_COLORS[type] || '#6b7280' }}>
                                                    {fmtPct(pct)}
                                                </p>
                                                <div className="flex flex-col items-center gap-0.5 mt-1 pt-2 border-t border-border/50 w-full opacity-90">
                                                    <span className="text-[9px] font-bold text-rose-500 whitespace-nowrap">{fmtCur(r.cost)}</span>
                                                    <span className="text-[9px] font-bold text-emerald-500 whitespace-nowrap">{r.conversions} Conv.</span>
                                                    <span className="text-[10px] font-bold text-foreground mt-0.5">{fmtCur(r.conversion_value)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Faixa Etária */}
                        {sortedAges.length > 0 && (
                            <div className="space-y-3 pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> Faixa Etária
                                    </h4>
                                    <div className="flex gap-4 text-[9px] font-bold text-muted-foreground uppercase opacity-70">
                                        <span className="w-12 text-right">Custo</span>
                                        <span className="w-8 text-right">Conv.</span>
                                        <span className="w-12 text-right">Valor</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {sortedAges.map(r => {
                                        const type = r.segment_data?.type || 'AGE_RANGE_UNDETERMINED';
                                        const totalA = ages.reduce((s, a) => s + Number(a.impressions || 0), 0);
                                        const pct = totalA > 0 ? (Number(r.impressions || 0) / totalA) * 100 : 0;
                                        return (
                                            <div key={r.segment_key} className="group flex flex-col gap-1.5 p-2 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-border/60">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[12px] font-bold text-foreground w-14">{AGE_LABELS[type] || type}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-mono font-bold text-foreground">{fmtPct(pct)}</span>
                                                        <span className="text-[10px] font-medium text-rose-500 w-12 text-right">{fmtCur(r.cost)}</span>
                                                        <span className="text-[10px] font-bold text-emerald-500 w-8 text-right">{r.conversions}</span>
                                                        <span className="text-[10px] font-bold text-foreground w-12 text-right">{fmtCur(r.conversion_value)}</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-background/50 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${pct}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {sortedGenders.length === 0 && sortedAges.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground py-4">
                                Nenhum dado demográfico encontrado
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
