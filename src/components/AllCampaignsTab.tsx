import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGoogleAdsAccounts, linkCampaignTracker } from '@/services/googleAdsApi';
import { fetchTrackers } from '@/services/api';
import { GoogleAdsCampaign, GoogleAdsAccount } from '@/types/googleAds';
import { Tracker } from '@/types/tracker';
import { format } from 'date-fns';
import {
  Search, Link2, AlertTriangle, Eye, Building2, 
  BarChart3, Loader2, AlertCircle, ChevronRight,
  DollarSign, MousePointer, TrendingUp, ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DecryptedText } from '@/components/DecryptedText';

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
          <Skeleton className="h-8 w-8 rounded-lg mb-2" />
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.2)] hover:-translate-y-1 transition-all duration-300 relative group isolate overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      <CardContent className="p-3 relative z-10">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', bgColor)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <p className="text-[10px] text-muted-foreground mb-0.5">{title}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
};

interface AllCampaignsTabProps {
  dateRange: { from: Date; to: Date };
  onViewMetrics?: (campaignId: number) => void;
}

const AllCampaignsTab: React.FC<AllCampaignsTabProps> = ({ dateRange, onViewMetrics }) => {
  const { token } = useAuth();
  const { isPrivacyMode } = usePrivacy();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<GoogleAdsCampaign | null>(null);
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>('');

  const { data: googleAdsData, isLoading: isLoadingAds } = useQuery({
    queryKey: ['googleAdsCampaignsTab', format(dateRange.from, 'yyyy-MM-dd'), format(dateRange.to, 'yyyy-MM-dd')],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
    }),
    enabled: !!token,
  });

  const { data: trackersData } = useQuery({
    queryKey: ['trackers'],
    queryFn: () => fetchTrackers(token!),
    enabled: !!token,
  });

  const trackers: Tracker[] = useMemo(() => {
    if (!trackersData) return [];
    return Array.isArray(trackersData?.data)
      ? trackersData.data as any
      : (trackersData?.data as any)?.data || [];
  }, [trackersData]);

  const accounts = googleAdsData?.data || [];

  const filteredAccounts = selectedAccountId
    ? accounts.filter(a => a.id === selectedAccountId)
    : accounts;

  const allCampaigns = useMemo(() => {
    const campaigns: Array<GoogleAdsCampaign & { accountName: string }> = [];
    filteredAccounts.forEach(account => {
      account.campaigns.forEach(campaign => {
        // Search filter
        if (searchTerm && !campaign.name.toLowerCase().includes(searchTerm.toLowerCase())) return;
        // Link filter
        if (filterMode === 'linked' && !campaign.tracker_id) return;
        if (filterMode === 'unlinked' && campaign.tracker_id) return;
        campaigns.push({ ...campaign, accountName: account.name });
      });
    });
    return campaigns;
  }, [filteredAccounts, searchTerm, filterMode]);

  const totals = useMemo(() => {
    let totalCost = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0, totalConversionValue = 0, totalCheckouts = 0;
    allCampaigns.forEach(campaign => {
      totalCost += parseFloat(campaign.snapshots_sum_cost as any) || 0;
      totalImpressions += Number(campaign.snapshots_sum_impressions) || 0;
      totalClicks += Number(campaign.snapshots_sum_clicks) || 0;
      totalConversions += Number(campaign.snapshots_sum_conversions) || 0;
      totalConversionValue += parseFloat(campaign.snapshots_sum_conversion_value as any) || 0;
      totalCheckouts += Number(campaign.snapshots_sum_checkout_conversions) || 0;
    });
    return { totalCost, totalImpressions, totalClicks, totalConversions, totalConversionValue, totalCheckouts };
  }, [allCampaigns]);

  const linkedCount = useMemo(() => {
    let linked = 0, unlinked = 0;
    (googleAdsData?.data || []).forEach(account => {
      account.campaigns.forEach(c => {
        if (c.tracker_id) linked++;
        else unlinked++;
      });
    });
    return { linked, unlinked, total: linked + unlinked };
  }, [googleAdsData]);

  const linkMutation = useMutation({
    mutationFn: ({ campaignId, trackerId }: { campaignId: number; trackerId: number }) =>
      linkCampaignTracker(token!, campaignId, trackerId),
    onSuccess: () => {
      toast({ title: 'Sucesso!', description: 'Tracker vinculado à campanha com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['googleAdsCampaignsTab'] });
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
      queryClient.invalidateQueries({ queryKey: ['googleAds'] });
      setLinkDialogOpen(false);
      setSelectedCampaign(null);
      setSelectedTrackerId('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message || 'Falha ao vincular tracker.', variant: 'destructive' });
    },
  });

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

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 lg:px-10">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background/50 border-border/50"
          />
        </div>

        <Select
          value={selectedAccountId?.toString() || 'all'}
          onValueChange={(value) => setSelectedAccountId(value === 'all' ? null : Number(value))}
          disabled={isLoadingAds}
        >
          <SelectTrigger className="w-full sm:w-48 h-9 bg-background/50 border-border/50">
            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                <DecryptedText value={account.name} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 bg-card/50 rounded-lg border border-border/50 p-0.5">
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              filterMode === 'all' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todas ({linkedCount.total})
          </button>
          <button
            onClick={() => setFilterMode('linked')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              filterMode === 'linked' ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Vinculadas ({linkedCount.linked})
          </button>
          <button
            onClick={() => setFilterMode('unlinked')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              filterMode === 'unlinked' ? "bg-amber-500 text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Sem vínculo ({linkedCount.unlinked})
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 px-6 lg:px-10 stagger-fade-in">
        <MetricCard title="Custo Total" value={formatCurrency(totals.totalCost)} icon={DollarSign} color="text-red-500" bgColor="bg-red-500/10" isLoading={isLoadingAds} />
        <MetricCard title="Impressões" value={formatNumber(totals.totalImpressions)} icon={Eye} color="text-blue-500" bgColor="bg-blue-500/10" isLoading={isLoadingAds} />
        <MetricCard title="Cliques" value={formatNumber(totals.totalClicks)} icon={MousePointer} color="text-emerald-500" bgColor="bg-emerald-500/10" isLoading={isLoadingAds} />
        <MetricCard title="Conversões" value={formatNumber(totals.totalConversions)} icon={TrendingUp} color="text-purple-500" bgColor="bg-purple-500/10" isLoading={isLoadingAds} />
        <MetricCard title="Valor Conv." value={formatCurrency(totals.totalConversionValue)} icon={DollarSign} color="text-emerald-500" bgColor="bg-emerald-500/10" isLoading={isLoadingAds} />
        <MetricCard title="Checkouts" value={formatNumber(totals.totalCheckouts)} icon={ShoppingCart} color="text-orange-500" bgColor="bg-orange-500/10" isLoading={isLoadingAds} />
      </div>

      {/* Campaigns Table */}
      <div className="px-6 lg:px-10">
        <div className="sf-card-glass p-0 overflow-hidden border-border/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Campanha</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Conta</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Custo</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Conv.</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Valor Conv.</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Produto</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {isLoadingAds ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                ) : allCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                        <span className="text-muted-foreground">Nenhuma campanha encontrada.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allCampaigns.map((campaign) => {
                    const cost = parseFloat(campaign.snapshots_sum_cost as any) || 0;
                    const conversions = Number(campaign.snapshots_sum_conversions) || 0;
                    const convValue = parseFloat(campaign.snapshots_sum_conversion_value as any) || 0;

                    return (
                      <tr
                        key={campaign.id}
                        className="group hover:bg-primary/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-sm font-medium text-foreground truncate max-w-[280px]",
                              isPrivacyMode && "blur-md select-none"
                            )}>
                              <DecryptedText value={campaign.name} />
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {STRATEGY_LABELS[campaign.bidding_strategy] || campaign.bidding_strategy?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            "text-xs text-muted-foreground",
                            isPrivacyMode && "blur-sm select-none"
                          )}>
                            <DecryptedText value={campaign.accountName} />
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-sm font-mono font-medium text-rose-400">{formatCurrency(cost)}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-sm font-mono">{formatNumber(conversions)}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-sm font-mono text-emerald-400">{formatCurrency(convValue)}</span>
                        </td>
                        <td className="px-5 py-3">
                          {campaign.tracker_id ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                              <Link2 className="w-3 h-3 mr-1" />
                              {campaign.tracker?.name || 'Vinculado'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10 text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Sem vínculo
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!campaign.tracker_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => handleLinkClick(campaign)}
                              >
                                <Link2 className="w-3.5 h-3.5 mr-1" />
                                Vincular
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-primary hover:bg-primary/10"
                              onClick={() => navigate(`/dashboard/campanhas/${campaign.id}?from=${format(dateRange.from, 'yyyy-MM-dd')}&to=${format(dateRange.to, 'yyyy-MM-dd')}`)}
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Link Tracker Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular a Produto</DialogTitle>
            <DialogDescription>
              Selecione o produto para vincular à campanha "{selectedCampaign?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedTrackerId} onValueChange={setSelectedTrackerId}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
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
    </div>
  );
};

export default AllCampaignsTab;
