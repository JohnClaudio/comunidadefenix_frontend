import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchGoogleAdsAccounts, fetchKanbanRules, saveKanbanRules } from '@/services/googleAdsApi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DatePreset } from '@/types/dashboard';
import { KanbanRules } from '@/types/googleAds';
import { CampaignHealthKanban } from '@/components/googleAds/CampaignHealthKanban';
import { Calendar, ChevronDown, Building2, Search, Radar, Settings, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { DecryptedText } from '@/components/DecryptedText';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const CampaignHealthView: React.FC = () => {
    const { token } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7));
    const [dateTo, setDateTo] = useState<Date>(new Date());
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [activePreset, setActivePreset] = useState<DatePreset>('7d');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Config Form State
    const [formRules, setFormRules] = useState<any>({});

    const { data: rulesData, isLoading: isLoadingRules } = useQuery({
        queryKey: ['kanbanRules'],
        queryFn: () => fetchKanbanRules(token!),
        enabled: !!token,
    });

    const kanbanRules: KanbanRules = rulesData?.data || {
        use_dynamic_rules: true,
        high_performance_roas_min: 1.5,
        high_performance_cpa_max: 60,
        high_performance_conv_min: 3,
        learning_spend_max: 50,
        learning_conv_max: 2,
        critical_spend_min: 100,
    };

    const rulesMutation = useMutation({
        mutationFn: (newRules: KanbanRules) => saveKanbanRules(token!, newRules),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['kanbanRules'] });
            toast({ title: 'Sucesso', description: data.message });
            setIsSettingsOpen(false);
        },
        onError: () => {
            toast({ title: 'Erro', description: 'Ocorreu um erro ao salvar as regras.', variant: 'destructive' });
        }
    });

    const handleOpenSettings = () => {
        setFormRules(kanbanRules);
        setIsSettingsOpen(true);
    };

    const handleSaveSettings = () => {
        rulesMutation.mutate(formRules);
    };

    const { data: googleAdsData, isLoading } = useQuery({
        queryKey: ['googleAds', format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
        queryFn: () => fetchGoogleAdsAccounts(token!, {
            start_date: format(dateFrom, 'yyyy-MM-dd'),
            end_date: format(dateTo, 'yyyy-MM-dd'),
        }),
        enabled: !!token,
    });

    const accounts = googleAdsData?.data || [];
    const filteredAccounts = selectedAccountId
        ? accounts.filter(a => a.id === selectedAccountId)
        : accounts;

    const allCampaigns = useMemo(() => {
        const campaigns: Array<any> = [];
        filteredAccounts.forEach(account => {
            account.campaigns.forEach(campaign => {
                if (searchTerm && !campaign.name.toLowerCase().includes(searchTerm.toLowerCase())) return;
                campaigns.push({ ...campaign, accountName: account.name });
            });
        });
        return campaigns;
    }, [filteredAccounts, searchTerm]);

    const handlePresetClick = (preset: DatePreset) => {
        setActivePreset(preset);
        const today = new Date();
        switch (preset) {
            case 'today': setDateFrom(today); setDateTo(today); break;
            case 'yesterday': { const y = subDays(today, 1); setDateFrom(y); setDateTo(y); break; }
            case '7d': setDateFrom(subDays(today, 7)); setDateTo(today); break;
            case '15d': setDateFrom(subDays(today, 15)); setDateTo(today); break;
            case '30d': setDateFrom(subDays(today, 30)); setDateTo(today); break;
            case '90d': setDateFrom(subDays(today, 90)); setDateTo(today); break;
            case 'year': setDateFrom(startOfYear(today)); setDateTo(today); break;
            case 'custom': setCalendarOpen(true); break;
        }
    };

    const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
        if (range?.from && range?.to) {
            setActivePreset('custom');
            setDateFrom(range.from);
            setDateTo(range.to);
            setCalendarOpen(false);
        } else if (range?.from) {
            setDateFrom(range.from);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
                                <Radar className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-2xl font-bold text-foreground">Radar de Campanhas</h1>
                        </div>
                        <p className="text-muted-foreground text-sm ml-10">
                            Monitoramento inteligente e classificação automática das suas campanhas
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleOpenSettings} className="gap-2">
                    <Settings className="w-4 h-4" />
                    Regras
                </Button>
            </div>

            {/* Preset Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    {([
                        { label: 'Hoje', value: 'today' as DatePreset },
                        { label: 'Ontem', value: 'yesterday' as DatePreset },
                        { label: '7 dias', value: '7d' as DatePreset },
                        { label: '15 dias', value: '15d' as DatePreset },
                        { label: '30 dias', value: '30d' as DatePreset },
                        { label: '90 dias', value: '90d' as DatePreset },
                        { label: 'Este ano', value: 'year' as DatePreset },
                        { label: 'Personalizado', value: 'custom' as DatePreset },
                    ]).map((preset) => (
                        <Button
                            key={preset.value}
                            variant={activePreset === preset.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePresetClick(preset.value)}
                            disabled={isLoading}
                            className={cn(
                                'transition-all',
                                activePreset === preset.value && 'bg-primary text-primary-foreground'
                            )}
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="min-w-[240px] justify-start text-left font-normal" disabled={isLoading}>
                                <Calendar className="mr-2 h-4 w-4" />
                                {format(dateFrom, 'dd MMM', { locale: ptBR })} - {format(dateTo, 'dd MMM yyyy', { locale: ptBR })}
                                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                                mode="range"
                                defaultMonth={dateFrom}
                                selected={{ from: dateFrom, to: dateTo }}
                                onSelect={handleDateRangeSelect}
                                numberOfMonths={2}
                                className="p-3 pointer-events-auto"
                            />
                        </PopoverContent>
                    </Popover>

                    <Select
                        value={selectedAccountId?.toString() || 'all'}
                        onValueChange={(value) => setSelectedAccountId(value === 'all' ? null : Number(value))}
                        disabled={isLoading}
                    >
                        <SelectTrigger className="w-[220px]">
                            <Building2 className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Todas as contas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as contas</SelectItem>
                            {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id.toString()}><DecryptedText value={account.name} /></SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="relative w-full lg:w-[220px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar campanha..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-background h-9"
                        />
                    </div>
                </div>
            </div>

            {isLoading || isLoadingRules ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-[600px]">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-full rounded-xl w-full" />
                    ))}
                </div>
            ) : (
                <CampaignHealthKanban campaigns={allCampaigns} rules={kanbanRules} />
            )}

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Regras de Categorização do Kanban</DialogTitle>
                        <DialogDescription className="text-sm">
                            Estas regras movem as campanhas automaticamente para cada coluna.
                            Qualquer campanha que rodar, gastar saldo, mas <strong className="font-semibold text-amber-500">não se encaixar em nenhuma regra abaixo</strong>, cairá na coluna amarela de <strong>Observação</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4 overflow-y-auto max-h-[70vh] px-1 custom-scrollbar">
                        {/* Master Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 transition-colors">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-semibold text-primary flex items-center gap-1.5 cursor-pointer" onClick={() => setFormRules({ ...formRules, use_dynamic_rules: !formRules.use_dynamic_rules })}>
                                    <Sparkles size={16} /> Modo Inteligente (Auto)
                                </Label>
                                <p className="text-[11px] text-muted-foreground w-[95%]">
                                    A Inteligência Artificial ajustará as colunas automaticamente calculando o ROAS e CPA histórico da conta.
                                </p>
                            </div>
                            <Switch
                                checked={formRules.use_dynamic_rules}
                                onCheckedChange={(checked) => setFormRules({ ...formRules, use_dynamic_rules: checked })}
                            />
                        </div>

                        {/* Existing settings */}
                        <div className={cn("space-y-6 transition-all duration-300", formRules.use_dynamic_rules ? "opacity-40 grayscale-[50%] pointer-events-none" : "opacity-100")}>
                            <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-emerald-500/5">
                                <div>
                                    <h4 className="font-semibold text-emerald-500 text-sm flex items-center gap-2 mb-1">🚀 Alta Performance</h4>
                                    <p className="text-[11px] text-muted-foreground leading-snug">Campanhas campeãs, que dão lucro recorrente ou convertem muito barato.</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-xs">🎯 ROAS Mínimo (Retorno S/ Investimento)</Label>
                                    <Input type="number" step="0.1" value={formRules.high_performance_roas_min || ''} onChange={e => setFormRules({ ...formRules, high_performance_roas_min: Number(e.target.value) })} />
                                    <p className="text-[10px] text-muted-foreground">Ex: 1.5 significa que a campanha gera R$ 1,50 em vendas para cada R$ 1,00 gasto.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-xs">💰 CPA Máx (Custo por Venda)</Label>
                                        <Input type="number" value={formRules.high_performance_cpa_max || ''} onChange={e => setFormRules({ ...formRules, high_performance_cpa_max: Number(e.target.value) })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs">🛍️ Mínimo de Vendas</Label>
                                        <Input type="number" value={formRules.high_performance_conv_min || ''} onChange={e => setFormRules({ ...formRules, high_performance_conv_min: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">O sistema considera Alta Performance se o ROAS for atingido <strong>OU</strong> se o CPA estiver abaixo do máximo estipulado.</p>
                            </div>

                            <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-blue-500/5">
                                <div>
                                    <h4 className="font-semibold text-blue-400 text-sm flex items-center gap-2 mb-1">⏳ Em Aprendizado</h4>
                                    <p className="text-[11px] text-muted-foreground leading-snug">Campanhas novas ou que gastaram pouquinho e ainda estão pegando tração.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-xs">💸 Gasto Máximo (R$)</Label>
                                        <Input type="number" value={formRules.learning_spend_max || ''} onChange={e => setFormRules({ ...formRules, learning_spend_max: Number(e.target.value) })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs">📉 Máximo de Vendas</Label>
                                        <Input type="number" value={formRules.learning_conv_max || ''} onChange={e => setFormRules({ ...formRules, learning_conv_max: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Se não passar desse gasto e vendas, o Google ainda está "testando" o público.</p>
                            </div>

                            <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-rose-500/5">
                                <div>
                                    <h4 className="font-semibold text-rose-400 text-sm flex items-center gap-2 mb-1">🚨 Ação Crítica</h4>
                                    <p className="text-[11px] text-muted-foreground leading-snug">Perigo! Campanhas torrando verba sem trazer retorno. Precisam de pausa ou ajustes urgentes.</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-xs">🔥 Gasto Crítico sem Vendas (R$)</Label>
                                    <Input type="number" value={formRules.critical_spend_min || ''} onChange={e => setFormRules({ ...formRules, critical_spend_min: Number(e.target.value) })} />
                                    <p className="text-[10px] text-muted-foreground">Se a campanha gastar esse valor com exatas zero vendas, ela ficará piscando vermelho.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSettings} disabled={rulesMutation.isPending}>
                            {rulesMutation.isPending ? 'Salvando...' : 'Salvar Regras'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default CampaignHealthView;
