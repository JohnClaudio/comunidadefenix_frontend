// View Types
export type FunnelViewType = 'sf_funnels' | 'google_ads';

// Common Types
export interface CurrencyValue {
  value: number;
  currency: string;
}

export interface PercentValue {
  value: number;
  unit: 'percent';
}

export interface RatioValue {
  value: number;
  unit: 'ratio';
}

export interface TimeValue {
  value: number;
  formatted: string;
}

export interface ResultValue {
  label: string;
  value: number;
}

// SF Funnels Cards
export interface SFFunnelCards {
  investment: CurrencyValue;
  result: ResultValue;
  cost_per_result: CurrencyValue;
  return: CurrencyValue;
  cpm: CurrencyValue;
  ctr: PercentValue;
  cost_per_checkout: CurrencyValue;
  escape_rate: PercentValue;
  avg_time_on_page: TimeValue;
}

// Google Ads Cards
export interface GoogleAdsCards {
  investment: CurrencyValue;
  result: ResultValue;
  cost_per_result: CurrencyValue;
  return: CurrencyValue;
  roas: RatioValue;
  cpm: CurrencyValue;
  ctr: PercentValue;
  impression_share: PercentValue;
  top_impression_share: PercentValue;
  absolute_top_impression_share: PercentValue;
}

// SF Funnel Data
export interface SFFunnel {
  impressions: number;
  clicks: number;
  page_views: number;
  passed: number;
  checkouts: number;
  purchases: number;
}

export interface SFFunnelRates {
  impressions_to_clicks_percent: number;
  clicks_to_page_views_percent: number;
  page_views_to_pass_through_percent: number;
  page_views_to_checkouts_percent: number;
  checkouts_to_purchases_percent: number;
}

// Google Ads Funnel Data
export interface GoogleAdsFunnel {
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface GoogleAdsFunnelRates {
  impressions_to_clicks_percent: number;
  clicks_to_conversions_percent: number;
  impressions_to_conversions_percent: number;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr_percent: number;
  cpm: number;
  cpc: number;
  impression_share_percent: number;
  top_impression_share_percent: number;
  absolute_top_impression_share_percent: number;
}

// Timeline Data
export interface SFTimelineDay {
  day: string;
  cost: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

export interface GoogleAdsTimelineDay {
  day: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_value: number;
}

// Response Data Types
export interface SFFunnelsData {
  view_type: 'sf_funnels';
  range: {
    tz: string;
    from: string;
    to: string;
  };
  cards: SFFunnelCards;
  funnel: SFFunnel;
  funnel_rates: SFFunnelRates;
  charts: {
    timeline_daily: SFTimelineDay[];
  };
}

export interface GoogleAdsViewData {
  view_type: 'google_ads';
  range: {
    tz: string;
    from: string;
    to: string;
  };
  filters: {
    google_ads_account_id: number | null;
    google_ads_campaign_id: number | null;
    google_ads_ad_group_id: number | null;
  };
  cards: GoogleAdsCards;
  funnel: GoogleAdsFunnel;
  funnel_rates: GoogleAdsFunnelRates;
  google_ads: GoogleAdsMetrics;
  charts: {
    timeline_daily: GoogleAdsTimelineDay[];
  };
}

export type FunnelData = SFFunnelsData | GoogleAdsViewData;

export interface FunnelResponse {
  success: boolean;
  data: FunnelData;
}

// Filters Response
export interface FunnelFiltersData {
  accounts: Array<{ id: number; name: string; external_id: string }>;
  campaigns: Array<{ id: number; name: string; google_ads_account_id: number }>;
  ad_groups?: Array<{ id: number; name: string; google_ads_campaign_id: number }>;
  trackers?: Array<{ id: number; name: string }>;
  groups?: Array<{ id: number; name: string }>;
}

export interface FunnelFiltersResponse {
  success: boolean;
  data: FunnelFiltersData;
}

// Request Params
export interface FunnelRequestParams {
  view_type: FunnelViewType;
  start_date?: string;
  end_date?: string;
  google_ads_account_id?: number;
  google_ads_campaign_id?: number;
  tracker_id?: number;
  group_id?: number;
}
