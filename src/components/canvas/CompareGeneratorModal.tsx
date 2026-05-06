import React, { useState, useEffect } from 'react';
import { Tracker } from '@/types/tracker';
import { Eye, DollarSign, Tag, Activity, BarChart3, TrendingUp, ShoppingCart, ArrowRight, CheckCircle2, Layers, Lightbulb, X, ChevronsUpDown, Check, Plus, Trash2, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { fetchGoogleAdsAccounts } from '@/services/googleAdsApi';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';
import { DecryptedText } from '@/components/DecryptedText';

const GOOGLE_METRICS = [
    { type: 'impressions', label: 'Impressões', icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { type: 'cost', label: 'Custo', icon: DollarSign, color: 'text-red-400', bg: 'bg-red-500/10' },
    { type: 'clicks', label: 'Cliques', icon: Tag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { type: 'ctr', label: 'CTR', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { type: 'cpc', label: 'CPC Méd.', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { type: 'cpm', label: 'CPM', icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { type: 'gads_conversions', label: 'Conversões', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { type: 'gads_conversion_value', label: 'Valor Conv.', icon: DollarSign, color: 'text-lime-400', bg: 'bg-lime-500/10' },
    { type: 'gads_checkouts', label: 'G-Checkouts', icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { type: 'gads_checkout_value', label: 'Val. Checkout', icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { type: 'cost_per_result', label: 'CPA', icon: DollarSign, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { type: 'conversion_rate', label: 'Taxa Conv.', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { type: 'roas', label: 'ROAS', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { type: 'impression_share', label: 'Impr. Share', icon: Activity, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { type: 'top_impression_share', label: 'Top Share', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { type: 'abs_top_impression_share', label: 'Abs Top Share', icon: Crosshair, color: 'text-sky-400', bg: 'bg-sky-500/10' },
];

const SYSTEM_METRICS = [
    { type: 'sf_purchases', label: 'Vendas Sist.', icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { type: 'sf_checkouts', label: 'Checkouts', icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { type: 'sf_cost_per_checkout', label: 'Custo Check.', icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { type: 'page_views', label: 'Visitas Reais', icon: Eye, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { type: 'passed', label: 'Passagens', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { type: 'sf_cost_per_passage', label: 'Custo Passagem', icon: DollarSign, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { type: 'escape_rate', label: 'Fuga Real', icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10' },
    { type: 'avg_time_on_page', label: 'Tempo Sessão', icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
];

export interface CompareSource {
    id: string;
    type: 'tracker' | 'campaign';
    name: string;
    group: string;
}

export const CompareGeneratorModal = ({
    isOpen,
    onClose,
    trackers,
    onGenerate
}: {
    isOpen: boolean;
    onClose: () => void;
    trackers: Tracker[];
    onGenerate: (sources: CompareSource[], metrics: string[]) => void;
}) => {
    const { token } = useAuth();
    const [step, setStep] = useState(1);
    const [selectedSources, setSelectedSources] = useState<(CompareSource | null)[]>([null, null]);
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

    const [adsAccounts, setAdsAccounts] = useState<any[]>([]);
    const [isLoadingAds, setIsLoadingAds] = useState(false);

    useEffect(() => {
        if (!isOpen || !token) return;
        setIsLoadingAds(true);
        fetchGoogleAdsAccounts(token, {
            start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
            end_date: format(new Date(), 'yyyy-MM-dd')
        }).then(res => setAdsAccounts(res.data))
            .catch(console.error)
            .finally(() => setIsLoadingAds(false));
    }, [isOpen, token]);

    if (!isOpen) return null;

    // Build unified options
    const allOptions: CompareSource[] = [
        ...trackers.map(t => ({
            id: t.id.toString(),
            type: 'tracker' as const,
            name: t.name,
            group: 'Trackers (SF System)'
        })),
        ...adsAccounts.flatMap(acc =>
            (acc.campaigns || []).map((c: any) => ({
                id: c.id.toString(),
                type: 'campaign' as const,
                name: c.name,
                group: `Campanhas (${acc.name})`
            }))
        )
    ];

    const toggleMetric = (type: string) => {
        setSelectedMetrics(prev =>
            prev.includes(type) ? prev.filter(m => m !== type) : [...prev, type]
        );
    };

    const addSourceSlot = () => {
        if (selectedSources.length < 4) {
            setSelectedSources([...selectedSources, null]);
        }
    };

    const removeSourceSlot = (index: number) => {
        if (selectedSources.length > 2) {
            setSelectedSources(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateSource = (index: number, option: CompareSource) => {
        const newSources = [...selectedSources];
        newSources[index] = option;
        setSelectedSources(newSources);
    };

    const handleNext = () => {
        if (step === 1 && selectedSources.filter(s => s !== null).length >= 2) {
            setStep(2);
        }
    };

    const handleGenerate = () => {
        if (selectedMetrics.length === 0) return;
        const validSources = selectedSources.filter(s => s !== null) as CompareSource[];
        onGenerate(validSources, selectedMetrics);
        onClose();
        setTimeout(() => {
            setStep(1);
            setSelectedSources([null, null]);
            setSelectedMetrics([]);
        }, 500);
    };

    const isSlotDuplicate = (index: number, optionId: string) => {
        return selectedSources.some((s, i) => i !== index && s?.id === optionId);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center fade-in text-left">
            <div className="bg-card w-full max-w-4xl rounded-xl border border-border shadow-2xl flex flex-col md:flex-row overflow-hidden zoom-in-95 min-h-[500px]">

                {/* Left Progress Pane */}
                <div className="w-full md:w-1/3 bg-background border-r border-border p-8 flex flex-col">
                    <div className="mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                            <Layers className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Assistente Comparativo</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Crie um relatório visual lado-a-lado instantaneamente para até 4 origens.
                        </p>
                    </div>

                    <div className="flex-1 space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        <div className={cn("relative flex items-center gap-4 transition-all duration-300", step >= 1 ? "opacity-100" : "opacity-40")}>
                            <div className={cn(
                                "z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 transition-colors",
                                step > 1 ? "bg-primary border-primary text-primary-foreground" : step === 1 ? "border-primary text-primary bg-background" : "border-muted text-muted-foreground bg-background"
                            )}>
                                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                            </div>
                            <div>
                                <h4 className={cn("font-medium", step >= 1 ? "text-foreground" : "text-muted-foreground")}>Origens</h4>
                                <p className="text-xs text-muted-foreground">O que comparar?</p>
                            </div>
                        </div>

                        <div className={cn("relative flex items-center gap-4 transition-all duration-300", step >= 2 ? "opacity-100" : "opacity-40")}>
                            <div className={cn(
                                "z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 transition-colors",
                                step === 2 ? "border-primary text-primary bg-background" : "border-muted text-muted-foreground bg-background"
                            )}>
                                '2'
                            </div>
                            <div>
                                <h4 className={cn("font-medium", step >= 2 ? "text-foreground" : "text-muted-foreground")}>Métricas</h4>
                                <p className="text-xs text-muted-foreground">O que analisar?</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Interactive Area */}
                <div className="w-full md:w-2/3 flex flex-col bg-card relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background rounded-full transition-colors z-20">
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex-1 p-8 overflow-y-auto w-full">
                        {step === 1 && (
                            <div className="h-full flex flex-col max-w-md mx-auto fade-in pt-4">
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-foreground mb-1">Selecione as Origens</h3>
                                    <p className="text-sm text-muted-foreground">Escolha de 2 a 4 Trackers ou Campanhas para comparar.</p>
                                </div>

                                <div className="space-y-4">
                                    {selectedSources.map((slot, index) => (
                                        <div key={index} className="flex items-center gap-2 relative">
                                            <div className="flex-1 relative group">
                                                <Badge variant="outline" className={cn("absolute -top-3 left-3 z-10", index === 0 ? "bg-primary/5 text-primary border-primary/20" : index === 1 ? "bg-red-500/5 text-red-500 border-red-500/20" : index === 2 ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" : "bg-purple-500/5 text-purple-500 border-purple-500/20")}>
                                                    Origem {index + 1}
                                                </Badge>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button className="w-full flex items-center justify-between border-2 border-border group-hover:border-primary/50 transition-colors rounded-xl bg-background text-sm p-4 outline-none text-foreground mt-2">
                                                            <span className={slot ? "text-foreground" : "text-muted-foreground"}>
                                                                {slot ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="secondary" className="text-[10px] uppercase h-5">{slot.type}</Badge>
                                                                        <span className="truncate max-w-[200px]">
                                                                            <DecryptedText value={slot.name} />
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    "Pesquisar Tracker ou Campanha..."
                                                                )}
                                                            </span>
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[380px] p-0 z-[200]" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Buscar por nome..." />
                                                            <CommandList>
                                                                {isLoadingAds && <div className="p-4 text-xs text-center text-muted-foreground">Carregando Campanhas...</div>}
                                                                <CommandEmpty>Nenhuma origem encontrada.</CommandEmpty>

                                                                {/* Grouping by type */}
                                                                {Array.from(new Set(allOptions.map(o => o.group))).map(groupName => (
                                                                    <CommandGroup key={groupName} heading={groupName} className="text-xs">
                                                                        {allOptions.filter(o => o.group === groupName).map(option => {
                                                                            const isSelected = slot?.id === option.id;
                                                                            const isDisabled = isSlotDuplicate(index, option.id);
                                                                            return (
                                                                                <CommandItem
                                                                                    key={option.id}
                                                                                    value={option.name}
                                                                                    disabled={isDisabled}
                                                                                    onSelect={() => updateSource(index, option)}
                                                                                    className={cn("cursor-pointer", isDisabled && "opacity-40")}
                                                                                >
                                                                                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100 text-primary" : "opacity-0")} />
                                                                                    <DecryptedText value={option.name} />
                                                                                    {option.type === 'campaign' && <Badge variant="outline" className="ml-auto text-[10px] scale-75 border-muted text-muted-foreground">G-Ads</Badge>}
                                                                                </CommandItem>
                                                                            )
                                                                        })}
                                                                    </CommandGroup>
                                                                ))}
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            {index > 1 && (
                                                <button onClick={() => removeSourceSlot(index)} className="mt-2 p-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {selectedSources.length < 4 && (
                                    <button
                                        onClick={addSourceSlot}
                                        className="mt-6 flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary rounded-xl p-3 text-sm font-medium transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Adicionar mais uma origem (Máx 4)
                                    </button>
                                )}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="h-full flex flex-col slide-in-from-right-4 fade-in duration-300">
                                <div className="mb-6">
                                    <h3 className="text-2xl font-bold text-foreground mb-2">Escolha as Métricas</h3>
                                    <p className="text-sm text-muted-foreground">Selecione quais cartões (KPIs) você quer ver pendurados nas {selectedSources.filter(s => s).length} origens.</p>
                                </div>

                                <div className="flex-1 space-y-6 overflow-y-auto pb-4 custom-scrollbar pr-2">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Google Ads</Badge>
                                            Tráfego
                                        </h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {GOOGLE_METRICS.map(metric => {
                                                const isSelected = selectedMetrics.includes(metric.type);
                                                return (
                                                    <button
                                                        key={metric.type}
                                                        onClick={() => toggleMetric(metric.type)}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 group active:scale-95 relative overflow-hidden",
                                                            isSelected ? "border-primary bg-primary/5 shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]" : "border-border bg-background hover:bg-secondary/50 hover:border-muted-foreground/30"
                                                        )}
                                                    >
                                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-transform", metric.bg, isSelected && "scale-110")}>
                                                            <metric.icon className={cn("w-4 h-4", metric.color)} />
                                                        </div>
                                                        <span className={cn("text-[11px] leading-tight font-semibold transition-colors", isSelected ? "text-primary" : "text-foreground")}>
                                                            {metric.label}
                                                        </span>
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground zoom-in-50">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">SF System</Badge>
                                            Conversão e Retenção
                                        </h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {SYSTEM_METRICS.map(metric => {
                                                const isSelected = selectedMetrics.includes(metric.type);
                                                return (
                                                    <button
                                                        key={metric.type}
                                                        onClick={() => toggleMetric(metric.type)}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 group active:scale-95 relative overflow-hidden",
                                                            isSelected ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]" : "border-border bg-background hover:bg-secondary/50 hover:border-muted-foreground/30"
                                                        )}
                                                    >
                                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-transform", metric.bg, isSelected && "scale-110")}>
                                                            <metric.icon className={cn("w-4 h-4", metric.color)} />
                                                        </div>
                                                        <span className={cn("text-[11px] leading-tight font-semibold transition-colors", isSelected ? "text-emerald-500" : "text-foreground")}>
                                                            {metric.label}
                                                        </span>
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white zoom-in-50">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-border flex justify-between bg-card items-center mt-auto shrink-0 w-full">
                        {step === 2 ? (
                            <button
                                onClick={() => setStep(1)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            >
                                Voltar
                            </button>
                        ) : (
                            <div />
                        )}

                        {step === 1 ? (
                            <button
                                onClick={handleNext}
                                disabled={selectedSources.filter(s => s !== null).length < 2}
                                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Próximo Passo
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={selectedMetrics.length === 0}
                                className="flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-500 text-white hover:brightness-110 px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                GERAR COMPARATIVO ({selectedMetrics.length} KPIs)
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
