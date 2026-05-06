import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
    Image, Loader2, Unplug, Eye, MousePointerClick, DollarSign,
    TrendingUp, Play, ChevronLeft, ChevronRight, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecryptedText } from '@/components/DecryptedText';
import { aggregateSegmentRows } from '@/lib/googleAdsUtils';

interface CreativeData {
    segment_key: string;
    segment_data: {
        id?: string;
        name?: string;
        type?: string;
        headlines?: string[];
        descriptions?: string[];
        youtube_video_id?: string;
    };
    extra_metrics?: {
        engagements?: number;
        engagement_rate?: number;
        interactions?: number;
        interaction_rate?: number;
        active_view_impressions?: number;
        active_view_viewability?: number;
    };
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    ctr_percent: number;
    avg_cpc: number;
    cpm: number;
}

interface CreativeNodeData {
    label?: string;
    isLoading?: boolean;
    isConnected?: boolean;
    creatives?: CreativeData[];
    sourceLabel?: string;
}

const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtShort = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return String(v);
};

const getVideoId = (creative: CreativeData): string | null => {
    // Try segment_data.id for video segments (vid:XXXXX)
    if (creative.segment_key?.startsWith('vid:')) {
        return creative.segment_key.replace('vid:', '');
    }
    // Try explicit youtube_video_id
    if (creative.segment_data?.youtube_video_id) {
        return creative.segment_data.youtube_video_id;
    }
    // Try id directly
    if (creative.segment_data?.id && creative.segment_key?.startsWith('vid:')) {
        return creative.segment_data.id;
    }
    return null;
};

export const CreativeNode: React.FC<NodeProps> = ({ data }) => {
    const { isLoading, isConnected, creatives, sourceLabel } = data as CreativeNodeData;
    const [currentIndex, setCurrentIndex] = useState(0);

    // Aggregate by ID (creatives can repeat on multiple days)
    const aggregatedCreatives = aggregateSegmentRows((creatives || []), (r) => r.segment_data?.id || r.segment_key || '');
    
    const sortedCreatives = aggregatedCreatives.sort((a, b) => b.impressions - a.impressions);
    const total = sortedCreatives.length;
    const current = sortedCreatives[currentIndex];

    const goNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % total);
    };
    const goPrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + total) % total);
    };

    return (
        <div className="bg-background border border-border rounded-xl shadow-lg w-[380px]">
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-pink-500 !border-2 !border-background" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center">
                        <Image className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-foreground">Criativos</h3>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {isConnected ? (
                                <DecryptedText value={sourceLabel || 'Conectado'} />
                            ) : 'Conecte a uma campanha'}
                        </p>
                    </div>
                    {total > 0 && (
                        <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full font-mono">
                            {currentIndex + 1}/{total}
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Unplug className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">Conecte a uma campanha</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                        <span className="ml-2 text-xs text-muted-foreground">Carregando criativos...</span>
                    </div>
                ) : total === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Image className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">Nenhum criativo encontrado</p>
                    </div>
                ) : current ? (
                    <>
                        {/* Video Embed */}
                        {(() => {
                            const videoId = getVideoId(current);
                            if (videoId) {
                                return (
                                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video nowheel">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            title={`Creative ${videoId}`}
                                        />
                                    </div>
                                );
                            }
                            // Fallback: show ad info without video
                            return (
                                <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 aspect-video">
                                    <div className="text-center">
                                        <Play className="w-8 h-8 text-muted-foreground mx-auto mb-1 opacity-40" />
                                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                            <DecryptedText value={current.segment_data?.name || current.segment_data?.headlines?.[0] || `Ad ${current.segment_data?.id || ''}`} />
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Ad Name */}
                        <p className="text-[11px] font-medium text-foreground truncate" title={current.segment_data?.name || current.segment_key}>
                            <DecryptedText value={current.segment_data?.name || current.segment_data?.headlines?.[0] || current.segment_key || ''} />
                        </p>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                            <MetricCard icon={Eye} label="Impressões" value={fmtShort(current.impressions)} color="text-blue-400" />
                            <MetricCard icon={MousePointerClick} label="Cliques" value={fmtNum(current.clicks)} color="text-emerald-400" />
                            <MetricCard icon={TrendingUp} label="CTR" value={fmtPct(current.ctr_percent)} color="text-amber-400" />
                            <MetricCard icon={DollarSign} label="Custo" value={fmtCur(current.cost)} color="text-red-400" />
                            <MetricCard icon={DollarSign} label="CPC Médio" value={fmtCur(current.avg_cpc)} color="text-orange-400" />
                            <MetricCard icon={BarChart3} label="Conversões" value={String(current.conversions)} color="text-purple-400" />
                        </div>

                        {/* Engagement Metrics (if available) */}
                        {current.extra_metrics && (current.extra_metrics.engagements || current.extra_metrics.interactions) && (
                            <div className="border-t border-border pt-2">
                                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Engajamento</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {current.extra_metrics.engagements !== undefined && (
                                        <MetricCard icon={Play} label="Engajamentos" value={fmtNum(current.extra_metrics.engagements)} color="text-pink-400" />
                                    )}
                                    {current.extra_metrics.engagement_rate !== undefined && (
                                        <MetricCard icon={TrendingUp} label="Taxa Engaj." value={fmtPct(current.extra_metrics.engagement_rate)} color="text-violet-400" />
                                    )}
                                    {current.extra_metrics.interactions !== undefined && (
                                        <MetricCard icon={MousePointerClick} label="Interações" value={fmtNum(current.extra_metrics.interactions)} color="text-cyan-400" />
                                    )}
                                    {current.extra_metrics.interaction_rate !== undefined && (
                                        <MetricCard icon={TrendingUp} label="Taxa Inter." value={fmtPct(current.extra_metrics.interaction_rate)} color="text-teal-400" />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        {total > 1 && (
                            <div className="flex items-center justify-between pt-1">
                                <button
                                    onClick={goPrev}
                                    className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <div className="flex gap-1">
                                    {sortedCreatives.slice(0, Math.min(total, 8)).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full transition-all",
                                                i === currentIndex ? "bg-pink-500 w-3" : "bg-muted-foreground/30"
                                            )}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={goNext}
                                    className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            </div>
                        )}
                    </>
                ) : null}
            </div>

            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-pink-500 !border-2 !border-background" />
        </div>
    );
};

// ─── Sub-component ──────────────────────────────────
const MetricCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
    <div className="bg-muted/30 rounded-lg p-2 space-y-0.5">
        <div className="flex items-center gap-1">
            <Icon className={cn("w-3 h-3", color)} />
            <span className="text-[8px] text-muted-foreground">{label}</span>
        </div>
        <p className={cn("text-sm font-bold", color)}>{value}</p>
    </div>
);
