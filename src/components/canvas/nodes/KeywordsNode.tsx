import { Handle, Position, NodeProps } from '@xyflow/react';
import { TextSearch, Loader2, Unplug, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentRow } from '@/types/googleAdsSegments';
import { useState } from 'react';
import { DecryptedText } from '@/components/DecryptedText';
import { aggregateSegmentRows } from '@/lib/googleAdsUtils';

const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

export const KeywordsNode = ({ data, selected }: NodeProps) => {
    const isConnected = data.isConnected as boolean;
    const isLoading = data.isLoading as boolean;
    const [tab, setTab] = useState<'search_term' | 'keyword'>('search_term');

    const segmentData = data.segmentData as Record<string, any> | undefined;
    const searchTerms = (segmentData?.search_term || []) as SegmentRow[];
    const keywords = (segmentData?.keyword || []) as SegmentRow[];

    // Aggregate search terms by term
    const aggregatedSearchTerms = aggregateSegmentRows(searchTerms, (r) => r.segment_data?.term || r.segment_data?.text || 'Desconhecido');
    // Aggregate keywords by text - support multiple common field names from different scripts
    const aggregatedKeywords = aggregateSegmentRows(keywords, (r) => 
        r.segment_data?.text || 
        r.segment_data?.keyword || 
        r.segment_data?.info?.text || 
        r.segment_data?.id || 
        'Desconhecido'
    );
    
    // Sort by impressions, descending
    const sortedSearchTerms = [...aggregatedSearchTerms].sort((a, b) => b.impressions - a.impressions).slice(0, 100);
    const sortedKeywords = [...aggregatedKeywords].sort((a, b) => b.impressions - a.impressions).slice(0, 100);

    const activeData = tab === 'search_term' ? sortedSearchTerms : sortedKeywords;

    return (
        <div className={cn(
            "bg-background border rounded-xl shadow-lg min-w-[450px] max-w-[500px] transition-all flex flex-col max-h-[500px]",
            selected ? "border-amber-500 shadow-amber-500/20" : "border-border"
        )}>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-t-xl shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <TextSearch className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Termos e Palavras-chave</h3>
                            <p className="text-[10px] text-muted-foreground">Como estão te encontrando</p>
                        </div>
                    </div>
                </div>

                {isConnected && !isLoading && (
                    <div className="flex gap-2 mt-3 p-1 bg-muted/30 rounded-lg">
                        <button
                            onClick={() => setTab('search_term')}
                            className={cn(
                                "flex-1 text-[11px] font-medium py-1 rounded-md transition-all",
                                tab === 'search_term' ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            Termos de Pesquisa
                        </button>
                        <button
                            onClick={() => setTab('keyword')}
                            className={cn(
                                "flex-1 text-[11px] font-medium py-1 rounded-md transition-all",
                                tab === 'keyword' ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            Palavras-chave (Ref)
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-0 overflow-hidden flex-1 flex flex-col">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <Unplug className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">Conecte a uma fonte</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                    </div>
                ) : (
                    <div className="overflow-auto nowheel flex-1 custom-scrollbar pb-2">
                        <table className="w-full text-left text-[11px]">
                            <thead className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 shadow-sm">
                                <tr>
                                    <th className="font-medium text-muted-foreground py-2 px-3">Termo</th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right">Imp.</th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right">Clicks</th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right">Custo</th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right">Conv.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {activeData.length > 0 ? activeData.map((row, i) => {
                                    // Extract text depending on segment type
                                    const text = tab === 'search_term'
                                        ? (row.segment_data?.term || row.segment_data?.text || 'Desconhecido')
                                        : (row.segment_data?.text || row.segment_data?.keyword || row.segment_data?.info?.text || row.segment_data?.id || 'Desconhecido');

                                    return (
                                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-2 px-3 text-foreground font-medium max-w-[150px] truncate" title={String(text)}>
                                                <DecryptedText value={String(text)} />
                                            </td>
                                            <td className="py-2 px-2 text-right text-muted-foreground">{fmtNum(row.impressions)}</td>
                                            <td className="py-2 px-2 text-right text-muted-foreground">{fmtNum(row.clicks)}</td>
                                            <td className="py-2 px-2 text-right text-red-400">{fmtCur(row.cost)}</td>
                                            <td className="py-2 px-3 text-right text-emerald-400 font-bold">{fmtNum(row.conversions)}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                                            Nenhum dado encontrado para {tab === 'search_term' ? 'termos de pesquisa' : 'palavras-chave'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
