import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTrackers } from '@/services/api';
import { Tracker } from '@/types/tracker';

import { Search, Loader2, GripVertical, DollarSign, Tag, TrendingUp, ShoppingCart, Activity, Crosshair, Table as TableIcon, Layout, Eye, BarChart3, AlignLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DecryptedText } from '@/components/DecryptedText';

const GOOGLE_METRICS = [
    { type: 'impressions', label: 'Impressões', icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { type: 'cost', label: 'Custo', icon: DollarSign, color: 'text-red-400', bg: 'bg-red-500/10' },
    { type: 'clicks', label: 'Cliques', icon: Tag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { type: 'ctr', label: 'CTR', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { type: 'cpm', label: 'CPM', icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { type: 'gads_conversions', label: 'Conversões', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { type: 'gads_conversion_value', label: 'Valor Conversão', icon: DollarSign, color: 'text-lime-400', bg: 'bg-lime-500/10' },
    { type: 'gads_checkouts', label: 'Checkouts', icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { type: 'gads_checkout_value', label: 'Valor Checkout', icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { type: 'cost_per_result', label: 'CPA', icon: DollarSign, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { type: 'roas', label: 'ROAS', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { type: 'impression_share', label: 'Impr. Share', icon: Activity, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { type: 'top_impression_share', label: 'Top Share', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { type: 'abs_top_impression_share', label: 'Abs Top Share', icon: Crosshair, color: 'text-sky-400', bg: 'bg-sky-500/10' },
];

const SYSTEM_METRICS = [
    { type: 'sf_purchases', label: 'Vendas', icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { type: 'sf_checkouts', label: 'Checkouts', icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { type: 'sf_cost_per_checkout', label: 'Custo por Checkout', icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { type: 'page_views', label: 'Visitas', icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { type: 'passed', label: 'Passagens', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { type: 'sf_cost_per_passage', label: 'Custo por Passagem', icon: DollarSign, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { type: 'escape_rate', label: 'Taxa de Fuga', icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10' },
    { type: 'avg_time_on_page', label: 'Tempo de Sessão', icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
];

const TABLE_NODES = [
    { type: 'table', label: 'Tabela Analítica (Geral)', icon: TableIcon, color: 'text-primary', bg: 'bg-primary/10' },
    { type: 'auction_table', label: 'Tabela Leilão (Google)', icon: Crosshair, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { type: 'funnel', label: 'Funil de Vendas (Gráfico)', icon: Activity, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' },
    { type: 'segment_insights', label: 'Segment Insights', icon: Layout, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { type: 'creative', label: 'Criativos (Vídeo/Ads)', icon: Layout, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { type: 'demographics', label: 'Demografia (Idade/Gênero)', icon: Layout, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { type: 'keywords', label: 'Termos e Palavras-chave', icon: Layout, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { type: 'audiences', label: 'Públicos (Segmentos)', icon: Layout, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { type: 'daily_table', label: 'Desempenho Diário', icon: TableIcon, color: 'text-green-500', bg: 'bg-green-500/10' },
];

import { fetchGoogleAdsAccounts } from '@/services/googleAdsApi';
import { GoogleAdsAccount } from '@/types/googleAds';
import { format, subDays } from 'date-fns';

export const CanvasSidebar = ({ onInjectDefaultView }: { onInjectDefaultView?: () => void }) => {
    const { token } = useAuth();
    const [trackers, setTrackers] = useState<Tracker[]>([]);
    const [adsAccounts, setAdsAccounts] = useState<GoogleAdsAccount[]>([]);

    const [searchTracker, setSearchTracker] = useState('');

    const [isLoadingTrackers, setIsLoadingTrackers] = useState(true);
    const [isLoadingAds, setIsLoadingAds] = useState(true);

    useEffect(() => {
        if (!token) return;

        const loadTrackers = async () => {
            try {
                const res = await fetchTrackers(token);
                setTrackers(res.data.data);
            } catch (err) {
                console.error("Failed to fetch trackers in canvas sidebar", err);
            } finally {
                setIsLoadingTrackers(false);
            }
        };



        const loadAdsAccounts = async () => {
            try {
                const res = await fetchGoogleAdsAccounts(token, {
                    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                    end_date: format(new Date(), 'yyyy-MM-dd')
                });
                setAdsAccounts(res.data);
            } catch (err) {
                console.error("Failed to fetch Google Ads accounts", err);
            } finally {
                setIsLoadingAds(false);
            }
        };

        loadTrackers();
        loadAdsAccounts();
    }, [token]);

    const filteredTrackers = trackers.filter(t =>
        t.name.toLowerCase().includes(searchTracker.toLowerCase()) ||
        t.platform?.name.toLowerCase().includes(searchTracker.toLowerCase())
    );



    const onDragStart = (event: React.DragEvent, nodeType: string, nodeData: any) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/reactflow-data', JSON.stringify(nodeData));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-80 border-r border-border bg-card/50 backdrop-blur flex flex-col h-full z-10 shadow-xl">
            <div className="p-4 border-b border-border shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-foreground">Painel de Elementos</h2>
                    {onInjectDefaultView && (
                        <button
                            onClick={onInjectDefaultView}
                            className="bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                        >
                            <Layout className="w-3 h-3" />
                            Visão Padrão
                        </button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">Arraste os nós para o quadro ao lado</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">

                {/* GOOGLE METRICS SECTION */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="bg-orange-500/5 text-orange-500 border-orange-500/20">1</Badge>
                        <h3 className="text-sm font-semibold text-foreground">Métricas de Tráfego (Google)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {GOOGLE_METRICS.map((metric) => (
                            <div
                                key={metric.type}
                                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors"
                                draggable
                                onDragStart={(e) => onDragStart(e, 'metric', { metricType: metric.type, label: metric.label })}
                            >
                                <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", metric.bg)}>
                                    <metric.icon className={cn("w-3.5 h-3.5", metric.color)} />
                                </div>
                                <span className="text-xs font-medium text-foreground truncate">{metric.label}</span>
                                <GripVertical className="w-3 h-3 text-muted-foreground/30 ml-auto" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* SYSTEM METRICS SECTION */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/20">2</Badge>
                        <h3 className="text-sm font-semibold text-foreground">Métricas do Sistema (SF)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {SYSTEM_METRICS.map((metric) => (
                            <div
                                key={metric.type}
                                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background hover:border-emerald-500/50 cursor-grab active:cursor-grabbing transition-colors"
                                draggable
                                onDragStart={(e) => onDragStart(e, 'metric', { metricType: metric.type, label: metric.label })}
                            >
                                <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", metric.bg)}>
                                    <metric.icon className={cn("w-3.5 h-3.5", metric.color)} />
                                </div>
                                <span className="text-xs font-medium text-foreground truncate">{metric.label}</span>
                                <GripVertical className="w-3 h-3 text-muted-foreground/30 ml-auto" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* ANNOTATIONS SECTION */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="bg-slate-500/5 text-slate-400 border-slate-500/20">A</Badge>
                        <h3 className="text-sm font-semibold text-foreground">Anotações e Layout</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        <div
                            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:brightness-110 cursor-grab active:cursor-grabbing transition-colors group"
                            draggable
                            onDragStart={(e) => onDragStart(e, 'text', { text: '' })}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-500/10 transition-colors">
                                <AlignLeft className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-foreground truncate">Texto Livre</h4>
                                <p className="text-[10px] text-muted-foreground truncate">Arraste para usar</p>
                            </div>
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                        </div>
                    </div>
                </section>

                {/* DATA STRUCTURES SECTION */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="bg-violet-500/5 text-violet-500 border-violet-500/20">3</Badge>
                        <h3 className="text-sm font-semibold text-foreground">Estruturas de Dados</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {TABLE_NODES.map((node) => (
                            <div
                                key={node.type}
                                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:brightness-110 cursor-grab active:cursor-grabbing transition-colors group"
                                draggable
                                onDragStart={(e) => onDragStart(e, node.type, { label: node.label })}
                            >
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors", node.bg)}>
                                    <node.icon className={cn("w-4 h-4", node.color)} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-foreground truncate">{node.label}</h4>
                                    <p className="text-[10px] text-muted-foreground truncate">Arraste para usar</p>
                                </div>
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* TRACKERS SECTION */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/20">4</Badge>
                        <h3 className="text-sm font-semibold text-foreground">Trackers (Origens)</h3>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar tracker..."
                            value={searchTracker}
                            onChange={(e) => setSearchTracker(e.target.value)}
                            className="pl-9 h-8 text-xs bg-background"
                        />
                    </div>

                    <div className="space-y-2">
                        {isLoadingTrackers ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredTrackers.length === 0 ? (
                            <p className="text-xs text-center text-muted-foreground p-4 bg-background/50 rounded-lg">
                                Nenhum tracker encontrado
                            </p>
                        ) : (
                            filteredTrackers.map((tracker) => (
                                <div
                                    key={tracker.id}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:border-blue-500/30 cursor-grab active:cursor-grabbing transition-colors group"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, 'tracker', {
                                        trackerId: tracker.id,
                                        label: tracker.name,
                                        platform: tracker.platform?.name,
                                        uuid: tracker.uuid
                                    })}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                                        <Crosshair className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-semibold text-foreground truncate"><DecryptedText value={tracker.name} /></h4>
                                        <p className="text-[10px] text-muted-foreground truncate">{tracker.platform?.name || 'Sem Plataforma'}</p>
                                    </div>
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                                </div>
                            ))
                        )}
                    </div>
                </section>



                {/* GOOGLE ADS SECTION */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="bg-cyan-500/5 text-cyan-500 border-cyan-500/20">5</Badge>
                        <h3 className="text-sm font-semibold text-foreground">Google Ads</h3>
                    </div>

                    <div className="space-y-4">
                        {isLoadingAds ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : adsAccounts.length === 0 ? (
                            <p className="text-xs text-center text-muted-foreground p-4 bg-background/50 rounded-lg">
                                Nenhuma conta conectada
                            </p>
                        ) : (
                            adsAccounts.map((account) => (
                                <div key={account.id} className="space-y-2 border border-border bg-background/30 rounded-lg p-2">
                                    <div className="px-2 py-1 bg-muted/50 rounded flex justify-between items-center text-xs font-semibold">
                                        <span className="truncate"><DecryptedText value={account.name} /></span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">{account.campaigns?.length || 0} campanhas</span>
                                    </div>

                                    {account.campaigns && account.campaigns.length > 0 ? (
                                        <div className="space-y-3 pl-2 border-l-2 border-muted ml-2">
                                            {account.campaigns.map((campaign) => (
                                                <div key={campaign.id} className="space-y-1 mt-2">
                                                    {/* Campaign Draggable Item */}
                                                    <div
                                                        className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background hover:border-blue-500/30 cursor-grab active:cursor-grabbing transition-colors group"
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e, 'campaign', {
                                                            campaignId: campaign.id,
                                                            label: campaign.name,
                                                        })}
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-[11px] font-semibold text-blue-500 truncate"><DecryptedText value={campaign.name} /></h4>
                                                            <p className="text-[9px] text-muted-foreground truncate">Campanha</p>
                                                        </div>
                                                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                                                    </div>

                                                    {/* Ad Groups under the campaign */}
                                                    {campaign.ad_groups && campaign.ad_groups.length > 0 ? (
                                                        <div className="space-y-1 pl-2 border-l border-muted ml-2 mt-1">
                                                            {campaign.ad_groups.map((adGroup) => (
                                                                <div
                                                                    key={adGroup.id}
                                                                    className="flex items-center gap-2 p-1.5 rounded-md border border-border/50 bg-background/50 hover:border-violet-500/30 hover:bg-background cursor-grab active:cursor-grabbing transition-colors group"
                                                                    draggable
                                                                    onDragStart={(e) => onDragStart(e, 'adGroup', {
                                                                        adGroupId: adGroup.id,
                                                                        label: adGroup.name,
                                                                        campaignName: campaign.name,
                                                                    })}
                                                                >
                                                                    <div className="min-w-0 flex-1">
                                                                        <h4 className="text-[10px] text-foreground truncate">{adGroup.name}</h4>
                                                                    </div>
                                                                    <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[9px] text-muted-foreground pl-3 italic">Sem grupos de anúncios</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground text-center py-2">Sem campanhas ativas</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>

            </div>
        </aside>
    );
};
