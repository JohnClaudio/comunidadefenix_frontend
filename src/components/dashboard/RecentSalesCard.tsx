import React from 'react';
import { format, parseISO } from 'date-fns';
import { ShoppingBag, ExternalLink, ArrowRight } from 'lucide-react';
import { RecentSale } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface RecentSalesCardProps {
    title?: string;
    subtitle?: string;
    icon?: React.ElementType;
    sales: RecentSale[];
    isLoading?: boolean;
    accentColor?: 'emerald' | 'amber' | 'blue' | 'purple';
}

const colorMap = {
    emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-500',
        hoverBorder: 'hover:border-emerald-500/30',
        icon: 'text-emerald-500',
        avatarBg: 'bg-emerald-500/10',
        avatarBtn: 'border-emerald-500/20'
    },
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-500',
        hoverBorder: 'hover:border-amber-500/30',
        icon: 'text-amber-500',
        avatarBg: 'bg-amber-500/10',
        avatarBtn: 'border-amber-500/20'
    },
    blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-500',
        hoverBorder: 'hover:border-blue-500/30',
        icon: 'text-blue-500',
        avatarBg: 'bg-blue-500/10',
        avatarBtn: 'border-blue-500/20'
    },
    purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        text: 'text-purple-500',
        hoverBorder: 'hover:border-purple-500/30',
        icon: 'text-purple-500',
        avatarBg: 'bg-purple-500/10',
        avatarBtn: 'border-purple-500/20'
    }
};

export const RecentSalesCard: React.FC<RecentSalesCardProps> = ({ 
    title = "Postbacks de Vendas",
    subtitle = "Últimas conversões recebidas",
    icon: Icon = ShoppingBag,
    sales, 
    isLoading,
    accentColor = 'emerald'
}) => {
    const colors = colorMap[accentColor];

    if (isLoading) {
        return (
            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-3xl p-6 h-[450px] animate-pulse">
                <div className="h-6 w-48 bg-muted rounded mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-muted rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-3xl overflow-hidden flex flex-col h-[450px] group ring-offset-background transition-all hover:bg-card/60">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl border", colors.bg, colors.border)}>
                        <Icon className={cn("h-5 w-5", colors.icon)} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{subtitle}</p>
                    </div>
                </div>
                <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group/btn">
                    Ver tudo
                    <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {sales.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <Icon className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Nada recebido ainda</p>
                        <p className="text-xs text-muted-foreground mt-1">Seus webhooks estão prontos para receber dados em tempo real.</p>
                    </div>
                ) : (
                    sales.map((sale) => (
                        <div
                            key={sale.id}
                            className={cn(
                                "flex items-center justify-between p-3.5 rounded-2xl bg-background/50 border border-border/50 transition-all hover:shadow-sm",
                                colors.hoverBorder
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border font-bold text-xs shrink-0",
                                    colors.avatarBg,
                                    colors.avatarBtn,
                                    colors.text
                                )}>
                                    {sale.currency === 'BRL' ? 'R$' : sale.currency === 'USD' ? '$' : '€'}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black tracking-tight text-foreground truncate max-w-[120px]">
                                            {sale.amount.toLocaleString('pt-BR', { style: 'currency', currency: sale.currency })}
                                        </p>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground uppercase tracking-tighter">
                                            {sale.platform}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[11px] font-medium text-muted-foreground truncate max-w-[140px]">
                                            {sale.tracker_name}
                                        </p>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <p className="text-[10px] text-muted-foreground/70 font-semibold uppercase">
                                            ID: {sale.order_id?.slice(-6) || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1">
                                <p className="text-[11px] font-bold text-foreground">
                                    {format(parseISO(sale.created_at), 'HH:mm')}
                                </p>
                                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest leading-none">
                                    {format(parseISO(sale.created_at), 'dd/MM')}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
