export interface CurrencyTotal {
  currency: 'BRL' | 'USD' | 'EUR';
  amount: number;
  total: number;
}

export interface MetricCard {
  value: number;
  change_pct: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface LeadTrashCard {
  value: number;
}

export interface TopCountrySale {
  country: string;
  iso: string;
  amount: number;
  sales_count: number;
  change_pct: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface TopDimensionSale {
  name: string;
  sales_count: number;
  amount: number;
  share_pct: number;
}

export interface PlatformItem {
  platform: string;
  amount: number;
  total: number;
}

export interface ExchangeRate {
  exchange_rate: string;
  percentage_change: string;
  change_amount: string;
  trend: 'up' | 'down' | 'neutral';
  percentage: string;
  last_updated: string;
}

export interface RecentSale {
  id: number;
  tracker_name: string;
  platform: string;
  amount: number;
  currency: string;
  type: string;
  created_at: string;
  order_id: string;
}

export interface DashboardRange {
  tz: string;
  from: string;
  to: string;
  previous_from: string;
  previous_to: string;
}

export interface DashboardCards {
  purchase_by_currency: CurrencyTotal[];
  refund_by_currency: CurrencyTotal[];
  purchase_by_platform: PlatformItem[];
  refund_by_platform: PlatformItem[];
  lead_trash: LeadTrashCard;
  visitors: MetricCard;
  checkouts: MetricCard;
}

export interface DashboardData {
  range: DashboardRange;
  cards: DashboardCards;
  top_countries_sales: TopCountrySale[];
  top_devices_sales: TopDimensionSale[];
  top_systems_sales: TopDimensionSale[];
  recent_sales: RecentSale[];
  recent_checkouts: RecentSale[];
  exchange_rates: Record<string, ExchangeRate>;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

export interface DashboardFilters {
  from: string;
  to: string;
  tracker_id?: number;
}

export type DatePreset = 'today' | 'yesterday' | '7d' | '15d' | '30d' | '90d' | 'year' | 'custom';

// Chart types
export interface SalesDailyByCurrency {
  date: string;
  platform?: string;
  BRL?: number;
  USD?: number;
  EUR?: number;
  AUD?: number;
}

export interface CheckoutsDaily {
  date: string;
  total: number;
}

export interface DashboardChartsData {
  sales_daily_by_currency: SalesDailyByCurrency[];
  checkouts_daily: CheckoutsDaily[];
}

export interface DashboardChartsResponse {
  range: {
    tz: string;
    from: string;
    to: string;
  };
  charts: DashboardChartsData;
}
