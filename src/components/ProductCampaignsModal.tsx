import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tracker } from '@/types/tracker';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGoogleAdsAccounts, linkCampaignTracker } from '@/services/googleAdsApi';
import { format, subDays } from 'date-fns';
import { Loader2, Search, Link as LinkIcon, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DecryptedText } from '@/components/DecryptedText';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronDown } from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface ProductCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracker: Tracker | null;
  mode: 'link' | 'view';
  onViewMetrics?: (campaignId: number) => void;
  initialDateRange?: { from: Date; to: Date };
}

const ProductCampaignsModal: React.FC<ProductCampaignsModalProps> = ({
  isOpen,
  onClose,
  tracker,
  mode,
  onViewMetrics,
  initialDateRange
}) => {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPrivacyMode } = usePrivacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: initialDateRange?.from ?? subDays(new Date(), 30),
    to: initialDateRange?.to ?? new Date(),
  });

  // Sync with parent date range when modal opens
  React.useEffect(() => {
    if (isOpen && initialDateRange) {
      setDateRange({ from: initialDateRange.from, to: initialDateRange.to });
    }
  }, [isOpen, initialDateRange]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch campaigns from last 30 days
  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ['googleAdsAccountsList_Modal', mode, tracker?.id, format(dateRange.from, 'yyyy-MM-dd'), format(dateRange.to, 'yyyy-MM-dd')],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
    }),
    enabled: !!token && isOpen,
  });

  const linkMutation = useMutation({
    mutationFn: ({ campaignId, trackerId }: { campaignId: number; trackerId: number }) =>
      linkCampaignTracker(token!, campaignId, trackerId),
    onSuccess: () => {
      toast({ title: 'Sucesso!', description: 'Campanha vinculada com sucesso.' });
      refetch();
      // Also invalidate trackers to refresh the count in the main screen
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message || 'Falha ao vincular campanha.', variant: 'destructive' });
    }
  });

  const allCampaigns = useMemo(() => {
    if (!accountsData?.data) return [];
    return accountsData.data.flatMap(acc => 
      acc.campaigns.map(camp => ({ 
        ...camp, 
        accountName: acc.name,
      }))
    );
  }, [accountsData]);

  const filteredCampaigns = useMemo(() => {
    if (!tracker) return [];
    
    let list = allCampaigns;

    // Filter by mode
    if (mode === 'link') {
      // Show campaigns that are not linked to this tracker
      // Could be linked to null or linked to another tracker, the user just wants to link it.
      list = list.filter(c => c.tracker_id !== tracker.id);
    } else {
      // mode === 'view' -> Show only campaigns linked to THIS tracker
      list = list.filter(c => c.tracker_id === tracker.id);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.accountName.toLowerCase().includes(q)
      );
    }

    // Sort by spend desc
    return list.sort((a, b) => Number(b.snapshots_sum_cost) - Number(a.snapshots_sum_cost));
  }, [allCampaigns, tracker, mode, searchQuery]);

  const formatCurrency = (val: string | number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

  const formatNumber = (val: string | number) => 
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(val) || 0);

  const formatROAS = (val: number | null) => {
    if (!val) return '0.00x';
    return `${val.toFixed(2)}x`;
  };

  const getCampaignProfit = (c: any) => {
    const cost = Number(c.snapshots_sum_cost) || 0;
    const value = Number(c.snapshots_sum_conversion_value) || 0;
    return value - cost;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 bg-card border-border overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {mode === 'link' ? <LinkIcon className="w-5 h-5 text-emerald-500" /> : <BarChart3 className="w-5 h-5 text-indigo-400" />}
            {mode === 'link' ? 'Vincular Campanhas' : 'Campanhas Vinculadas'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'link' 
              ? <span>Selecione as campanhas que deseja atrelar ao produto "<span className={cn("font-bold transition-all", isPrivacyMode && "blur-sm")}><DecryptedText value={tracker?.name || ""} /></span>".</span>
              : <span>Acompanhe a performance das campanhas vinculadas ao produto "<span className={cn("font-bold transition-all", isPrivacyMode && "blur-sm")}><DecryptedText value={tracker?.name || ""} /></span>".</span>
            }
          </DialogDescription>
          
          <div className="pt-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou conta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-background/50 border-border"
              />
            </div>

            {/* Date Picker Popover */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 border-border bg-background/50 text-xs font-medium">
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

            <div className="text-sm text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">{filteredCampaigns.length}</span> campanhas
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Buscando campanhas (30 dias)...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="p-4 rounded-full bg-secondary mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Nenhuma campanha encontrada</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Tente buscar por outro nome.' : 'Nenhuma campanha com os critérios atuais.'}
              </p>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground sticky top-0 z-10 shadow-sm backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Campanha / Conta</th>
                    <th className="px-6 py-4 font-semibold text-right">Custo</th>
                    <th className="px-6 py-4 font-semibold text-right">Vendas</th>
                    <th className="px-6 py-4 font-semibold text-right">Valor Conv.</th>
                    <th className="px-6 py-4 font-semibold text-right">ROAS / Lucro</th>
                    <th className="px-6 py-4 font-semibold text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredCampaigns.map((camp) => {
                    const profit = getCampaignProfit(camp);
                    const roas = Number(camp.snapshots_sum_cost) > 0 ? Number(camp.snapshots_sum_conversion_value) / Number(camp.snapshots_sum_cost) : 0;
                    
                    return (
                      <tr key={camp.id} className="hover:bg-secondary/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className={cn(
                            "font-medium text-foreground max-w-[250px] truncate",
                            isPrivacyMode ? "blur-md select-none" : ""
                          )} title={camp.name}>
                            <DecryptedText value={camp.name} />
                          </div>
                          <div className={cn(
                            "text-[11px] text-muted-foreground mt-0.5 truncate max-w-[250px]",
                            isPrivacyMode && "blur-sm select-none"
                          )} title={camp.accountName}>
                            Conta: {camp.accountName}
                          </div>
                          {mode === 'link' && camp.tracker_id && camp.tracker_id !== tracker?.id && (
                            <Badge variant="outline" className="mt-1 text-[9px] h-4 px-1 py-0 border-orange-500/30 text-orange-500">
                              Vinculada a outro: {camp.tracker?.name || camp.tracker_id}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-medium">
                          {formatCurrency(camp.snapshots_sum_cost)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium">
                          {formatNumber(camp.snapshots_sum_conversions)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-500">
                          {formatCurrency(camp.snapshots_sum_conversion_value)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-medium">{formatROAS(roas)}</div>
                          <div className={cn(
                            "text-[11px] font-bold mt-0.5 flex items-center justify-end gap-1",
                            profit >= 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                            {formatCurrency(profit)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center space-x-2">
                          {mode === 'link' && (
                            <Button 
                              size="sm" 
                              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm h-8 px-4"
                              disabled={linkMutation.isPending}
                              onClick={() => linkMutation.mutate({ campaignId: camp.id, trackerId: tracker!.id })}
                            >
                              {linkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vincular'}
                            </Button>
                          )}
                          {mode === 'view' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 gap-2"
                              onClick={() => onViewMetrics?.(camp.id)}
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              Métricas
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductCampaignsModal;
