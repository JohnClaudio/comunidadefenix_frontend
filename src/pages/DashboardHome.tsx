import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, ShoppingCart, Clock, CalendarDays, Rocket, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDashboard, fetchTrackers, fetchDashboardCharts } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DashboardFilters,
  MetricCard,
  SalesCards,
  TopDimensionsCard,

  SalesChart,
  TopCountriesCard,
  GlobeCountriesCard,
} from '@/components/dashboard';

const DashboardHome: React.FC = () => {
  const { token, user } = useAuth();
  const [selectedTrackerId, setSelectedTrackerId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const { data: trackersData } = useQuery({
    queryKey: ['trackers'],
    queryFn: () => fetchTrackers(token!),
    enabled: !!token,
  });

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', selectedTrackerId, format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
    queryFn: () => fetchDashboard(token!, {
      from: format(dateFrom, 'yyyy-MM-dd'),
      to: format(dateTo, 'yyyy-MM-dd'),
      tracker_id: selectedTrackerId || undefined,
    }),
    enabled: !!token,
  });

  const { data: chartsData } = useQuery({
    queryKey: ['dashboard-charts', selectedTrackerId, format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
    queryFn: () => fetchDashboardCharts(token!, {
      from: format(dateFrom, 'yyyy-MM-dd'),
      to: format(dateTo, 'yyyy-MM-dd'),
      tracker_id: selectedTrackerId || undefined,
    }),
    enabled: !!token,
  });

  const handleDateChange = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const trackers = trackersData?.data?.data || [];
  const data = dashboardData?.data;
  const charts = chartsData?.charts;


  // Funnel data
  const totalPurchases = (data?.cards.purchase_by_currency || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalRefunds = (data?.cards.refund_by_currency || []).reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Cinzel', serif" }}>Painel de Comando</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas métricas de batalha</p>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters
        trackers={trackers}
        selectedTrackerId={selectedTrackerId}
        onTrackerChange={setSelectedTrackerId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={handleDateChange}
        isLoading={isLoading}
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6 stagger-fade-in">
          {/* Row 1: Cards principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vendas por Moeda */}
            <SalesCards
              purchases={data?.cards.purchase_by_currency || []}
              refunds={data?.cards.refund_by_currency || []}
            />

            {/* Visitantes */}
            <MetricCard
              title="Visitantes"
              value={data?.cards.visitors.value || 0}
              trend={data?.cards.visitors.trend}
              changePercent={data?.cards.visitors.change_pct}
              subtitle="vs período anterior"
              icon={Users}
              iconBgColor="bg-blue-500/10"
              iconColor="text-blue-400"
              accentColor="hsl(217 91% 60%)"
            />

            {/* Checkouts */}
            <MetricCard
              title="Checkouts"
              value={data?.cards.checkouts.value || 0}
              trend={data?.cards.checkouts.trend}
              changePercent={data?.cards.checkouts.change_pct}
              subtitle="vs período anterior"
              icon={ShoppingCart}
              iconBgColor="bg-purple-500/10"
              iconColor="text-purple-400"
              accentColor="hsl(262 83% 58%)"
            />
          </div>

          {/* Row 2: Globe Metrics + Sales Performance Chart */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6 pb-2">
            <GlobeCountriesCard countries={data?.top_countries_sales || []} />
            <SalesChart
              salesData={charts?.sales_daily_by_currency || []}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          </div>

          {/* Postbacks Row */}

        </div>
      )}
    </div>
  );
};

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="sf-stat-card">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-28 mt-4" />
          <Skeleton className="h-4 w-16 mt-3" />
        </div>
      ))}
    </div>
    <div className="sf-card">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 sf-card h-[450px]">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="lg:col-span-4 sf-card">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-12 w-full mb-4 rounded-xl" />
        <Skeleton className="h-12 w-full mb-4 rounded-xl" />
        <Skeleton className="h-12 w-full mb-4 rounded-xl" />
      </div>
    </div>
  </div>
);

export default DashboardHome;
