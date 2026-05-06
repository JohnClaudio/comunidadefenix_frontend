import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useQuery } from '@tanstack/react-query';
import { fetchTrackers, createTracker, updateTracker, deleteTracker, fetchPlatforms, updateTrackerMiningStatus, fetchUnlinkedCampaignsCount } from '@/services/api';
import { Tracker, TrackerFormData } from '@/types/tracker';
import TrackerCard from '@/components/TrackerCard';
import TrackerModal from '@/components/TrackerModal';
import ProductCampaignsModal from '@/components/ProductCampaignsModal';
import GoogleAdsMetrics from '@/pages/GoogleAdsMetrics';
import SmartProductSuggestions from '@/components/SmartProductSuggestions';
import AllCampaignsTab from '@/components/AllCampaignsTab';
import { Loader2, RefreshCw, Crosshair, Plus, Search, LayoutGrid, CheckCircle2, XCircle, Edit2, Link as LinkIcon, Eye, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Calendar, TrendingUp, TrendingDown, DollarSign, Wallet, Percent, Target, Sparkles, ListMusic, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { MasterDetailLayout } from '@/components/layout/MasterDetailLayout';
import { cn } from '@/lib/utils';
import { DecryptedText } from '@/components/DecryptedText';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type TabView = 'products' | 'campaigns';

const Trackers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('products');
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState<Tracker | null>(null);
  const [trackerToDelete, setTrackerToDelete] = useState<Tracker | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Tracker | null, direction: 'asc' | 'desc' }>({ 
    key: 'total_cost', 
    direction: 'desc' 
  });
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // New Modals/Views State
  const [linkingCampaignsFor, setLinkingCampaignsFor] = useState<Tracker | null>(null);
  const [viewingCampaignsFor, setViewingCampaignsFor] = useState<Tracker | null>(null);
  const [viewingCampaignMetrics, setViewingCampaignMetrics] = useState<number | null>(null);
  
  const [systemPlatforms, setSystemPlatforms] = useState<any[]>([]);

  const { token } = useAuth();
  const { isPrivacyMode } = usePrivacy();
  const { toast } = useToast();

  const { data: unlinkedCountData } = useQuery({
    queryKey: ['unlinkedCampaignsCount'],
    queryFn: () => fetchUnlinkedCampaignsCount(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });
  const pendingCount = unlinkedCountData?.count || 0;

  const loadTrackers = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);

    try {
      const response = await fetchTrackers(token, {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd'),
      });
      setTrackers(response.data.data);
    } catch (err) {
      console.error('Error loading trackers:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os trackers.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, toast, dateRange]);

  useEffect(() => {
    loadTrackers();
  }, [loadTrackers]);

  useEffect(() => {
    if (token) {
      fetchPlatforms(token).then(setSystemPlatforms).catch(console.error);
    }
  }, [token]);

  const handleOpenCreate = () => {
    setSelectedTracker(null);
    setIsSuggestionsModalOpen(true);
  };

  const handleCreateFromZero = () => {
    setIsSuggestionsModalOpen(false);
    setSelectedTracker(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tracker: Tracker) => {
    setSelectedTracker(tracker);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTracker(null);
  };

  const handleSave = async (data: TrackerFormData) => {
    if (!token) return null;
    setIsSubmitting(true);
    try {
      if (selectedTracker) {
        const response = await updateTracker(token, selectedTracker.id, data);
        toast({ title: 'Sucesso', description: 'Tracker atualizado com sucesso!' });
        return response.data;
      } else {
        const response = await createTracker(token, data);
        toast({ title: 'Sucesso', description: 'Tracker criado com sucesso!' });
        return response.data;
      }
    } catch (err) {
      console.error('Error saving tracker:', err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o tracker.' });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !trackerToDelete) return;
    try {
      await deleteTracker(token, trackerToDelete.id);
      toast({ title: 'Sucesso', description: 'Tracker excluído com sucesso!' });
      setTrackerToDelete(null);
      loadTrackers();
    } catch (err) {
      console.error('Error deleting tracker:', err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir o tracker.' });
    }
  };

  const platformsList = useMemo(() => {
    const unique = new Map<number, { id: number; name: string; logo: string }>();
    trackers.forEach(t => {
      if (t.platform) {
        unique.set(t.platform.id, t.platform);
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [trackers]);

  const displayTrackers = useMemo(() => {
    return trackers.filter((tracker) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          tracker.name.toLowerCase().includes(query) ||
          tracker.uuid.toLowerCase().includes(query) ||
          (tracker.platform?.name || '').toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Status filter
      if (statusFilter === 'active' && !tracker.active) return false;
      if (statusFilter === 'inactive' && tracker.active) return false;

      // 3. Platform filter
      if (platformFilter !== 'all') {
        if (!tracker.platform || tracker.platform.id.toString() !== platformFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [trackers, searchQuery, statusFilter, platformFilter, sortConfig]);

  const handleSort = (key: keyof Tracker) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const activeCount = trackers.filter(t => t.active).length;
  const inactiveCount = trackers.length - activeCount;

  const FilterItem = ({ label, count, active, onClick, icon: Icon, colorClass }: any) => (
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
        {Icon && <Icon className={cn("w-4 h-4", active ? colorClass || "text-primary" : "text-muted-foreground group-hover:text-foreground/70")} />}
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
        )}>
          {count}
        </span>
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="sf-ai-orb" style={{ width: 48, height: 48 }}>
            <div className="absolute inset-[3px] rounded-full bg-background z-10" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando trackers...</p>
        </div>
      </div>
    );
  }

  if (viewingCampaignMetrics) {
    return (
      <GoogleAdsMetrics 
        inlineCampaignId={viewingCampaignMetrics} 
        onBack={() => setViewingCampaignMetrics(null)} 
      />
    );
  }

  return (
    <MasterDetailLayout>
      {/* Secondary Sidebar (Filters) */}
      <MasterDetailLayout.Sidebar title="Arsenal de Produtos">
        {/* Tab Navigation */}
        <div className="space-y-0.5 mb-4 pb-4 border-b border-border/40">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group mb-0.5",
              activeTab === 'products'
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Package className={cn("w-4 h-4", activeTab === 'products' ? "text-primary" : "text-muted-foreground group-hover:text-foreground/70")} />
              <span>Produtos</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group mb-0.5",
              activeTab === 'campaigns'
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2.5">
              <ListMusic className={cn("w-4 h-4", activeTab === 'campaigns' ? "text-primary" : "text-muted-foreground group-hover:text-foreground/70")} />
              <span>Campanhas</span>
            </div>
          </button>
        </div>

        {activeTab === 'products' && (
        <>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no arsenal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/20 h-9"
          />
        </div>

        <div className="space-y-0.5">
          <FilterItem
            label="Todos os Produtos"
            count={trackers.length}
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            icon={LayoutGrid}
          />
          <FilterItem
            label="Ativos"
            count={activeCount}
            active={statusFilter === 'active'}
            onClick={() => setStatusFilter('active')}
            icon={CheckCircle2}
            colorClass="text-emerald-400"
          />
          <FilterItem
            label="Inativos"
            count={inactiveCount}
            active={statusFilter === 'inactive'}
            onClick={() => setStatusFilter('inactive')}
            icon={XCircle}
            colorClass="text-red-400"
          />
        </div>

        <div className="mt-6 border-t border-border/40 pt-6">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-3">
            Plataformas
          </h3>
          <div className="space-y-0.5 max-h-[300px] overflow-y-auto no-scrollbar pb-4">
            <FilterItem
              label="Todas Plataformas"
              active={platformFilter === 'all'}
              onClick={() => setPlatformFilter('all')}
              icon={LayoutGrid}
            />
            {platformsList.map(p => {
              // Count how many trackers use this platform
              const count = trackers.filter(t => t.platform?.id === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatformFilter(p.id.toString())}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group mb-0.5",
                    platformFilter === p.id.toString()
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={p.logo}
                      alt={p.name}
                      className={cn(
                        "w-4 h-4 rounded-sm object-contain",
                        platformFilter === p.id.toString() ? "" : "opacity-60 group-hover:opacity-100"
                      )}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span>{p.name}</span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium ml-2",
                    platformFilter === p.id.toString() ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        </>
        )}

        {activeTab !== 'products' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
            <div className="p-3 rounded-xl bg-secondary/30 mb-3">
              {activeTab === 'campaigns' ? <ListMusic className="w-6 h-6 text-muted-foreground/50" /> : <Sparkles className="w-6 h-6 text-amber-400/50" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'campaigns' ? 'Use os filtros na área principal para explorar campanhas.' : 'A IA analisa as campanhas sem vínculo e sugere agrupamentos.'}
            </p>
          </div>
        )}
      </MasterDetailLayout.Sidebar>

      {/* Main Content Body */}
      <MasterDetailLayout.Content>
        <MasterDetailLayout.Header
          className="px-6 lg:px-10"
          title={
            activeTab === 'campaigns' ? 'Todas as Campanhas' :
            statusFilter === 'all' ? 'Todos os Produtos' :
              statusFilter === 'active' ? 'Produtos em Combate' : 'Produtos em Repouso'
          }
          description={
            activeTab === 'campaigns' ? 'Visualize e vincule todas as suas campanhas Google Ads a produtos.' :
            'Gerencie seus produtos e agrupe as métricas das campanhas vinculadas.'
          }
        >
          <div className="flex items-center gap-3">
            {/* Date Picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 border-border bg-background/50 text-xs font-medium">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0 border border-border shadow-2xl">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
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

            <Button
              variant="outline"
              onClick={loadTrackers}
              disabled={isLoading}
              className="gap-2 hidden sm:flex h-9"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Atualizar
            </Button>
            <Button onClick={handleOpenCreate} className="gap-2 shadow-lg shadow-primary/20 h-9 relative">
              <Plus className="w-4 h-4" />
              Novo Produto
              {pendingCount > 0 && (
                <span className="ml-1 text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full font-bold">
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </Button>
          </div>
        </MasterDetailLayout.Header>

        <MasterDetailLayout.Body>
          {activeTab === 'campaigns' && (
            <AllCampaignsTab dateRange={dateRange} />
          )}

          {/* === TAB: Products (original content) === */}
          {activeTab === 'products' && (<>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-6 lg:px-10 mb-8 stagger-fade-in">
            <div className="sf-stat-card bg-card/40 backdrop-blur-md" style={{ "--accent-color": "hsl(var(--primary))" } as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Investimento Total</p>
                  <h3 className="text-xl font-black text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayTrackers.reduce((acc, t) => acc + (t.total_cost || 0), 0))}
                  </h3>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> No período selecionado
              </p>
            </div>

            <div className="sf-stat-card bg-card/40 backdrop-blur-md" style={{ "--accent-color": "hsl(var(--sf-green))" } as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Lucro Líquido</p>
                  <h3 className={cn(
                    "text-xl font-black",
                    displayTrackers.reduce((acc, t) => acc + (t.total_profit || 0), 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayTrackers.reduce((acc, t) => acc + (t.total_profit || 0), 0))}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {displayTrackers.reduce((acc, t) => acc + (t.total_profit || 0), 0) >= 0 
                  ? <TrendingUp className="w-3 h-3 text-emerald-500" /> 
                  : <TrendingDown className="w-3 h-3 text-rose-500" />
                }
                <span className="text-[10px] text-muted-foreground font-medium">Performance global</span>
              </div>
            </div>

            <div className="sf-stat-card bg-card/40 backdrop-blur-md" style={{ "--accent-color": "hsl(var(--sf-blue))" } as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">ROI Médio</p>
                  <h3 className={cn("text-xl font-black", 
                      (displayTrackers.reduce((acc, t) => acc + (t.total_cost || 0), 0) > 0 
                      ? (displayTrackers.reduce((acc, t) => acc + (t.total_profit || 0), 0) / displayTrackers.reduce((acc, t) => acc + (t.total_cost || 0), 0)) * 100
                      : 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {(displayTrackers.reduce((acc, t) => acc + (t.total_cost || 0), 0) > 0 
                      ? (displayTrackers.reduce((acc, t) => acc + (t.total_profit || 0), 0) / displayTrackers.reduce((acc, t) => acc + (t.total_cost || 0), 0)) * 100
                      : 0).toFixed(2)}%
                  </h3>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Percent className="w-4 h-4 text-blue-500" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 font-medium">
                Retorno sobre investimento
              </p>
            </div>

            <div className="sf-stat-card bg-card/40 backdrop-blur-md" style={{ "--accent-color": "hsl(var(--sf-purple))" } as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Produtos Lucrativos</p>
                  <h3 className="text-xl font-black text-foreground">
                    {displayTrackers.filter(t => (t.total_profit || 0) > 0).length} / {displayTrackers.length}
                  </h3>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Target className="w-4 h-4 text-purple-500" />
                </div>
              </div>
              <div className="w-full bg-muted/30 h-1 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full transition-all duration-1000" 
                  style={{ width: `${(displayTrackers.filter(t => (t.total_profit || 0) > 0).length / Math.max(displayTrackers.length, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Results Info */}
          {searchQuery && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6 bg-card/50 px-4 py-2 rounded-lg border border-border/50 inline-flex">
              <Search className="w-4 h-4" />
              <span>{displayTrackers.length} resultado(s) para "{searchQuery}"</span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline text-xs ml-2 font-medium"
              >
                Limpar
              </button>
            </div>
          )}

          {/* List View (Table) */}
          {displayTrackers.length > 0 ? (
            <div className="px-6 lg:px-10 stagger-fade-in">
              <div className="sf-card-glass p-0 overflow-hidden border-border/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[160px]">Plataforma</th>
                        <th 
                          className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Produto
                            {sortConfig.key === 'name' ? (
                              sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            ) : <ArrowUpDown size={10} className="opacity-30" />}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Garimpagem</th>
                        <th 
                          className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleSort('campaigns_count')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Campanhas
                            {sortConfig.key === 'campaigns_count' ? (
                              sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            ) : <ArrowUpDown size={10} className="opacity-30" />}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Tendência</th>
                        <th 
                          className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleSort('total_cost')}
                        >
                          <div className="flex items-center gap-2">
                            Custo (30d)
                            {sortConfig.key === 'total_cost' ? (
                              sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            ) : <ArrowUpDown size={10} className="opacity-30" />}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleSort('total_profit')}
                        >
                          <div className="flex items-center gap-2">
                            Lucro (30d)
                            {sortConfig.key === 'total_profit' ? (
                              sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            ) : <ArrowUpDown size={10} className="opacity-30" />}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 stagger-fade-in">
                      {displayTrackers.map((tracker) => {
                        const isActive = tracker.active;
                        return (
                          <tr 
                            key={tracker.id} 
                            className="group hover:bg-primary/[0.02] transition-colors"
                          >
                            <td className="px-6 py-4">
                              <Select
                                value={tracker.platform?.id?.toString() || 'none'}
                                onValueChange={async (value) => {
                                  const newPlatformId = value === 'none' ? undefined : Number(value);
                                  try {
                                    await updateTracker(token!, tracker.id, { 
                                      name: tracker.name,
                                      pixel: tracker.pixel || undefined,
                                      pixel_checkout: tracker.pixel_checkout || undefined,
                                      checkout_type: tracker.checkout_type,
                                      checkout_url_match: tracker.checkout_url_match || undefined,
                                      script_type: tracker.script_type,
                                      platform_id: newPlatformId
                                    });
                                    toast({ title: 'Sucesso', description: 'Plataforma atualizada!' });
                                    loadTrackers();
                                  } catch (err) {
                                    toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar a plataforma.' });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[150px] h-9 text-xs bg-background/80 border-border/50">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sem Plataforma</SelectItem>
                                  {systemPlatforms.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <img src={p.logo} alt={p.name} className="w-4 h-4 object-contain" />
                                        <span>{p.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {tracker.platform ? (
                                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 p-1.5">
                                    <img
                                      src={tracker.platform.logo}
                                      alt={tracker.platform.name}
                                      className="w-full h-full object-contain"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-secondary/80 border border-border flex items-center justify-center shrink-0">
                                    <Crosshair className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className={cn(
                                    "text-sm font-extrabold text-foreground transition-all duration-300",
                                    isPrivacyMode ? "blur-md select-none" : ""
                                  )}>
                                    <DecryptedText value={tracker.name} />
                                  </span>
                                  <span className={cn(
                                    "text-[10px] text-muted-foreground font-medium transition-all duration-300",
                                    isPrivacyMode ? "blur-sm select-none" : ""
                                  )}>
                                    {tracker.platform?.name || 'Sem Plataforma'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  isActive ? "bg-emerald-500 shadow-[0_0_8px_hsl(var(--sf-green))]" : "bg-red-500"
                                )} />
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  isActive ? "text-emerald-500" : "text-red-500"
                                )}>
                                  {isActive ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={tracker.mining_status || ''}
                                onChange={async (e) => {
                                  const val = e.target.value || null;
                                  try {
                                    await updateTrackerMiningStatus(token!, tracker.id, val);
                                    setTrackers(prev => prev.map(t => t.id === tracker.id ? { ...t, mining_status: val as any } : t));
                                    toast({ title: 'Sucesso', description: 'Status de garimpagem atualizado!' });
                                  } catch (err) {
                                    toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar status.' });
                                  }
                                }}
                                className="text-[10px] font-bold rounded-full px-2.5 py-1 cursor-pointer border outline-none bg-transparent"
                                style={{
                                  background: tracker.mining_status === 'validado' ? '#22c55e15' : tracker.mining_status === 'nao_validou' ? '#ef444415' : tracker.mining_status === 'em_teste' ? '#f59e0b15' : 'transparent',
                                  color: tracker.mining_status === 'validado' ? '#22c55e' : tracker.mining_status === 'nao_validou' ? '#ef4444' : tracker.mining_status === 'em_teste' ? '#f59e0b' : '#888',
                                  borderColor: tracker.mining_status === 'validado' ? '#22c55e40' : tracker.mining_status === 'nao_validou' ? '#ef444440' : tracker.mining_status === 'em_teste' ? '#f59e0b40' : '#33333340',
                                }}
                              >
                                <option value="">—</option>
                                <option value="em_teste">Em Teste</option>
                                <option value="validado">Validado</option>
                                <option value="nao_validou">Não Validou</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-bold text-foreground">
                                {tracker.campaigns_count || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 min-w-[120px]">
                              <div className="h-10 w-24">
                                {tracker.daily_metrics && tracker.daily_metrics.length > 1 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={tracker.daily_metrics}>
                                      <Line 
                                        type="monotone" 
                                        dataKey="profit" 
                                        stroke="hsl(var(--sf-green))" 
                                        strokeWidth={2} 
                                        dot={false} 
                                        isAnimationActive={false}
                                      />
                                      <Line 
                                        type="monotone" 
                                        dataKey="cost" 
                                        stroke="#ef4444" 
                                        strokeWidth={1} 
                                        strokeDasharray="3 3"
                                        dot={false} 
                                        isAnimationActive={false}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center border border-dashed border-border/40 rounded-md">
                                    <span className="text-[8px] text-muted-foreground uppercase font-bold">Sem Dados</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-rose-500">
                                {tracker.total_cost ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tracker.total_cost) : 'R$ 0,00'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-sm font-bold",
                                (tracker.total_profit || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                              )}>
                                {tracker.total_profit ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tracker.total_profit) : 'R$ 0,00'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setLinkingCampaignsFor(tracker)}
                                        className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-500/20 hover:scale-110 transition-all"
                                      >
                                        <LinkIcon size={16} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-emerald-600 text-white border-0">
                                      Vincular Campanhas
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setViewingCampaignsFor(tracker)}
                                        className="h-8 w-8 p-0 text-indigo-400 hover:bg-indigo-500/20 hover:scale-110 transition-all"
                                      >
                                        <Eye size={16} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-indigo-600 text-white border-0">
                                      Ver Campanhas
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenEdit(tracker)}
                                        className="h-8 w-8 p-0 text-primary hover:bg-primary/20 hover:scale-110 transition-all"
                                      >
                                        <Edit2 size={16} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-primary text-white border-0">
                                      Editar Produto
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setTrackerToDelete(tracker)}
                                        className="h-8 w-8 p-0 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 hover:scale-110 transition-all"
                                      >
                                        <Trash2 size={16} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-red-600 text-white border-0">
                                      Excluir Produto
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center sf-card border-dashed">
              <div className="p-4 rounded-2xl bg-primary/5 mb-4">
                <Crosshair className="w-10 h-10 text-muted-foreground/40" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto no arsenal'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                {searchQuery
                  ? 'Tente buscar com outros termos ou alterne os filtros laterais.'
                  : 'Adicione seu primeiro produto ao arsenal para agrupar suas campanhas.'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={handleOpenCreate} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Criar Produto
                </Button>
              )}
            </div>
          )}
          </>)}
        </MasterDetailLayout.Body>
      </MasterDetailLayout.Content>

      {/* Modals outside the layout view flow */}
      <TrackerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        onSuccess={loadTrackers}
        tracker={selectedTracker}
        isLoading={isSubmitting}
      />

      <AlertDialog open={!!trackerToDelete} onOpenChange={() => setTrackerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{trackerToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductCampaignsModal
        isOpen={!!linkingCampaignsFor || !!viewingCampaignsFor}
        onClose={() => {
          setLinkingCampaignsFor(null);
          setViewingCampaignsFor(null);
        }}
        tracker={linkingCampaignsFor || viewingCampaignsFor}
        mode={linkingCampaignsFor ? 'link' : 'view'}
        initialDateRange={dateRange}
        onViewMetrics={(campaignId) => {
          setLinkingCampaignsFor(null);
          setViewingCampaignsFor(null);
          setViewingCampaignMetrics(campaignId);
        }}
      />
      <Dialog open={isSuggestionsModalOpen} onOpenChange={setIsSuggestionsModalOpen}>
        <DialogContent className="max-w-5xl bg-background border-border p-0 gap-0 overflow-hidden flex flex-col h-[85vh]">
          <div className="flex items-center justify-between p-6 border-b border-border shrink-0 bg-card/50">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <LinkIcon className="w-5 h-5 text-primary" />
                Agrupamentos Pendentes
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Campanhas sem vínculo detectadas pelo sistema. Revise os agrupamentos sugeridos e converta-os em produtos.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleCreateFromZero} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Criar do Zero
              </Button>
              <button onClick={() => setIsSuggestionsModalOpen(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 relative">
            <SmartProductSuggestions dateRange={dateRange} onProductCreated={() => {
              loadTrackers();
            }} />
          </div>
        </DialogContent>
      </Dialog>
    </MasterDetailLayout>
  );
};

export default Trackers;
