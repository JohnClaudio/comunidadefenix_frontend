import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign, MousePointerClick, Activity, Target,
  Calendar, Eye, Search, AlertCircle, Percent, BarChart3,
  Wifi, WifiOff, ArrowUpRight, Building2, ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleAdsAccounts, fetchGoogleAdsLocations, linkCampaignTracker } from '@/services/googleAdsApi';
import { fetchTrackers } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { DecryptedText } from '@/components/DecryptedText';
import { DatePreset } from '@/types/dashboard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CostRevenueChart, CostDistributionPie, TopCampaignsBar } from '@/components/dashboard/DashboardCharts';
import { useEncryption } from '@/contexts/EncryptionContext';
import { decryptEnvelope, isEncryptedValue } from '@/services/crypto';

// ── Helpers ─────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtCompact = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

// ── Sparkline ───────────────────────────────────────────
const Sparkline = ({ data, isPositiveGood = true }: { data: number[], isPositiveGood?: boolean }) => {
  if (!data || data.length < 2) return <div className="w-14 h-5 bg-muted/20 rounded" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  const isUp = data[data.length - 1] >= data[0];
  let color = 'text-zinc-400';
  if (isUp && isPositiveGood) color = 'text-emerald-500 dark:text-emerald-400';
  if (!isUp && isPositiveGood) color = 'text-rose-500 dark:text-rose-400';
  if (isUp && !isPositiveGood) color = 'text-rose-500 dark:text-rose-400';
  if (!isUp && !isPositiveGood) color = 'text-emerald-500 dark:text-emerald-400';
  return (
    <svg className={cn("w-14 h-5 overflow-visible", color)} viewBox="0 -5 100 110" preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

// ── Main ────────────────────────────────────────────────
const GoogleAdsDashboard: React.FC = () => {
  const { token } = useAuth();
  const { isPrivacyMode } = usePrivacy();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7), to: new Date(),
  });
  const [activePreset, setActivePreset] = useState<DatePreset>('7d');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const { isUnlocked, privateKey } = useEncryption();
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handlePreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const today = new Date();
    switch (preset) {
      case 'today': setDateRange({ from: today, to: today }); break;
      case 'yesterday': { const y = subDays(today, 1); setDateRange({ from: y, to: y }); break; }
      case '7d': setDateRange({ from: subDays(today, 7), to: today }); break;
      case '15d': setDateRange({ from: subDays(today, 15), to: today }); break;
      case '30d': setDateRange({ from: subDays(today, 30), to: today }); break;
      case '90d': setDateRange({ from: subDays(today, 90), to: today }); break;
      case 'year': setDateRange({ from: startOfYear(today), to: today }); break;
      case 'custom': setCalendarOpen(true); break;
    }
  };

  const { data: accountsData, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['gAdsDash', format(dateRange.from, 'yyyy-MM-dd'), format(dateRange.to, 'yyyy-MM-dd')],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
    }),
    enabled: !!token,
  });



  const { data: trackersData } = useQuery({
    queryKey: ['trackersListAll'],
    queryFn: () => fetchTrackers(token!),
    enabled: !!token,
  });

  const linkMutation = useMutation({
    mutationFn: ({ campaignId, trackerId }: { campaignId: number; trackerId: number }) =>
      linkCampaignTracker(token!, campaignId, trackerId),
    onSuccess: () => {
      toast({ title: 'Sucesso!', description: 'Campanha vinculada com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['gAdsDash'] });
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message || 'Falha ao vincular campanha.', variant: 'destructive' });
    }
  });

  // Build accounts list for dropdown
  const accountsList = useMemo(() => {
    if (!accountsData?.data) return [];
    return accountsData.data.map(acc => ({
      id: acc.id,
      externalId: acc.external_id,
      name: decryptedMap[acc.name] || acc.name,
      rawName: acc.name,
      campaignCount: acc.campaigns.length,
    }));
  }, [accountsData, decryptedMap]);

  const campaigns = useMemo(() => {
    if (!accountsData?.data) return [];
    const accounts = selectedAccountId === 'all'
      ? accountsData.data
      : accountsData.data.filter(acc => acc.id.toString() === selectedAccountId);
    return accounts.flatMap(acc =>
      acc.campaigns.map(c => {
        const rawName = c.name;
        const rawAccName = acc.name;
        return { 
          ...c, 
          name: decryptedMap[rawName] || rawName,
          accountName: decryptedMap[rawAccName] || rawAccName,
          rawName,
          rawAccName,
          accountId: acc.id,
        };
      })
    );
  }, [accountsData, decryptedMap, selectedAccountId]);

  // Batch decryption of names
  useEffect(() => {
    if (!isUnlocked || !privateKey || !accountsData?.data) return;

    const namesToDecrypt = new Set<string>();
    accountsData.data.forEach(acc => {
      if (acc.name && isEncryptedValue(acc.name)) namesToDecrypt.add(acc.name);
      acc.campaigns.forEach(c => {
        if (c.name && isEncryptedValue(c.name)) namesToDecrypt.add(c.name);
      });
    });

    const pending = Array.from(namesToDecrypt).filter(n => !decryptedMap[n]);
    if (pending.length === 0) return;

    let cancelled = false;
    const decryptAll = async () => {
      const results: Record<string, string> = {};
      for (const enc of pending) {
        try {
          const plain = await decryptEnvelope(enc, privateKey);
          results[enc] = plain;
        } catch (e) {
          results[enc] = '⚠️ Erro';
        }
      }
      if (!cancelled) {
        setDecryptedMap(prev => ({ ...prev, ...results }));
      }
    };

    decryptAll();
    return () => { cancelled = true; };
  }, [accountsData, isUnlocked, privateKey]);

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery) return campaigns;
    return campaigns.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [campaigns, searchQuery]);

  // Aggregate totals
  const totals = useMemo(() => {
    return campaigns.reduce((a, c) => {
      a.cost += parseFloat(c.snapshots_sum_cost || '0');
      a.clicks += c.snapshots_sum_clicks || 0;
      a.impressions += c.snapshots_sum_impressions || 0;
      a.conversions += c.snapshots_sum_conversions || 0;
      a.value += parseFloat(c.snapshots_sum_conversion_value || '0');
      a.checkouts += c.snapshots_sum_checkout_conversions || 0;
      return a;
    }, { cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0, checkouts: 0 });
  }, [campaigns]);

  const roi = totals.cost > 0 ? ((totals.value - totals.cost) / totals.cost) * 100 : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpa = totals.conversions > 0 ? totals.cost / totals.conversions : 0;

  const rankedCampaigns = useMemo(() => {
    return [...filteredCampaigns]
      .map(c => {
        const cost = parseFloat(c.snapshots_sum_cost || '0');
        const value = parseFloat(c.snapshots_sum_conversion_value || '0');
        return { ...c, cost, value, profit: value - cost, roi: cost > 0 ? ((value - cost) / cost) * 100 : 0 };
      })
      .sort((a, b) => b.cost - a.cost);
  }, [filteredCampaigns]);

  // Chart data: aggregate daily from campaign sparklines
  const timeSeriesData = useMemo(() => {
    const dailyMap: Record<string, { date: string; custo: number; receita: number }> = {};
    
    campaigns.forEach(camp => {
      if (Array.isArray(camp.sparkline)) {
        camp.sparkline.forEach((day: any) => {
          const dateKey = day.date; // "YYYY-MM-DD" or similar
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { 
              date: format(new Date(dateKey + 'T12:00:00'), 'dd/MM'), 
              custo: 0, 
              receita: 0 
            };
          }
          dailyMap[dateKey].custo += day.cost || 0;
          dailyMap[dateKey].receita += day.value || 0;
        });
      }
    });

    return Object.values(dailyMap).sort((a, b) => {
      // Sort by dd/MM is tricky, but the keys in dailyMap are likely YYYY-MM-DD
      const keys = Object.keys(dailyMap).sort();
      const indexA = keys.indexOf(Object.keys(dailyMap).find(k => format(new Date(k + 'T12:00:00'), 'dd/MM') === a.date) || '');
      const indexB = keys.indexOf(Object.keys(dailyMap).find(k => format(new Date(k + 'T12:00:00'), 'dd/MM') === b.date) || '');
      return indexA - indexB;
    });
  }, [campaigns]);

  const pieData = useMemo(() => {
    const sorted = [...rankedCampaigns].sort((a, b) => b.cost - a.cost);
    const top = sorted.slice(0, 5);
    const othersVal = sorted.slice(5).reduce((s, c) => s + c.cost, 0);
    const result = top.map(c => ({
      name: isPrivacyMode ? '••••' : (c.name.length > 25 ? c.name.slice(0, 22) + '…' : c.name),
      value: parseFloat(c.cost.toFixed(2)),
    }));
    if (othersVal > 0) result.push({ name: 'Outros', value: parseFloat(othersVal.toFixed(2)) });
    return result;
  }, [rankedCampaigns, isPrivacyMode]);

  const topBarData = useMemo(() => {
    return rankedCampaigns.slice(0, 8).map(c => ({
      name: isPrivacyMode ? '••••' : (c.name.length > 18 ? c.name.slice(0, 15) + '…' : c.name),
      custo: c.cost,
      receita: c.value,
    }));
  }, [rankedCampaigns, isPrivacyMode]);



  const presets: { key: DatePreset; label: string }[] = [
    { key: 'today', label: 'Hoje' }, { key: 'yesterday', label: 'Ontem' },
    { key: '7d', label: '7D' }, { key: '15d', label: '15D' },
    { key: '30d', label: '30D' }, { key: '90d', label: '90D' },
  ];

  const syncTime = useMemo(() => {
    if (!accountsData?.data || accountsData.data.length === 0) return null;
    let latestSync: Date | null = null;
    accountsData.data.forEach((acc) => {
      if (acc.last_synced_at) {
        const date = new Date(acc.last_synced_at);
        if (!latestSync || date > latestSync) {
          latestSync = date;
        }
      }
    });
    return latestSync ? format(latestSync, "dd/MM 'às' HH:mm", { locale: ptBR }) : null;
  }, [accountsData]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-[1600px] mx-auto font-sans">

        {/* ── Header ─────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-5 border-b border-border/40">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Google Ads</h1>
              {syncTime && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border border-border/40">
                  <Wifi size={10} className="text-emerald-500" />
                  Sincronizado {syncTime}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {campaigns.length} campanhas{selectedAccountId !== 'all' ? ` · ${accountsList.find(a => a.id.toString() === selectedAccountId)?.name || ''}` : ''} · {format(dateRange.from, "d MMM", { locale: ptBR })} – {format(dateRange.to, "d MMM, yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Account filter */}
            {accountsList.length > 1 && (
              <div className="relative shrink-0">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className={cn(
                    "h-[34px] w-auto max-w-[220px] pl-8 pr-7 text-xs font-medium bg-background border border-border/50 rounded-lg shadow-sm",
                    "appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-shadow truncate",
                    selectedAccountId !== 'all' && "border-primary/40 text-primary"
                  )}
                  style={{ minWidth: '140px' }}
                >
                  <option value="all">Todas as contas ({accountsList.reduce((s, a) => s + a.campaignCount, 0)})</option>
                  {accountsList.map(acc => (
                    <option key={acc.id} value={acc.id.toString()}>
                      {acc.name} ({acc.campaignCount})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
            )}
            <div className="bg-muted/50 p-1 rounded-lg border border-border/50 flex">
              {presets.map(p => (
                <button
                  key={p.key}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    activePreset === p.key
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => handlePreset(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-[34px] text-xs gap-2 border-border/50 shadow-sm">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span className="font-medium">{format(dateRange.from, 'dd/MM')} – {format(dateRange.to, 'dd/MM/yy')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent mode="range" defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from && range?.to) {
                      setActivePreset('custom');
                      setDateRange({ from: range.from, to: range.to });
                      setCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={2} locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ── KPI Grid (6 cards) ───────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <MetricCard label="Investimento" value={fmtCompact(totals.cost)} icon={DollarSign} accentColor="#6366f1" invertTrend />
          <MetricCard label="Receita" value={fmtCompact(totals.value)} icon={BarChart3} accentColor="#10b981" />
          <MetricCard
            label="Lucro"
            value={fmtCompact(totals.value - totals.cost)}
            icon={Activity}
            accentColor={totals.value - totals.cost >= 0 ? '#10b981' : '#ef4444'}
            change={totals.cost > 0 ? ((totals.value - totals.cost) / totals.cost) * 100 : 0}
          />
          <MetricCard
            label="ROI"
            value={`${roi.toFixed(2)}%`}
            icon={Target}
            accentColor={roi >= 0 ? '#10b981' : '#ef4444'}
          />
          <MetricCard label="Conversões" value={fmtNum(totals.conversions)} icon={MousePointerClick} accentColor="#8b5cf6" />
          <MetricCard
            label="CPA"
            value={cpa > 0 ? fmt(cpa) : '–'}
            icon={Percent}
            accentColor="#f97316"
            invertTrend
          />
        </div>

        {/* ── Charts Row ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CostRevenueChart data={timeSeriesData} />
          </div>
          <CostDistributionPie data={pieData} />
        </div>

        {/* ── Top Campaigns Bar ─────── */}
        {topBarData.length > 0 && (
          <TopCampaignsBar data={topBarData} />
        )}

        {/* ── Campaign Table ────────── */}
        <div className="border border-border/60 bg-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">Campanhas</h3>
              <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{rankedCampaigns.length}</span>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtrar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-shadow"
              />
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm shadow-sm">
                <tr className="border-b border-border/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Campanha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Produto</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Custo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Receita</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Lucro</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs w-20">7d</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">ROI</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Conv.</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Cliques</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">CPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {rankedCampaigns.map((camp) => {
                  const campCpa = camp.cost > 0 && (camp.snapshots_sum_conversions || 0) > 0
                    ? camp.cost / (camp.snapshots_sum_conversions || 1) : 0;
                  let statusColor = "bg-zinc-400";
                  if (camp.roi >= 50) statusColor = "bg-emerald-500";
                  else if (camp.roi >= 0) statusColor = "bg-amber-500";
                  else if (camp.cost > 0) statusColor = "bg-rose-500";
                  const isBurning = camp.cost > 0 && (!camp.snapshots_sum_conversions || camp.snapshots_sum_conversions === 0);
                  const revData = (camp.sparkline || []).map((d: any) => d.value);

                  return (
                    <tr key={camp.id} className={cn(
                      "hover:bg-muted/30 transition-colors group",
                      isBurning ? "border-l-2 border-l-amber-500 bg-amber-500/[0.02]" : "border-l-2 border-l-transparent"
                    )}>
                      <td className="px-4 py-2.5 flex items-center gap-2.5">
                        <Tooltip>
                          <TooltipTrigger><div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor)} /></TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">ROI: {camp.roi.toFixed(2)}%</TooltipContent>
                        </Tooltip>
                        <div className="flex flex-col min-w-[180px]">
                          <span className={cn("font-medium text-foreground text-[13px] leading-tight", isPrivacyMode && "blur-md select-none")}>
                            {camp.name}
                          </span>
                          {isBurning && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                              <AlertCircle size={9} /> Custo sem conversão
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          className={cn(
                            "w-full h-7 text-xs bg-muted/50 border border-border/50 rounded-md px-2 max-w-[140px] cursor-pointer",
                            "focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors",
                            camp.tracker_id ? "text-primary border-primary/20 bg-primary/5" : "text-muted-foreground"
                          )}
                          value={camp.tracker_id || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              linkMutation.mutate({ campaignId: camp.id, trackerId: Number(e.target.value) });
                            }
                          }}
                          disabled={linkMutation.isPending}
                        >
                          <option value="">Não vinculado</option>
                          {trackersData?.data?.data?.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-muted-foreground">{fmt(camp.cost)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-foreground">{fmt(camp.value)}</td>
                      <td className={cn("px-4 py-2.5 text-right font-mono text-[13px] font-medium", camp.profit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {camp.profit >= 0 ? '+' : ''}{fmt(camp.profit)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                          <Sparkline data={revData.length > 0 ? revData : [0, 0]} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border",
                          camp.roi >= 50 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                          camp.roi >= 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                          "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        )}>
                          {camp.roi.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-muted-foreground">{camp.snapshots_sum_conversions || 0}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-muted-foreground">{fmtNum(camp.snapshots_sum_clicks || 0)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-muted-foreground">{campCpa > 0 ? fmt(campCpa) : '–'}</td>
                    </tr>
                  );
                })}
                {rankedCampaigns.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhuma campanha encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </TooltipProvider>
  );
};

// ── Skeleton ────────────────────────────────────────────
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
    <div className="flex justify-between items-end pb-5 border-b border-border/40">
      <div className="space-y-2"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-56" /></div>
      <Skeleton className="h-9 w-[260px] rounded-lg" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Skeleton className="h-[340px] rounded-xl lg:col-span-2" />
      <Skeleton className="h-[340px] rounded-xl" />
    </div>
    <Skeleton className="h-[320px] rounded-xl" />
  </div>
);

export default GoogleAdsDashboard;
