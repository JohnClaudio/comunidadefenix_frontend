import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronDown, ChevronRight, AlertTriangle, Link2, Eye, MousePointer, DollarSign, ShoppingCart, TrendingUp, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleAdsAccounts, linkCampaignTracker } from '@/services/googleAdsApi';
import { fetchTrackers } from '@/services/api';
import { GoogleAdsAccount, GoogleAdsCampaign } from '@/types/googleAds';
import { Tracker } from '@/types/tracker';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GoogleAdsFunnel, SegmentInsights } from '@/components/googleAds';
import GoogleAdsCampaignDailyTable from '@/components/googleAds/GoogleAdsCampaignDailyTable';
import { DecryptedText } from '@/components/DecryptedText';

const GoogleAds: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<GoogleAdsCampaign | null>(null);
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>('');
  const [expandedCampaignId, setExpandedCampaignId] = useState<number | null>(null);

  // Fetch Google Ads accounts
  const { data: googleAdsData, isLoading: isLoadingAds } = useQuery({
    queryKey: ['googleAds', format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(dateFrom, 'yyyy-MM-dd'),
      end_date: format(dateTo, 'yyyy-MM-dd'),
    }),
    enabled: !!token,
  });

  // Fetch trackers for linking
  const { data: trackersData } = useQuery({
    queryKey: ['trackers'],
    queryFn: () => fetchTrackers(token!),
    enabled: !!token,
  });

  const trackers: Tracker[] = Array.isArray(trackersData?.data)
    ? trackersData.data
    : (trackersData?.data as { data?: Tracker[] })?.data || [];

  // Link campaign mutation
  const linkMutation = useMutation({
    mutationFn: ({ campaignId, trackerId }: { campaignId: number; trackerId: number }) =>
      linkCampaignTracker(token!, campaignId, trackerId),
    onSuccess: () => {
      toast({
        title: 'Sucesso!',
        description: 'Tracker vinculado à campanha com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['googleAds'] });
      setLinkDialogOpen(false);
      setSelectedCampaign(null);
      setSelectedTrackerId('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao vincular tracker.',
        variant: 'destructive',
      });
    },
  });

  // Filter accounts
  const accounts = googleAdsData?.data || [];
  const filteredAccounts = selectedAccountId
    ? accounts.filter(a => a.id === selectedAccountId)
    : accounts;

  // Calculate totals
  const totals = useMemo(() => {
    let totalCost = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalConversionValue = 0;
    let totalCheckouts = 0;

    filteredAccounts.forEach(account => {
      account.campaigns.forEach(campaign => {
        totalCost += parseFloat(campaign.snapshots_sum_cost) || 0;
        totalImpressions += Number(campaign.snapshots_sum_impressions) || 0;
        totalClicks += Number(campaign.snapshots_sum_clicks) || 0;
        totalConversions += Number(campaign.snapshots_sum_conversions) || 0;
        totalConversionValue += parseFloat(campaign.snapshots_sum_conversion_value) || 0;
        totalCheckouts += Number(campaign.snapshots_sum_checkout_conversions) || 0;
      });
    });

    return { totalCost, totalImpressions, totalClicks, totalConversions, totalConversionValue, totalCheckouts };
  }, [filteredAccounts]);

  // Get all campaigns for display
  const allCampaigns = useMemo(() => {
    const campaigns: Array<GoogleAdsCampaign & { accountName: string }> = [];
    filteredAccounts.forEach(account => {
      account.campaigns.forEach(campaign => {
        campaigns.push({ ...campaign, accountName: account.name });
      });
    });
    return campaigns;
  }, [filteredAccounts]);

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) setDateFrom(range.from);
    if (range?.to) setDateTo(range.to);
    if (range?.from && range?.to) setCalendarOpen(false);
  };

  const handleLinkClick = (campaign: GoogleAdsCampaign) => {
    setSelectedCampaign(campaign);
    setLinkDialogOpen(true);
  };

  const handleLinkSubmit = () => {
    if (selectedCampaign && selectedTrackerId) {
      linkMutation.mutate({
        campaignId: selectedCampaign.id,
        trackerId: parseInt(selectedTrackerId),
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Ads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie suas campanhas e métricas do Google Ads
          </p>
        </div>
      </div>

      {/* Tabs for Funnel and Campaigns */}
      <Tabs defaultValue="funnel" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="funnel">Funil</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="mt-6">
          <GoogleAdsFunnel />
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="mt-6">
          <SegmentInsights />
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6 space-y-6">
          {/* Campaign Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Date Range Picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[240px] justify-start text-left font-normal"
                  disabled={isLoadingAds}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(dateFrom, 'dd MMM', { locale: ptBR })} -{' '}
                  {format(dateTo, 'dd MMM yyyy', { locale: ptBR })}
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

            {/* Account Filter */}
            <Select
              value={selectedAccountId?.toString() || 'all'}
              onValueChange={(value) => setSelectedAccountId(value === 'all' ? null : Number(value))}
              disabled={isLoadingAds}
            >
              <SelectTrigger className="w-[220px]">
                <Building2 className="mr-2 h-4 w-4" />
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
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              title="Custo Total"
              value={formatCurrency(totals.totalCost)}
              icon={DollarSign}
              color="text-red-500"
              bgColor="bg-red-500/10"
              isLoading={isLoadingAds}
            />
            <MetricCard
              title="Impressões"
              value={formatNumber(totals.totalImpressions)}
              icon={Eye}
              color="text-blue-500"
              bgColor="bg-blue-500/10"
              isLoading={isLoadingAds}
            />
            <MetricCard
              title="Cliques"
              value={formatNumber(totals.totalClicks)}
              icon={MousePointer}
              color="text-emerald-500"
              bgColor="bg-emerald-500/10"
              isLoading={isLoadingAds}
            />
            <MetricCard
              title="Conversões"
              value={formatNumber(totals.totalConversions)}
              icon={TrendingUp}
              color="text-purple-500"
              bgColor="bg-purple-500/10"
              isLoading={isLoadingAds}
            />
            <MetricCard
              title="Valor Conversões"
              value={formatCurrency(totals.totalConversionValue)}
              icon={DollarSign}
              color="text-emerald-500"
              bgColor="bg-emerald-500/10"
              isLoading={isLoadingAds}
            />
            <MetricCard
              title="Checkouts"
              value={formatNumber(totals.totalCheckouts)}
              icon={ShoppingCart}
              color="text-orange-500"
              bgColor="bg-orange-500/10"
              isLoading={isLoadingAds}
            />
          </div>

          {/* Campaigns Table */}
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Campanha</TableHead>
                      <TableHead className="font-semibold">Conta</TableHead>
                      <TableHead className="font-semibold text-right">Impressões</TableHead>
                      <TableHead className="font-semibold text-right">Cliques</TableHead>
                      <TableHead className="font-semibold text-right">Custo</TableHead>
                      <TableHead className="font-semibold text-right">Conversões</TableHead>
                      <TableHead className="font-semibold text-right">Checkouts</TableHead>
                      <TableHead className="font-semibold">Tracker</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAds ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : allCampaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma campanha encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      allCampaigns.map((campaign) => {
                        const isExpanded = expandedCampaignId === campaign.id;

                        return (
                          <React.Fragment key={campaign.id}>
                            <TableRow
                              className={cn('hover:bg-muted/30 cursor-pointer transition-colors', isExpanded && 'bg-muted/20 border-b-0')}
                              onClick={() => setExpandedCampaignId(isExpanded ? null : campaign.id)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-90')} />
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground"><DecryptedText value={campaign.name} /></span>
                                    <span className="text-xs text-muted-foreground">
                                      {campaign.bidding_strategy.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground"><DecryptedText value={campaign.accountName} /></span>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(Number(campaign.snapshots_sum_impressions) || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(Number(campaign.snapshots_sum_clicks) || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-destructive">
                                {formatCurrency(parseFloat(campaign.snapshots_sum_cost) || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(Number(campaign.snapshots_sum_conversions) || 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(Number(campaign.snapshots_sum_checkout_conversions) || 0)}
                              </TableCell>
                              <TableCell>
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
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                      onClick={(e) => { e.stopPropagation(); handleLinkClick(campaign); }}
                                    >
                                      <Link2 className="w-3 h-3 mr-1" />
                                      Vincular
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="bg-muted/10 hover:bg-muted/10">
                                <TableCell colSpan={8} className="p-0">
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
        </TabsContent>
      </Tabs>

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
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tracker..." />
              </SelectTrigger>
              <SelectContent>
                {trackers.map((tracker: Tracker) => (
                  <SelectItem key={tracker.id} value={tracker.id.toString()}>
                    {tracker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleLinkSubmit}
              disabled={!selectedTrackerId || linkMutation.isPending}
            >
              {linkMutation.isPending ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

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
    <Card className="border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
};

export default GoogleAds;
