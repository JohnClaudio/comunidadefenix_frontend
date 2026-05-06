import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Table as TableIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DecryptedText } from '@/components/DecryptedText';

export const TableNode = ({ data, selected }: any) => {
    const isConnected = data.isConnected;
    const tableData: any[] = data.tableData || [];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatDate = (dateStr: string) => {
        try {
            return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className={cn(
            "bg-card border-2 rounded-xl shadow-lg min-w-[500px] overflow-hidden transition-all duration-300",
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

            {/* Header */}
            <div className={cn(
                "p-4 border-b border-border flex items-center justify-between",
                isConnected ? "bg-primary/5" : "bg-muted/50"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        isConnected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        <TableIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground text-sm">Tabela Analítica (Diário)</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isConnected ? (
                                <div className="flex items-center gap-1">
                                    <span>Conectado a:</span>
                                    <DecryptedText value={data.sourceLabel || 'Origem'} />
                                </div>
                            ) : 'Aguardando conexão...'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-0">
                {!isConnected ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center bg-background/50">
                        <p className="text-sm text-muted-foreground">Arraste uma linha de um Tracker ou Página<br />para visualizar os dados em tabela.</p>
                    </div>
                ) : tableData.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        Nenhum dado encontrado para o período selecionado.
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-auto nodrag nowheel border-t border-border/50">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Data</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Custo</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Cliques</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Eventos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-card">
                                {tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-foreground font-medium">{formatDate(row.day)}</td>
                                        <td className="px-4 py-3 text-red-400 text-right">{formatCurrency(row.cost)}</td>
                                        <td className="px-4 py-3 text-blue-400 text-right">{row.clicks.toLocaleString('pt-BR')}</td>
                                        <td className="px-4 py-3 text-emerald-400 text-right font-semibold">
                                            {row.conversions || row.purchases || row.events || 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
