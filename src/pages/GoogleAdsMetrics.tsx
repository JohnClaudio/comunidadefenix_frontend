import React, { useState, useMemo, useEffect, useCallback, Component } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  ChevronDown, 
  BarChart3, 
  Target,
  Layers,
  Search,
  Briefcase,
  Check,
  ArrowUp,
  ArrowDown,
  Settings2,
  BellRing,
  TrendingUp,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  Activity,
  LineChart,
  ArrowLeft,
  ChevronRight,
  GripVertical,
  Pin,
  ImageDown,
} from 'lucide-react';
import { GoogleAdsExporter } from '@/components/GoogleAdsExporter';
import { usePrivacy } from '@/contexts/PrivacyContext';

import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleAdsAccounts, fetchGoogleAdsDailyReport, saveGoogleAdsDailyNote, saveGoogleAdsDailyOverride } from '@/services/googleAdsApi';
import { useToast } from '@/hooks/use-toast';
import { MasterDetailLayout } from '@/components/layout/MasterDetailLayout';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { DecryptedText } from '@/components/DecryptedText';
import { cn } from '@/lib/utils';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

class MetricsErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 border border-red-500 bg-red-500/10 text-red-500 font-mono rounded-lg m-4">
          <h2 className="text-xl font-bold mb-4">React Render Crash</h2>
          <p className="mb-2"><strong>Error:</strong> {this.state.error?.message}</p>
          <p className="whitespace-pre-wrap text-xs">{this.state.error?.stack}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Theme Tokens ---
const theme = {
  pageBg: "bg-background",
  panelBg: "bg-card",
  border: "border-border",
  textMuted: "text-muted-foreground",
  textPrimary: "text-foreground",
  orange: {
    text: "text-[#ff8c00]",
    bgSubtle: "bg-[#ff8c00]/10",
  }
};

type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';

// Optimized columns based on user feedback
const defaultColumnsConfig = [
  { id: 'date', label: 'Data', visible: true, pinned: true, width: 130 },
  { id: 'impressions', label: 'Impressões', visible: true, pinned: false, width: 110 },
  { id: 'clicks', label: 'Cliques', visible: true, pinned: false, width: 100 },
  { id: 'checkouts', label: 'Checkouts', visible: true, pinned: false, width: 110 },
  { id: 'top_share', label: 'Parc. Superior', visible: true, pinned: false, width: 130 },
  { id: 'abs_top_share', label: 'Parc. 1 (Topo)', visible: true, pinned: false, width: 130 },
  { id: 'impression_share', label: 'Parc. De Impr.', visible: true, pinned: false, width: 130 },
  { id: 'cpc', label: 'CPC Médio', visible: true, pinned: false, width: 110 },
  { id: 'budget', label: 'Orçamento', visible: true, pinned: false, width: 110 },
  { id: 'target_cpa', label: 'CPA Desejado', visible: true, pinned: false, width: 130 },
  { id: 'cost', label: 'Custo', visible: true, pinned: false, width: 110 },
  { id: 'conversion_value', label: 'Valor Conv. (R$)', visible: true, pinned: false, width: 140 },
  { id: 'conversions', label: 'CONVERSÕES', visible: true, pinned: false, width: 120 },
  { id: 'checkouts_per_conversion', label: 'CK / Conv.', visible: true, pinned: false, width: 110 },
  { id: 'profit', label: 'Lucro', visible: true, pinned: false, width: 120 },
  { id: 'notes', label: 'Observações', visible: true, pinned: false, width: 250 },
];

