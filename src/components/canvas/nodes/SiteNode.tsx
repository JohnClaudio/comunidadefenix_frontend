import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecryptedText } from '@/components/DecryptedText';

export const SiteNode = ({ data, selected }: any) => {
    return (
        <div className={cn(
            "bg-card border-2 rounded-xl p-4 shadow-lg min-w-[220px] transition-all duration-300 group cursor-grab active:cursor-grabbing",
            selected ? "border-primary ring-4 ring-primary/20" : "border-border hover:border-primary/50"
        )}>
            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-primary border-2 border-background"
            />

            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:bg-orange-500/15 transition-colors">
                    <Layout className="w-5 h-5 text-orange-500" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">
                        <DecryptedText value={data.label} />
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{data.domain || 'Sem domínio'}</span>
                    </div>
                </div>
            </div>

            <div className="mt-3 px-2 py-1.5 rounded-md bg-secondary/50 border border-border/50">
                <code className="text-[10px] text-muted-foreground font-mono truncate block">
                    {data.type === 'presell' ? 'Pre-Sell' : 'Página de Vendas'}
                </code>
            </div>
        </div>
    );
};
