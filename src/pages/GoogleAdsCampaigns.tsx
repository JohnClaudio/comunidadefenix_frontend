import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronDown, ChevronRight, AlertTriangle, Link2, Eye, MousePointer, DollarSign, ShoppingCart, TrendingUp, Building2, Search, BarChart3, Clock, AlertCircle, GripVertical, Settings2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleAdsAccounts, linkCampaignTracker } from '@/services/googleAdsApi';
import { fetchTrackers } from '@/services/api';
import { GoogleAdsAccount, GoogleAdsCampaign } from '@/types/googleAds';
import { Tracker } from '@/types/tracker';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DatePreset } from '@/types/dashboard';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import GoogleAdsCampaignDailyTable from '@/components/googleAds/GoogleAdsCampaignDailyTable';
import { MasterDetailLayout } from '@/components/layout/MasterDetailLayout';
import { DecryptedText } from '@/components/DecryptedText';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, bgColor, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-4">
          <Skeleton className="h-10 w-10 rounded-lg mb-3" />
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-6 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.2)] hover:-translate-y-1 transition-all duration-300 relative group isolate overflow-hidden">
      {/* Background Gradient Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      <CardContent className="p-4 relative z-10">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
};

// Define Column type
export type ColumnDef = {
  id: string;
  label: string;
  visible: boolean;
  align?: 'left' | 'center' | 'right';
};

// Bidding strategy translation map
const STRATEGY_LABELS: Record<string, string> = {
  TARGET_CPA: 'CPA Desejado',
  TARGET_ROAS: 'ROAS Desejado',
  MAXIMIZE_CONVERSIONS: 'Maximizar Conversões',
  MAXIMIZE_CONVERSION_VALUE: 'Maximizar Valor de Conversão',
  MANUAL_CPC: 'CPC Manual',
  MANUAL_CPM: 'CPM Manual',
  TARGET_IMPRESSION_SHARE: 'Parcela de Impressão',
  ENHANCED_CPC: 'CPC Otimizado',
  TARGET_SPEND: 'Maximizar Cliques',
  MANUAL_CPV: 'CPV Manual',
};

// Initial default columns
const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'campaign', label: 'Campanha', visible: true, align: 'left' },
  { id: 'account', label: 'Conta', visible: true, align: 'left' },
  { id: 'budget', label: 'Orçamento', visible: true, align: 'right' },
  { id: 'meta', label: 'CPA Desejado', visible: true, align: 'right' },
  { id: 'impressions', label: 'Impressões', visible: true, align: 'right' },
  { id: 'clicks', label: 'Cliques', visible: true, align: 'right' },
  { id: 'cost', label: 'Custo', visible: true, align: 'right' },
  { id: 'conversions', label: 'Conversões', visible: true, align: 'right' },
  { id: 'checkouts', label: 'Checkouts', visible: true, align: 'right' },
  { id: 'tracker', label: 'Tracker', visible: true, align: 'left' },
  { id: 'actions', label: 'Ações', visible: true, align: 'center' },
];

// Sortable Item Component for the Popover
function SortableColumnItem({
  column,
  onToggle
}: {
  column: ColumnDef;
  onToggle: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 mb-1 bg-background border border-border rounded-md shadow-sm">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">{column.label}</span>
      </div>
      <Switch
        checked={column.visible}
        onCheckedChange={() => onToggle(column.id)}
      />
    </div>
  );
}

const GoogleAdsCampaigns: React.FC = () => {
  const { token, user, mutateUser } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<DatePreset>('7d');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<GoogleAdsCampaign | null>(null);
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>('');
  const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Custom Columns State
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    let saved: ColumnDef[] | null = null;

    const raw = localStorage.getItem('sf_campaigns_columns');
    if (raw) {
      try { saved = JSON.parse(raw); } catch { /* ignore */ }
    }

    if (!saved && user?.preferences?.sf_campaigns_columns) {
      saved = user.preferences.sf_campaigns_columns;
    }

    if (!saved) return DEFAULT_COLUMNS;

    // Merge: append any new DEFAULT_COLUMNS not present in saved prefs
    const savedIds = new Set(saved.map(c => c.id));
    const newCols = DEFAULT_COLUMNS.filter(c => !savedIds.has(c.id));
    if (newCols.length > 0) {
      const actionsIdx = saved.findIndex(c => c.id === 'actions');
      if (actionsIdx >= 0) {
        saved.splice(actionsIdx, 0, ...newCols);
      } else {
        saved.push(...newCols);
      }
    }

    // Sync labels from defaults (so renames take effect)
    const labelMap = Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, c.label]));
    saved.forEach(c => { if (labelMap[c.id]) c.label = labelMap[c.id]; });

    return saved;
  });

  // Save to persistence
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    localStorage.setItem('sf_campaigns_columns', JSON.stringify(columns));

    // Debounce cloud sync
    const timeout = setTimeout(async () => {
      try {
        if (token) {
          await api.updatePreferences(token, { sf_campaigns_columns: columns });
        }
      } catch (error) {
        console.error('Failed to sync columns to cloud', error);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [columns, token]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleColumn = (id: string) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  const { data: googleAdsData, isLoading: isLoadingAds } = useQuery({
    queryKey: ['googleAds', format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(dateFrom, 'yyyy-MM-dd'),
      end_date: format(dateTo, 'yyyy-MM-dd'),
    }),
    enabled: !!token,
  });

  const { data: trackersData } = useQuery({
    queryKey: ['trackers'],
    queryFn: () => fetchTrackers(token!),
    enabled: !!token,
  });

  const trackers: Tracker[] = Array.isArray(trackersData?.data)
    ? trackersData.data
    : (trackersData?.data as { data?: Tracker[] })?.data || [];

  const linkMutation = useMutation({
    mutationFn: ({ campaignId, trackerId }: { campaignId: number; trackerId: number }) =>
      linkCampaignTracker(token!, campaignId, trackerId),
    onSuccess: () => {
      toast({ title: 'Sucesso!', description: 'Tracker vinculado à campanha com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['googleAds'] });
      setLinkDialogOpen(false);
      setSelectedCampaign(null);
      setSelectedTrackerId('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message || 'Falha ao vincular tracker.', variant: 'destructive' });
    },
  });

  const accounts = googleAdsData?.data || [];
  const filteredAccounts = selectedAccountId
    ? accounts.filter(a => a.id === selectedAccountId)
    : accounts;

  const totals = useMemo(() => {
    let totalCost = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0, totalConversionValue = 0, totalCheckouts = 0;
    filteredAccounts.forEach(account => {
      account.campaigns.forEach(campaign => {
        if (searchTerm && !campaign.name.toLowerCase().includes(searchTerm.toLowerCase())) return;
        totalCost += parseFloat(campaign.snapshots_sum_cost) || 0;
        totalImpressions += Number(campaign.snapshots_sum_impressions) || 0;
        totalClicks += Number(campaign.snapshots_sum_clicks) || 0;
        totalConversions += Number(campaign.snapshots_sum_conversions) || 0;
        totalConversionValue += parseFloat(campaign.snapshots_sum_conversion_value) || 0;
        totalCheckouts += Number(campaign.snapshots_sum_checkout_conversions) || 0;
      });
    });
    return { totalCost, totalImpressions, totalClicks, totalConversions, totalConversionValue, totalCheckouts };
  }, [filteredAccounts, searchTerm]);

  const allCampaigns = useMemo(() => {
    const campaigns: Array<GoogleAdsCampaign & { accountName: string }> = [];
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

  const handleLinkClick = (campaign: GoogleAdsCampaign) => {
    setSelectedCampaign(campaign);
    setLinkDialogOpen(true);
  };

  const handleLinkSubmit = () => {
    if (selectedCampaign && selectedTrackerId) {
      linkMutation.mutate({ campaignId: selectedCampaign.id, trackerId: parseInt(selectedTrackerId) });
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

  const FilterItem = ({ label, active, onClick, icon: Icon, badge }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group mb-0.5",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground/70")} />}
        <span>{label}</span>
      </div>
      {badge && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
        )}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <MasterDetailLayout>
      <MasterDetailLayout.Sidebar title="Google Ads Campaigns">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/20 h-9"
          />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">Conta</h3>
            <Select
              value={selectedAccountId?.toString() || 'all'}
              onValueChange={(value) => setSelectedAccountId(value === 'all' ? null : Number(value))}
              disabled={isLoadingAds}
            >
              <SelectTrigger className="w-full h-9 bg-background/50 border-border/50">
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}><DecryptedText value={account.name} /></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
              Período
            </h3>
            <div className="space-y-0.5">
              <FilterItem label="Hoje" active={activePreset === 'today'} onClick={() => handlePresetClick('today')} icon={Clock} />
              <FilterItem label="Ontem" active={activePreset === 'yesterday'} onClick={() => handlePresetClick('yesterday')} icon={Clock} />
              <FilterItem label="Últimos 7 dias" active={activePreset === '7d'} onClick={() => handlePresetClick('7d')} icon={Calendar} />
              <FilterItem label="Últimos 15 dias" active={activePreset === '15d'} onClick={() => handlePresetClick('15d')} icon={Calendar} />
              <FilterItem label="Últimos 30 dias" active={activePreset === '30d'} onClick={() => handlePresetClick('30d')} icon={Calendar} />
            </div>
            <div className="px-3 mt-3">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-9 bg-background/50", activePreset === 'custom' && "border-primary text-primary")} disabled={isLoadingAds}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {activePreset === 'custom' ? `${format(dateFrom, 'dd/MM')} - ${format(dateTo, 'dd/MM')}` : 'Personalizado'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
            </div>
          </div>
        </div>
      </MasterDetailLayout.Sidebar>

      <MasterDetailLayout.Content>
        <MasterDetailLayout.Header
          title="Campanhas Google Ads"
          description={`Resultados para: ${selectedAccountId ? accounts.find(a => a.id === selectedAccountId)?.name : 'Todas as contas'} (${format(dateFrom, 'dd MMM')} - ${format(dateTo, 'dd MMM')})`}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="w-4 h-4" />
                Personalizar Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    Colunas da Tabela
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Arraste para reordenar ou use o switch para ocultar métricas.
                  </p>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={columns.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                      {columns.map(col => (
                        <SortableColumnItem
                          key={col.id}
                          column={col}
                          onToggle={toggleColumn}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </PopoverContent>
          </Popover>
        </MasterDetailLayout.Header>

        <MasterDetailLayout.Body className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 stagger-fade-in">
            <MetricCard title="Custo Total" value={formatCurrency(totals.totalCost)} icon={DollarSign} color="text-red-500" bgColor="bg-red-500/10" isLoading={isLoadingAds} />
            <MetricCard title="Impressões" value={formatNumber(totals.totalImpressions)} icon={Eye} color="text-blue-500" bgColor="bg-blue-500/10" isLoading={isLoadingAds} />
            <MetricCard title="Cliques" value={formatNumber(totals.totalClicks)} icon={MousePointer} color="text-emerald-500" bgColor="bg-emerald-500/10" isLoading={isLoadingAds} />
            <MetricCard title="Conversões" value={formatNumber(totals.totalConversions)} icon={TrendingUp} color="text-purple-500" bgColor="bg-purple-500/10" isLoading={isLoadingAds} />
            <MetricCard title="Valor Conversões" value={formatCurrency(totals.totalConversionValue)} icon={DollarSign} color="text-emerald-500" bgColor="bg-emerald-500/10" isLoading={isLoadingAds} />
            <MetricCard title="Checkouts" value={formatNumber(totals.totalCheckouts)} icon={ShoppingCart} color="text-orange-500" bgColor="bg-orange-500/10" isLoading={isLoadingAds} />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Campaigns Table */}
            <Card className="border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {visibleColumns.map(col => (
                          <TableHead
                            key={col.id}
                            className={cn("font-semibold", col.align === 'right' ? "text-right" : col.align === 'center' ? "text-center" : "")}
                          >
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAds ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {visibleColumns.map((col) => (
                              <TableCell key={col.id}><Skeleton className="h-4 w-full" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : allCampaigns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length} className="text-center py-16">
                            <div className="flex flex-col items-center gap-3">
                              <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                              <span className="text-muted-foreground">Nenhuma campanha encontrada neste período.</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        allCampaigns.map((campaign) => {
                          const isExpanded = expandedCampaignId === campaign.id;
                          const clicks = Number(campaign.snapshots_sum_clicks) || 0;
                          const cost = parseFloat(campaign.snapshots_sum_cost) || 0;
                          const impressions = Number(campaign.snapshots_sum_impressions) || 0;
                          const conversions = Number(campaign.snapshots_sum_conversions) || 0;
                          const conversionValue = parseFloat(campaign.snapshots_sum_conversion_value) || 0;
                          const checkouts = Number(campaign.snapshots_sum_checkout_conversions) || 0;

                          return (
                            <React.Fragment key={campaign.id}>
                              <TableRow
                                className={cn('hover:bg-muted/30 cursor-pointer transition-colors', isExpanded && 'bg-muted/20 border-b-0')}
                                onClick={() => setExpandedCampaignId(isExpanded ? null : campaign.id)}
                              >
                                {visibleColumns.map((col) => {
                                  switch (col.id) {
                                    case 'campaign':
                                      return (
                                        <TableCell key={col.id}>
                                          <div className="flex items-center gap-2">
                                            <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-90')} />
                                            <div className="flex flex-col">
                                              <span className="font-medium text-foreground"><DecryptedText value={campaign.name} /></span>
                                              <span className="text-xs text-muted-foreground">{STRATEGY_LABELS[campaign.bidding_strategy] || campaign.bidding_strategy?.replace(/_/g, ' ')}</span>
                                            </div>
                                          </div>
                                        </TableCell>
                                      );
                                    case 'account':
                                      return <TableCell key={col.id}><span className="text-sm text-muted-foreground"><DecryptedText value={campaign.accountName} /></span></TableCell>;
                                    case 'impressions':
                                      return <TableCell key={col.id} className="text-right font-mono">{formatNumber(impressions)}</TableCell>;
                                    case 'clicks':
                                      return <TableCell key={col.id} className="text-right font-mono">{formatNumber(clicks)}</TableCell>;
                                    case 'cost':
                                      return <TableCell key={col.id} className="text-right font-mono text-destructive">{formatCurrency(cost)}</TableCell>;
                                    case 'conversions':
                                      return <TableCell key={col.id} className="text-right font-mono">{formatNumber(conversions)}</TableCell>;
                                    case 'checkouts':
                                      return <TableCell key={col.id} className="text-right font-mono">{formatNumber(checkouts)}</TableCell>;
                                    case 'budget':
                                      return (
                                        <TableCell key={col.id} className="text-right font-mono">
                                          {campaign.budget_daily != null ? (
                                            <div className="flex flex-col items-end">
                                              <span>{formatCurrency(campaign.budget_daily)}</span>
                                              <span className="text-[10px] text-muted-foreground">/dia</span>
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                      );
                                    case 'meta': {
                                      const strategy = campaign.bidding_strategy;
                                      let metaLabel = '';
                                      let metaValue: number | null = null;

                                      if (strategy === 'TARGET_CPA' || strategy === 'MAXIMIZE_CONVERSIONS') {
                                        metaLabel = 'CPA';
                                        metaValue = campaign.target_cpa;
                                      } else if (strategy === 'TARGET_ROAS' || strategy === 'MAXIMIZE_CONVERSION_VALUE') {
                                        metaLabel = 'ROAS';
                                        metaValue = campaign.target_roas;
                                      } else if (strategy === 'MANUAL_CPC' || strategy === 'ENHANCED_CPC' || strategy === 'TARGET_SPEND') {
                                        metaLabel = 'CPC';
                                        metaValue = campaign.max_cpc_limit;
                                      } else if (strategy === 'TARGET_IMPRESSION_SHARE') {
                                        metaLabel = 'Impr.';
                                        metaValue = campaign.target_impression_share;
                                      }

                                      return (
                                        <TableCell key={col.id} className="text-right font-mono">
                                          {metaValue != null ? (
                                            <div className="flex flex-col items-end">
                                              <span>{metaLabel === 'ROAS' ? `${metaValue}x` : formatCurrency(metaValue)}</span>
                                              <span className="text-[10px] text-muted-foreground">{metaLabel}</span>
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                      );
                                    }
                                    case 'tracker':
                                      return (
                                        <TableCell key={col.id}>
                                          {campaign.tracker_id ? (
                                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                              <Link2 className="w-3 h-3 mr-1" />
                                              {campaign.tracker?.name || 'Vinculado'}
                                            </Badge>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                Não vinculado
                                              </Badge>
                                              <Button size="sm" variant="ghost" className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); handleLinkClick(campaign); }}>
                                                <Link2 className="w-3 h-3 mr-1" />
                                                Vincular
                                              </Button>
                                            </div>
                                          )}
                                        </TableCell>
                                      );
                                    case 'actions':
                                      return (
                                        <TableCell key={col.id} className="text-center">
                                          <Button size="sm" variant="outline"
                                            className="h-7 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/campanhas/${campaign.id}?from=${format(dateFrom, 'yyyy-MM-dd')}&to=${format(dateTo, 'yyyy-MM-dd')}`); }}>
                                            Ver Detalhes
                                          </Button>
                                        </TableCell>
                                      );
                                    default:
                                      return <TableCell key={col.id} />;
                                  }
                                })}
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-muted/10 hover:bg-muted/10">
                                  <TableCell colSpan={9} className="p-0">
                                    <GoogleAdsCampaignDailyTable
                                      campaignId={campaign.id}
                                      startDate={dateFrom}
                                      endDate={dateTo}
                                      biddingStrategy={campaign.bidding_strategy}
                                    />
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </MasterDetailLayout.Body>
      </MasterDetailLayout.Content>

      {/* Link Tracker Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Tracker</DialogTitle>
            <DialogDescription>
              Selecione um tracker para vincular à campanha "{selectedCampaign?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedTrackerId} onValueChange={setSelectedTrackerId}>
              <SelectTrigger><SelectValue placeholder="Selecione um tracker..." /></SelectTrigger>
              <SelectContent>
                {trackers.map((tracker: Tracker) => (
                  <SelectItem key={tracker.id} value={tracker.id.toString()}>{tracker.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleLinkSubmit} disabled={!selectedTrackerId || linkMutation.isPending}>
              {linkMutation.isPending ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MasterDetailLayout>
  );
};

export default GoogleAdsCampaigns;