const NoteCell = ({ campaignId, date, initialNote, token }: { campaignId: number, date: string, initialNote: string, token: string }) => {
  const [note, setNote] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleBlur = async () => {
    if (note === initialNote) return;
    setIsSaving(true);
    try {
      await saveGoogleAdsDailyNote(token, { campaign_id: campaignId, date, note });
      toast({ title: 'Salvo', description: 'Observação salva com sucesso.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a observação.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleBlur}
        placeholder="Adicionar observação..."
        className={cn(
          "w-48 bg-transparent border-b border-transparent hover:border-border focus:border-primary/50 focus:outline-none transition-colors text-xs py-1 px-2",
          isSaving && "opacity-50"
        )}
      />
    </div>
  );
};

type OverrideField = 'override_checkouts' | 'override_conversions' | 'override_conversion_value';

const EditableMetricCell = ({ 
  campaignId, date, initialValue, field, token, format: formatFn, type = 'currency'
}: { 
  campaignId: number; date: string; initialValue: number; field: OverrideField; token: string;
  format: (val: any) => string; type?: 'integer' | 'currency';
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [rawValue, setRawValue] = useState(String(initialValue));
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sanitizeInput = (input: string): string => {
    if (type === 'integer') {
      // Only digits
      return input.replace(/[^0-9]/g, '');
    }
    // Currency: digits, single dot, up to 2 decimals
    let cleaned = input.replace(/[^0-9.,]/g, '');
    // Convert comma to dot
    cleaned = cleaned.replace(',', '.');
    // Only allow one dot
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    // Max 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    return cleaned;
  };

  const handleSave = async () => {
    setIsEditing(false);
    const numericValue = parseFloat(rawValue) || 0;
    if (numericValue === initialValue) return;
    
    setIsSaving(true);
    try {
      await saveGoogleAdsDailyOverride(token, {
        campaign_id: campaignId,
        date,
        field,
        value: numericValue,
      });
      toast({ title: 'Salvo', description: 'Métrica atualizada com sucesso.' });
      // Invalidate to refresh the table with recalculated values
      queryClient.invalidateQueries({ queryKey: ['googleAdsDailyReport'] });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        type="text"
        value={rawValue}
        onChange={(e) => setRawValue(sanitizeInput(e.target.value))}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
        className="w-20 bg-background border border-primary/40 rounded px-1.5 py-0.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50 text-right font-mono"
      />
    );
  }

  return (
    <div 
      onClick={() => { setRawValue(String(initialValue)); setIsEditing(true); }}
      className={cn(
        "cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5 transition-colors text-right group",
        isSaving && "opacity-50"
      )}
      title="Clique para editar"
    >
      <span>{formatFn(initialValue)}</span>
      <span className="ml-1 opacity-0 group-hover:opacity-60 text-[9px] text-muted-foreground">✏️</span>
    </div>
  );
};

interface GoogleAdsMetricsProps {
  inlineCampaignId?: number;
  onBack?: () => void;
}

const GoogleAdsMetrics: React.FC<GoogleAdsMetricsProps> = ({ inlineCampaignId, onBack }) => {
  const { token } = useAuth();
  const { isPrivacyMode } = usePrivacy();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(inlineCampaignId || null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [columnsConfig, setColumnsConfig] = useState(defaultColumnsConfig);
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeDatePreset, setActiveDatePreset] = useState<DatePreset>('30days');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showExporter, setShowExporter] = useState(false);

  const togglePin = useCallback((colId: string) => {
    setColumnsConfig(prev => prev.map(c => c.id === colId ? { ...c, pinned: !c.pinned } : c));
  }, []);

  const orderedColumns = useMemo(() => {
    try {
      if (!Array.isArray(columnsConfig)) return defaultColumnsConfig;
      
      const visible = columnsConfig.filter(c => c && c.visible);
      const pinned = visible.filter(c => c && c.pinned);
      const unpinned = visible.filter(c => c && !c.pinned);
      
      let currentLeft = 0;
      const pinnedWithOffset = pinned.map(c => {
        const col = { ...c, offset: currentLeft };
        currentLeft += Number(c.width) || 120;
        return col;
      });

      return [...pinnedWithOffset, ...unpinned];
    } catch (err) {
      console.error("CRASH IN orderedColumns useMemo:", err);
      return defaultColumnsConfig;
    }
  }, [columnsConfig]);

  // Sync columns config if default changes
  useEffect(() => {
    setColumnsConfig(defaultColumnsConfig);
  }, [selectedCampaignId]);

  // Fetch accounts to get campaigns list
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['googleAdsAccountsList_Metrics'],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(subDays(new Date(), 60), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
    }),
    enabled: !!token,
  });

  const allCampaigns = useMemo(() => {
    try {
      if (!accountsData?.data || !Array.isArray(accountsData.data)) return [];
      return accountsData.data.flatMap(acc => {
        if (!acc || !Array.isArray(acc.campaigns)) return [];
        return acc.campaigns.map(camp => ({ 
          ...camp, 
          accountName: acc.name || 'Desconhecido',
          trackerName: camp?.tracker?.name || 'Sem Tracker'
        }));
      });
    } catch (err) {
      console.error("CRASH IN allCampaigns useMemo:", err);
      return [];
    }
  }, [accountsData]);

  const selectedCampaign = useMemo(() => 
    allCampaigns.find(c => c.id === selectedCampaignId),
    [allCampaigns, selectedCampaignId]
  );

  // Fetch daily report for selected campaign
  const { data: reportData, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['googleAdsDailyReport', selectedCampaignId, format(dateRange.from, 'yyyy-MM-dd'), format(dateRange.to, 'yyyy-MM-dd')],
    queryFn: () => fetchGoogleAdsDailyReport(token!, {
      campaign_id: selectedCampaignId!,
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
    }),
    enabled: !!token && !!selectedCampaignId,
  });

  const stats = reportData?.data?.totals || {};
  const rawRows = reportData?.data?.rows || [];
  const rows = Array.isArray(rawRows) ? rawRows : Object.values(rawRows);
  const campaignInfo = reportData?.data?.campaign || {};

  // Process rows to calculate cumulative profit chronologically
  const processedRows = useMemo(() => {
    try {
      if (!rows || !Array.isArray(rows) || rows.length === 0) return [];
      
      // 1. Sort by date ASC (oldest to newest) to calculate balance
      const sorted = [...rows].sort((a, b) => {
        if (!a || !b || !a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      let currentBalance = 0;
      const withCumulative = sorted.map(row => {
        if (!row) return row;
        currentBalance += Number(row.profit || 0);
        return { ...row, cumulativeProfit: currentBalance };
      });
      
      return withCumulative;
    } catch (err) {
      console.error("CRASH IN USEMEMO:", err);
      return [];
    }
  }, [rows]);

  const formatCurrency = (val: any) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
  
  const formatNumber = (val: any) => 
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(val) || 0);

  const formatPercent = (val: any) => 
    `${(Number(val) || 0).toFixed(2)}%`;

  const handleDatePresetClick = (preset: DatePreset) => {
    setActiveDatePreset(preset);
    const today = new Date();
    switch (preset) {
      case 'all': setDateRange({ from: subDays(today, 3650), to: today }); break;
      case 'today': setDateRange({ from: today, to: today }); break;
      case 'yesterday': setDateRange({ from: subDays(today, 1), to: subDays(today, 1) }); break;
      case '7days': setDateRange({ from: subDays(today, 7), to: today }); break;
      case '30days': setDateRange({ from: subDays(today, 30), to: today }); break;
      case 'custom': setCalendarOpen(true); break;
    }
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newCols = [...columnsConfig];
    if (direction === 'up' && index > 0) {
      [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
    } else if (direction === 'down' && index < newCols.length - 1) {
      [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
    }
    setColumnsConfig(newCols);
  };

  const toggleColumn = (index: number) => {
    const newCols = [...columnsConfig];
    newCols[index].visible = !newCols[index].visible;
    setColumnsConfig(newCols);
  };


  try {
    return (
      <MetricsErrorBoundary>
        <MasterDetailLayout>
          {!inlineCampaignId && (
          <MasterDetailLayout.Sidebar title="Configurações">
          <div className="space-y-8 pt-4 px-2">
          {/* Campaign Selector */}
          <div className="space-y-3">
            <label className={cn("text-[11px] font-bold uppercase tracking-widest pl-1", theme.textMuted)}>
              Campanha Alvo
            </label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className={cn(
                    "w-full h-12 justify-between px-3 transition-all duration-300",
                    theme.panelBg, theme.border,
                    "hover:border-[#ff8c00]/50 hover:bg-accent rounded-lg shadow-sm",
                    comboboxOpen && "ring-2 ring-[#ff8c00]/20 border-[#ff8c00]"
                  )}
                >
                  <div className="flex items-center gap-2.5 w-[85%]">
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", selectedCampaign ? theme.orange.bgSubtle : "bg-secondary")}>
                      <Briefcase className={cn("w-3.5 h-3.5", selectedCampaign ? theme.orange.text : theme.textMuted)} />
                    </div>
                    <div className="flex flex-col items-start truncate w-full text-left leading-tight">
                      {selectedCampaign ? (
                        <>
                          <span className={cn("text-xs font-bold truncate w-full", theme.textPrimary, isPrivacyMode && "blur-sm select-none")}>
                            {isPrivacyMode ? '••••••••••••' : <DecryptedText value={selectedCampaign.name} />}
                          </span>
                          <span className={cn("text-[9px] font-medium truncate w-full", theme.textMuted)}>
                            {selectedCampaign.trackerName}
                          </span>
                        </>
                      ) : (
                        <span className={cn("text-xs font-medium", theme.textMuted)}>Selecionar campanha...</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-300", comboboxOpen ? "rotate-180 text-[#ff8c00]" : theme.textMuted)} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className={cn("w-[300px] p-0 shadow-2xl rounded-xl overflow-hidden border", theme.panelBg, theme.border)} align="start" sideOffset={8}>
                <Command className="bg-transparent" filter={(value, search) => {
                  if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                  return 0;
                }}>
                  <div className={cn("flex items-center border-b px-3", theme.border)}>
                    <Search className={cn("mr-2 h-4 w-4 shrink-0 opacity-50", theme.textMuted)} />
                    <CommandInput placeholder="Procurar campanha..." className={cn("h-11 border-none focus:ring-0 text-sm bg-transparent", theme.textPrimary, "placeholder:text-muted-foreground")} />
                  </div>
                  <CommandList className={cn("max-h-[250px] overflow-y-auto scrollbar-thin", "scrollbar-thumb-border scrollbar-track-transparent")}>
                    <CommandEmpty className={cn("py-8 text-center text-sm", theme.textMuted)}>
                      Nenhuma campanha.
                    </CommandEmpty>
                    <CommandGroup className="p-1.5">
                      {allCampaigns.map((camp) => (
                        <CommandItem
                          key={camp.id}
                          value={`${camp.name} ${camp.trackerName} ${camp.accountName}`}
                          onSelect={() => {
                            setSelectedCampaignId(camp.id);
                            setComboboxOpen(false);
                          }}
                          className={cn(
                            "flex flex-col items-start p-2.5 mb-1 gap-1 cursor-pointer rounded-md transition-all duration-200 group/item",
                            "aria-selected:bg-accent hover:bg-accent"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={cn("font-bold text-xs group-hover/item:text-accent-foreground transition-colors", theme.textPrimary, isPrivacyMode && "blur-sm select-none")}>
                              {isPrivacyMode ? '••••••••••••' : <DecryptedText value={camp.name} />}
                            </span>
                            {selectedCampaignId === camp.id && <Check className="h-3.5 w-3.5 text-[#ff8c00] animate-in zoom-in" />}
                          </div>
                          <div className="flex items-center justify-between w-full mt-0.5">
                            <div className="flex items-center gap-1.5">
                              <Layers className="w-3 h-3 text-muted-foreground group-hover/item:text-accent-foreground/70" />
                              <span className={cn("text-[9px] font-semibold group-hover/item:text-accent-foreground/70 transition-colors", theme.textMuted)}>
                                {camp.trackerName}
                              </span>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Picker - Inline List */}
          <div className="space-y-2">
            <label className={cn("text-[11px] font-bold uppercase tracking-widest pl-1", theme.textMuted)}>
              Período
            </label>
            <div className="flex flex-col gap-1">
              {[
                { id: 'all', label: 'Qualquer data' },
                { id: 'today', label: 'Hoje' },
                { id: 'yesterday', label: 'Ontem' },
                { id: '7days', label: 'Últimos 7 dias' },
                { id: '30days', label: 'Últimos 30 dias' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleDatePresetClick(preset.id as DatePreset)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                    activeDatePreset === preset.id 
                      ? "bg-[#ff8c00]/10 text-[#ff8c00]" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Calendar className="w-4 h-4 opacity-70" />
                  {preset.label}
                </button>
              ))}

              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => setActiveDatePreset('custom')}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                      activeDatePreset === 'custom' 
                        ? "bg-[#ff8c00]/10 text-[#ff8c00]" 
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 opacity-70" />
                      <span>Personalizado</span>
                    </div>
                    {activeDatePreset === 'custom' && (
                      <span className="text-[10px] font-bold opacity-70">
                        {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className={cn("w-auto p-0 shadow-2xl rounded-xl border overflow-hidden", theme.panelBg, theme.border)} align="start" side="right" sideOffset={16}>
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                        setActiveDatePreset('custom');
                        setCalendarOpen(false);
                      } else if (range?.from) {
                        setDateRange(r => ({ ...r, from: range.from }));
                      }
                    }}
                    numberOfMonths={2}
                    className="p-4 bg-popover"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

            </div>
          </div>
        </div>
      </MasterDetailLayout.Sidebar>
      )}

      <MasterDetailLayout.Content>
        {selectedCampaignId ? (
          <div className="h-full flex flex-col animate-in fade-in duration-500">
            {/* Action Bar */}
            <header className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-border px-8 lg:px-12 pt-4">
              {inlineCampaignId && onBack ? (
                <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground" size="sm">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
              ) : <div />}
              
              <div className="flex-1 flex items-center gap-3 overflow-hidden">
                {selectedCampaign ? (
                  <div className="flex flex-col min-w-0">
                    <h2 className={cn(
                      "text-sm font-bold truncate",
                      isPrivacyMode ? "blur-md select-none" : "text-foreground"
                    )}>
                      <DecryptedText value={selectedCampaign.name} />
                    </h2>
                    <div className={cn(
                      "text-[10px] text-muted-foreground font-medium",
                      isPrivacyMode && "blur-sm select-none"
                    )}>
                      {selectedCampaign.trackerName}
                    </div>
                  </div>
                ) : (
                  <div className="h-8 w-32 bg-muted animate-pulse rounded-md" />
                )}

                {/* Campaign Switcher (Other campaigns from the same tracker) */}
                {inlineCampaignId && selectedCampaign && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-secondary">
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[300px] p-2 bg-card border-border shadow-xl">
                      <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border mb-1">
                        Outras campanhas do Produto
                      </div>
                      <div className="max-h-[250px] overflow-y-auto pr-1">
                        {allCampaigns
                          .filter(c => c.tracker_id === selectedCampaign.tracker_id && c.id !== selectedCampaignId)
                          .map(camp => (
                            <button
                              key={camp.id}
                              onClick={() => setSelectedCampaignId(camp.id)}
                              className="w-full text-left p-2 rounded-md hover:bg-accent group transition-colors"
                            >
                              <div className={cn(
                                "text-xs font-semibold truncate",
                                isPrivacyMode ? "blur-sm" : "group-hover:text-primary"
                              )}>
                                <DecryptedText value={camp.name} />
                              </div>
                            </button>
                          ))
                        }
                        {allCampaigns.filter(c => c.tracker_id === selectedCampaign.tracker_id && c.id !== selectedCampaignId).length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            Nenhuma outra campanha.
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Date Filter Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-semibold border-border/50 hover:border-[#ff8c00]/50 transition-colors">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {activeDatePreset === 'custom' 
                        ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`
                        : activeDatePreset === 'today' ? 'Hoje' :
                          activeDatePreset === 'yesterday' ? 'Ontem' :
                          activeDatePreset === '7days' ? 'Últimos 7 dias' :
                          activeDatePreset === '30days' ? 'Últimos 30 dias' : 'Qualquer data'}
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[300px] p-2 bg-card border-border shadow-2xl rounded-xl">
                    <div className="space-y-1">
                      {[
                        { id: 'all', label: 'Qualquer data' },
                        { id: 'today', label: 'Hoje' },
                        { id: 'yesterday', label: 'Ontem' },
                        { id: '7days', label: 'Últimos 7 dias' },
                        { id: '30days', label: 'Últimos 30 dias' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleDatePresetClick(preset.id as DatePreset)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                            activeDatePreset === preset.id 
                              ? "bg-[#ff8c00]/10 text-[#ff8c00]" 
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Calendar className="w-3.5 h-3.5 opacity-70" />
                          {preset.label}
                        </button>
                      ))}
                      <div className="pt-2 mt-2 border-t border-border">
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <button
                              onClick={() => setActiveDatePreset('custom')}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all",
                                activeDatePreset === 'custom' 
                                  ? "bg-[#ff8c00]/10 text-[#ff8c00]" 
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="w-3.5 h-3.5 opacity-70" />
                                <span>Personalizado</span>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="left" align="start" className="w-auto p-0 border border-border shadow-2xl">
                            <CalendarComponent
                              mode="range"
                              selected={{ from: dateRange.from, to: dateRange.to }}
                              onSelect={(range: any) => {
                                if (range?.from && range?.to) {
                                  setDateRange({ from: range.from, to: range.to });
                                  setActiveDatePreset('custom');
                                  setCalendarOpen(false);
                                } else if (range?.from) {
                                  setDateRange(r => ({ ...r, from: range.from }));
                                }
                              }}
                              numberOfMonths={2}
                              className="p-4 bg-popover"
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 text-xs font-semibold border-[#ff8c00]/30 text-[#ff8c00] hover:bg-[#ff8c00]/10 hover:border-[#ff8c00]"
                  onClick={() => setShowExporter(true)}
                  disabled={!processedRows.length}
                  title={!processedRows.length ? 'Selecione uma campanha com dados para exportar' : 'Exportar relatório como imagem PNG'}
                >
                  <ImageDown className="w-4 h-4" />
                  Exportar
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-semibold">
                      <Settings2 className="w-4 h-4" />
                      Colunas
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[280px] p-2">
                    <div className="mb-2 px-2 pb-2 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Ordem e Visibilidade
                    </div>
                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-border pr-2 space-y-1">
                      {columnsConfig.map((col, idx) => (
                        <div key={col.id} className="flex items-center justify-between bg-secondary/50 rounded-md p-1.5 hover:bg-secondary transition-colors">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input 
                              type="checkbox" 
                              checked={col.visible} 
                              onChange={() => toggleColumn(idx)}
                              className="w-3.5 h-3.5 accent-[#ff8c00] rounded-sm cursor-pointer"
                            />
                            <span className={cn("text-xs font-medium", !col.visible && "opacity-50 line-through")}>{col.label}</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-background rounded disabled:opacity-30">
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button onClick={() => moveColumn(idx, 'down')} disabled={idx === columnsConfig.length - 1} className="p-1 hover:bg-background rounded disabled:opacity-30">
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </header>

            <div className="flex-1 space-y-12 pb-24 pt-6 px-8 lg:px-12">
              
              {/* Premium Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                 {/* Card 1 - Traffic */}
                 <div className="relative group p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
                    <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
                      <MousePointerClick className="w-24 h-24 -rotate-12" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/20">
                            <MousePointerClick className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Tráfego Global</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                          <Activity className="w-2.5 h-2.5 text-blue-500" />
                          <span className="text-[8px] font-bold text-blue-500 uppercase tracking-wider">Live</span>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-blue-500 transition-colors duration-500">
                            {formatNumber(stats.clicks)}
                          </div>
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Total de Cliques Únicos</div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-5 border-t border-border/40">
                        <div>
                          <div className="text-base font-black text-foreground">{formatNumber(stats.impressions)}</div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Impressões</div>
                        </div>
                        <div>
                          <div className="text-base font-black text-purple-500">{formatNumber(stats.checkouts)}</div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Checkouts</div>
                        </div>
                        <div>
                          <div className="text-base font-black text-orange-500">{formatNumber(Number(stats.checkouts) > 0 ? Number(stats.clicks) / Number(stats.checkouts) : 0)}</div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Cliques / CK</div>
                        </div>
                      </div>
                    </div>
                 </div>

                 {/* Card 2 - Conversions */}
                 <div className="relative group p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
                    <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
                      <Target className="w-24 h-24 rotate-12" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-purple-500 shadow-lg shadow-purple-500/20">
                            <Target className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Conversões</span>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-black tracking-tighter text-foreground group-hover:text-purple-500 transition-colors duration-500">
                            {formatNumber(stats.conversions)}
                          </div>
                          <Check className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Vendas Confirmadas</div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-5 border-t border-border/40">
                        <div>
                          <div className="text-base font-black text-foreground">{formatNumber(Number(stats.checkouts) > 0 ? Number(stats.checkouts) / Number(stats.conversions || 1) : 0)}</div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">CK / Conv</div>
                        </div>
                        <div>
                          <div className="text-base font-black text-blue-500">{formatNumber(Number(stats.conversions) > 0 ? Number(stats.clicks) / Number(stats.conversions) : 0)}</div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Cliques / Venda</div>
                        </div>
                        <div>
                          <div className="text-base font-black text-amber-500">{formatPercent(Number(stats.conversions) > 0 && Number(stats.checkouts) > 0 ? (Number(stats.conversions) / Number(stats.checkouts)) * 100 : 0)}</div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Taxa Conv.</div>
                        </div>
                      </div>
                    </div>
                 </div>

                 {/* Card 3 - Finance */}
                 <div className="relative group p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1">
                    <div className="absolute -bottom-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
                      <BarChart3 className="w-24 h-24 -rotate-12" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-2 rounded-xl shadow-lg", stats.profit >= 0 ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20")}>
                            <DollarSign className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Performance</span>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-2">
                          <div className={cn(
                            "text-3xl font-black tracking-tighter transition-colors duration-500",
                            stats.profit >= 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {formatCurrency(stats.profit)}
                          </div>
                          {stats.profit >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-rose-500" />
                          )}
                        </div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Lucro Líquido Real</div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-5 border-t border-border/40">
                        <div>
                          <div className="text-base font-black text-foreground">{formatCurrency(stats.cost)}</div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Investimento</div>
                        </div>
                        <div>
                          <div className="text-base font-black text-emerald-400">{formatCurrency(stats.conversion_value)}</div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Faturamento</div>
                        </div>
                        <div>
                          <div className={cn("text-base font-black", Number(stats.cost) > 0 && ((Number(stats.conversion_value) - Number(stats.cost)) / Number(stats.cost)) * 100 >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {formatPercent(Number(stats.cost) > 0 ? ((Number(stats.conversion_value) - Number(stats.cost)) / Number(stats.cost)) * 100 : 0)}
                          </div>
                          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">% ROI</div>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Advanced Data Grid */}
              <div className={cn(
                "w-full rounded-xl border overflow-hidden shadow-sm relative bg-card mb-8"
              )}>
                <div className="max-h-[calc(100vh-420px)] min-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <table className="w-full text-left border-collapse min-w-[1200px]" style={{ tableLayout: 'fixed' }}>
                    <thead className="sticky top-0 z-30 shadow-sm">
                      <tr className="border-b border-border bg-muted">
                        {orderedColumns.map((col, idx) => {
                          return (
                            <th 
                              key={col.id} 
                              className={cn(
                                "px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-r border-border/50 last:border-0 bg-muted transition-all duration-200 group/th",
                                col.pinned && "sticky z-40 border-r border-border shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]",
                                col.id === 'profit' && "text-[#ff8c00]"
                              )}
                              style={{ 
                                width: col.width,
                                minWidth: col.width,
                                left: col.pinned ? col.offset : undefined
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">{col.label}</span>
                                <button 
                                  onClick={() => togglePin(col.id)}
                                  className={cn(
                                    "p-1 rounded opacity-0 group-hover/th:opacity-100 transition-all",
                                    col.pinned ? "text-primary bg-primary/10 opacity-100" : "text-muted-foreground hover:bg-foreground/10"
                                  )}
                                  title={col.pinned ? "Desafixar coluna" : "Fixar coluna"}
                                >
                                  <Pin className={cn("w-3 h-3", col.pinned && "fill-current")} />
                                </button>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {isLoadingMetrics ? (
                        Array.from({ length: 7 }).map((_, i) => (
                          <tr key={i} className="group hover:bg-muted/50 transition-colors bg-card">
                            {orderedColumns.map((col, j) => (
                              <td 
                                key={j} 
                                className={cn(
                                  "px-4 py-3 border-r border-border/50 transition-all duration-200", 
                                  col.pinned && "sticky z-10 bg-card group-hover:bg-muted/50 border-r border-border shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]"
                                )}
                                style={{ left: col.pinned ? col.offset : undefined }}
                              >
                                <Skeleton className="h-4 w-full bg-muted" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={orderedColumns.length} className="py-24 text-center">
                            <div className="flex flex-col items-center justify-center opacity-50">
                              <Search className="w-8 h-8 text-muted-foreground mb-3" />
                              <p className="text-sm font-semibold text-muted-foreground">Nenhum dado registrado neste período.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        processedRows.map((row: any, idx: number) => {
                          const isPositive = row.profit >= 0;
                          const hasSale = row.conversions > 0;
                          
                          const renderCell = (colId: string) => {
                            try {
                              switch (colId) {
                                case 'date': 
                                  const content = (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-foreground uppercase tracking-wider cursor-default">
                                        {format(new Date(row.date + 'T12:00:00'), "dd/MM/yy")}
                                      </span>
                                      {row.changes && Array.isArray(row.changes) && row.changes.length > 0 && (
                                        <Popover>
                                          <PopoverTrigger>
                                            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center cursor-pointer hover:bg-blue-500/20 transition-colors ring-1 ring-blue-500/20">
                                              <BellRing className="w-3 h-3 text-blue-500" />
                                            </div>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-80 p-0 shadow-xl border border-border bg-card overflow-hidden" align="start">
                                            <div className="bg-blue-500/5 border-b border-border p-3 flex items-center gap-2">
                                              <BellRing className="w-4 h-4 text-blue-500" />
                                              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Modificações do Dia</span>
                                              <span className="ml-auto text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold">{row.changes.length}</span>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-border">
                                              {row.changes.map((change: any, i: number) => (
                                                <div key={i} className="flex flex-col gap-1 p-2 rounded-md bg-muted/30 border border-border/50">
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-blue-500">{change.time}</span>
                                                    <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{change.user}</span>
                                                  </div>
                                                  <span className="text-xs font-semibold text-foreground">{change.description}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                    </div>
                                  );

                                  return row.note ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="inline-flex">
                                          {content}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-xs bg-amber-500/10 border-amber-500/20 text-amber-500 font-medium">
                                        <p>{row.note}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : content;
                                case 'impressions': return formatNumber(row.impressions);
                                case 'clicks': return formatNumber(row.clicks);
                                case 'checkouts': return (
                                  <EditableMetricCell
                                    campaignId={selectedCampaignId!}
                                    date={row.date}
                                    initialValue={Number(row.checkout_conversions)}
                                    field="override_checkouts"
                                    token={token!}
                                    format={formatNumber}
                                    type="integer"
                                  />
                                );
                                case 'top_share': return formatPercent(row.top_share);
                                case 'abs_top_share': return formatPercent(row.abs_top_share);
                                case 'impression_share': return formatPercent(row.impression_share);
                                case 'cpc': return formatCurrency(row.cpc);
                                case 'budget': return formatCurrency(row.budget);
                                case 'target_cpa': return campaignInfo.target_cpa ? formatCurrency(campaignInfo.target_cpa) : "-";
                                case 'cost': return formatCurrency(row.cost);
                                case 'conversion_value': return (
                                  <EditableMetricCell
                                    campaignId={selectedCampaignId!}
                                    date={row.date}
                                    initialValue={Number(row.conversion_value)}
                                    field="override_conversion_value"
                                    token={token!}
                                    format={formatCurrency}
                                    type="currency"
                                  />
                                );
                                case 'conversions': return (
                                  <EditableMetricCell
                                    campaignId={selectedCampaignId!}
                                    date={row.date}
                                    initialValue={Number(row.conversions)}
                                    field="override_conversions"
                                    token={token!}
                                    format={formatNumber}
                                    type="currency"
                                  />
                                );
                                case 'checkouts_per_conversion': return formatNumber(Number(row.conversions) > 0 ? Number(row.checkout_conversions) / Number(row.conversions) : 0);
                                case 'profit': return (
                                  <div className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-bold inline-block min-w-[70px] text-center",
                                    row.cumulativeProfit >= 0 
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  )}>
                                    {formatCurrency(row.cumulativeProfit)}
                                  </div>
                                );
                                case 'notes': return (
                                  <NoteCell 
                                    campaignId={selectedCampaignId!} 
                                    date={row.date} 
                                    initialNote={row.note || ''} 
                                    token={token!}
                                  />
                                );
                                default: return "-";
                              }
                            } catch (err) {
                              console.error(`Error rendering cell ${colId}:`, err);
                              return "-";
                            }
                          };

                          const hasNote = Boolean(row.note);

                          return (
                            <tr key={idx} className={cn(
                              "group transition-colors",
                              hasNote ? "bg-amber-500/[0.08] hover:bg-amber-500/[0.15]" : hasSale ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "hover:bg-muted/50"
                            )}>
                              {orderedColumns.map((col) => {
                                return (
                                  <td 
                                    key={col.id} 
                                    className={cn(
                                      "px-4 py-2 text-[13px] font-medium text-muted-foreground whitespace-nowrap border-r border-border/50 last:border-0",
                                      col.pinned && "sticky z-10 border-r border-border shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]",
                                      col.pinned && hasNote ? "border-l-4 border-l-amber-400 bg-amber-50 dark:bg-amber-950/30 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors" :
                                      col.pinned && hasSale ? "bg-[#e6f4ea] dark:bg-[#0d2a1b] group-hover:bg-[#d4edd9] dark:group-hover:bg-[#133d27]" : 
                                      col.pinned ? "bg-card group-hover:bg-muted/50 transition-colors" : "",
                                      col.id === 'profit' && "font-black bg-[#ff8c00]/[0.02]"
                                    )}
                                    style={{ left: col.pinned ? col.offset : undefined }}
                                  >
                                    {renderCell(col.id)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className={cn("h-full w-full flex flex-col items-center justify-center p-8 relative overflow-hidden", theme.pageBg)}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff8c00]/5 rounded-full blur-[120px] pointer-events-none" />
            <Target className="w-16 h-16 text-[#ff8c00]/50 mb-6 relative z-10" />
            <h2 className={cn("text-3xl font-black tracking-tight mb-2", theme.textPrimary)}>
              Inteligência <span className="text-[#ff8c00]">Fênix</span>
            </h2>
            <p className={cn("text-sm mb-6", theme.textMuted)}>
              Selecione uma campanha para visualizar a tabela de alta performance.
            </p>
          </div>
        )}
      </MasterDetailLayout.Content>
    </MasterDetailLayout>

    {/* ── Export Modal ── */}
    {showExporter && selectedCampaignId && (
      <GoogleAdsExporter
        campaignName={selectedCampaign?.name ?? String(selectedCampaignId)}
        trackerName={selectedCampaign?.trackerName}
        dateFrom={dateRange.from}
        dateTo={dateRange.to}
        stats={stats}
        rows={processedRows}
        onClose={() => setShowExporter(false)}
      />
    )}
    </MetricsErrorBoundary>
  );

  } catch (err) {
    console.error("FATAL RENDER ERROR IN GoogleAdsMetrics:", err);
    return <div className="p-8 text-red-500 border border-red-500 bg-red-500/10">ERRO FATAL NA RENDERIZAÇÃO: {String(err)}</div>;
  }
};

export default GoogleAdsMetrics;
