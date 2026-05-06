import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecryptedText } from '@/components/DecryptedText';

export const AdGroupNode = memo(({ data, selected }: { data: any, selected?: boolean }) => {
    return (
        <div className={cn(
            "bg-card w-64 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-4 py-3 cursor-grab fade-in transition-all duration-300",
            selected ? "border-2 border-primary ring-4 ring-primary/20" : "border border-violet-500/20"
        )}>
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-violet-500 border-2 border-background"
            />

            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-violet-500 uppercase tracking-widest leading-none mb-1">Grupo de Anúncios</p>
                    <h3 className="text-sm font-bold text-foreground truncate">
                        <DecryptedText value={data.label} />
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">{data.isConnected ? 'Conectado' : 'Aguardando fluxo'}</span>
                <div className={`w-2 h-2 rounded-full ${data.isConnected ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} />
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-violet-500 border-2 border-background"
            />
        </div>
    );
});
