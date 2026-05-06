import React, { useState, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Table as TableIcon, Unplug, Loader2, CalendarDays, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { DecryptedText } from '@/components/DecryptedText';

const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

type SortKey = 'date' | 'sourceName' | 'status' | 'impressions' | 'clicks' | 'cost' | 'conversions' | 'checkouts' | 'conversion_value' | 'cpm' | 'ctr' | 'roas' | 'impr_share' | 'top_impr_share' | 'abs_top_share' | 'budget' | 'target_cpa';

export const DailyTableNode: React.FC<NodeProps> = ({ data, selected }) => {
    const isConnected = data.isConnected as boolean;
    const isLoading = data.isLoading as boolean;
    const rawData = (data.tableData as any[]) || [];
    const sourceLabel = data.sourceLabel as string;

    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc'
    });

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedData = useMemo(() => {
        const sorted = [...rawData];
        sorted.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Normalize numeric values for comparison
            if (['impressions', 'clicks', 'cost', 'conversions', 'checkouts', 'conversion_value', 'cpm', 'ctr', 'roas', 'impr_share', 'top_impr_share', 'abs_top_share', 'budget', 'target_cpa'].includes(sortConfig.key)) {
                // Derived metrics
                if (sortConfig.key === 'cpm') {
                    valA = Number(a.impressions) > 0 ? (Number(a.cost) / Number(a.impressions)) * 1000 : 0;
                    valB = Number(b.impressions) > 0 ? (Number(b.cost) / Number(b.impressions)) * 1000 : 0;
                } else if (sortConfig.key === 'ctr') {
                    valA = Number(a.impressions) > 0 ? (Number(a.clicks) / Number(a.impressions)) * 100 : 0;
                    valB = Number(b.impressions) > 0 ? (Number(b.clicks) / Number(b.impressions)) * 100 : 0;
                } else if (sortConfig.key === 'roas') {
                    valA = Number(a.cost) > 0 ? Number(a.conversion_value) / Number(a.cost) : 0;
                    valB = Number(b.cost) > 0 ? Number(b.conversion_value) / Number(b.cost) : 0;
                } else {
                    valA = Number(valA || 0);
                    valB = Number(valB || 0);
                }
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [rawData, sortConfig]);

    const RenderSortIcon = ({ k }: { k: SortKey }) => {
        if (sortConfig.key !== k) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline" /> : <ArrowDown className="w-3 h-3 ml-1 inline" />;
    };

    return (
        <div className={cn(
            "bg-background border rounded-xl shadow-lg min-w-[1200px] transition-all flex flex-col max-h-[600px]",
            selected ? "border-green-500 shadow-green-500/20" : "border-border"
        )}>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-green-500 !border-2 !border-background" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-xl shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-foreground">Tabela de Desempenho Diário</h3>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {isConnected ? (
                                <DecryptedText value={sourceLabel || 'Conectado'} />
                            ) : 'Conecte a uma fonte'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-0 overflow-hidden flex-1 flex flex-col">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <Unplug className="w-8 h-8 mb-3 opacity-50" />
                        <p className="text-sm">Conecte a fontes para ver os dados diários</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 mb-2 animate-spin text-green-500" />
                        <span className="text-xs text-muted-foreground">Carregando dados diários...</span>
                    </div>
                ) : sortedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <TableIcon className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">Sem dados no período</p>
                    </div>
                ) : (
                    <div className="overflow-auto nowheel flex-1 custom-scrollbar pb-2">
                        <table className="w-full text-left text-[12px]">
                            <thead className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 shadow-sm">
                                <tr>
                                    <th className="font-medium text-muted-foreground py-2 px-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('date')}>
                                        Data <RenderSortIcon k="date" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 cursor-pointer hover:text-foreground" onClick={() => handleSort('status')}>
                                        Status <RenderSortIcon k="status" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 cursor-pointer hover:text-foreground" onClick={() => handleSort('sourceName')}>
                                        Campanha/Grupo <RenderSortIcon k="sourceName" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('cost')}>
                                        Custo <RenderSortIcon k="cost" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('conversions')}>
                                        Conv. <RenderSortIcon k="conversions" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right">CPA</th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('roas')}>
                                        ROAS <RenderSortIcon k="roas" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('conversion_value')}>
                                        Valor Conv. <RenderSortIcon k="conversion_value" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('checkouts')}>
                                        Checkouts <RenderSortIcon k="checkouts" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('impressions')}>
                                        Imp. <RenderSortIcon k="impressions" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('clicks')}>
                                        Cliques <RenderSortIcon k="clicks" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('ctr')}>
                                        CTR <RenderSortIcon k="ctr" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('cpm')}>
                                        CPM <RenderSortIcon k="cpm" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('impr_share')}>
                                        Parc. Impr. <RenderSortIcon k="impr_share" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('top_impr_share')}>
                                        Parc. Topo <RenderSortIcon k="top_impr_share" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right">Topo Abs.</th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('budget')}>
                                        Orçamento <RenderSortIcon k="budget" />
                                    </th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('target_cpa')}>
                                        Meta CPA <RenderSortIcon k="target_cpa" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {sortedData.map((row, i) => {
                                    const imp = Number(row.impressions || 0);
                                    const clicks = Number(row.clicks || 0);
                                    const cost = Number(row.cost || 0);
                                    const convs = Number(row.conversions || 0);
                                    const checkouts = Number(row.checkouts || 0);
                                    const val = Number(row.conversion_value || 0);
                                    const sourceName = row.sourceName || '-';
                                    const status = row.status || 'Ativa'; // Mock or from API
                                    
                                    const cpc = clicks > 0 ? cost / clicks : 0;
                                    const cpa = convs > 0 ? cost / convs : 0;
                                    const ctr = imp > 0 ? (clicks / imp) * 100 : 0;
                                    const cpm = imp > 0 ? (cost / imp) * 1000 : 0;
                                    const roas = cost > 0 ? val / cost : 0;
                                    
                                    const budget = Number(row.snapshot_budget_daily || row.budget || 0);
                                    const meta = Number(row.snapshot_target_cpa || row.target_cpa || 0);

                                    // Determinar cor da linha (Lucro/Prejuízo)
                                    let rowClass = "hover:bg-muted/30 transition-colors";
                                    if (convs > 0) {
                                        if (cost <= val) {
                                            rowClass = "bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-300";
                                        } else {
                                            rowClass = "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
                                        }
                                    }

                                    return (
                                        <tr key={row.date + '-' + sourceName + '-' + i} className={rowClass}>
                                            <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                                                {row.date ? format(parseISO(row.date), 'dd/MM/yyyy') : '-'}
                                            </td>
                                            <td className="py-2 px-2">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                                    status === 'Ativa' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                                )}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2 truncate max-w-[150px]" title={sourceName}>
                                                <DecryptedText value={sourceName} />
                                            </td>
                                            <td className="py-2.5 px-2 text-right font-mono text-foreground">{fmtCur(cost)}</td>
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground text-sm">{fmtNum(convs)}</td>
                                            <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">{fmtCur(cpa)}</td>
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">{roas.toFixed(2)}x</td>
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">{fmtCur(val)}</td>
                                            <td className="py-2.5 px-3 text-right font-mono text-foreground/80">{fmtNum(checkouts)}</td>
                                            <td className="py-2.5 px-2 text-right font-mono text-foreground/70">{fmtNum(imp)}</td>
                                            <td className="py-2.5 px-2 text-right font-mono text-foreground/70">{fmtNum(clicks)}</td>
                                            <td className="py-2.5 px-3 text-right font-mono text-foreground font-medium">{ctr.toFixed(2)}%</td>
                                            <td className="py-2.5 px-3 text-right font-mono text-foreground font-medium">{fmtCur(cpm)}</td>
                                            <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{(Number(row.impr_share) || 0).toFixed(1)}%</td>
                                            <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{(Number(row.top_impr_share) || 0).toFixed(1)}%</td>
                                            <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{(Number(row.abs_top_share) || 0).toFixed(1)}%</td>
                                            <td className="py-2.5 px-3 text-right font-mono text-blue-500 font-semibold">{budget > 0 ? fmtCur(budget) : '-'}</td>
                                            <td className="py-2.5 px-3 text-right font-mono text-orange-500 font-semibold">{meta > 0 ? fmtCur(meta) : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
