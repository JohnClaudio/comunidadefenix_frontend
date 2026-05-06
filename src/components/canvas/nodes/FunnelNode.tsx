import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { SalesFunnel } from '@/components/dashboard/SalesFunnel';
import { DecryptedText } from '@/components/DecryptedText';

export const FunnelNode = ({ data, selected }: any) => {
    const isConnected = data.isConnected;

    // Provide default zeros if no data is passed to the funnel
    const fallbackData = {
        visitors: 0,
        checkouts: 0,
        purchases: 0,
        refunds: 0,
        impressions: 0,
        clicks: 0,
        gadsCheckouts: 0,
        conversions: 0,
    };

    const funnelProps = data.funnelData || fallbackData;

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

            {/* Header info about the connection */}
            <div className={cn(
                "p-3 border-b border-border flex flex-col gap-1 text-center justify-center",
                isConnected ? "bg-primary/5" : "bg-muted/50"
            )}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                    {isConnected ? `Conectado a Origem:` : 'Aguardando origem'}
                </p>
                {isConnected && (
                    <span className="text-sm font-bold text-primary">
                        <DecryptedText value={data.sourceLabel || ''} />
                    </span>
                )}
            </div>

            {/* Funnel Content */}
            <div className="p-5 relative">
                {!isConnected && (
                    <div className="absolute inset-0 z-10 backdrop-blur-sm bg-background/50 flex items-center justify-center rounded-b-xl border-t border-border">
                        <p className="text-sm text-center text-muted-foreground font-medium px-8">
                            Arraste a linha de origem de uma Campanha, Tracker ou Página até este nó para preencher o funil automaticamente.
                        </p>
                    </div>
                )}
                <div className={cn("transition-opacity", !isConnected && "opacity-20 blur-sm pointer-events-none grayscale")}>
                    <SalesFunnel {...funnelProps} />
                </div>
            </div>
        </div>
    );
};
