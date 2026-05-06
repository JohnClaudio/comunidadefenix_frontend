export interface GoogleAdsAdGroup {
  id: number;
  google_ads_campaign_id: number;
  external_id: string;
  name: string;
}

export interface GoogleAdsDailyMetric {
  date: string;
  impressions: number;
  clicks: number;
  cost: string;
  conversions: number;
  conversion_value: string;
  checkout_conversions: number;
  checkout_value: string;
  impression_share_percent: string;
  top_impression_share_percent: string;
  absolute_top_impression_share_percent: string;
  snapshot_budget_daily: number | null;
  snapshot_target_cpa: number | null;
  snapshot_target_roas: number | null;
  snapshot_max_cpc_limit: number | null;
}

export interface GoogleAdsCampaign {
  id: number;
  google_ads_account_id: number;
  external_id: string;
  name: string;
  bidding_strategy: string;
  budget_daily: number | null;
  budget_delivery: string | null;
  target_cpa: number | null;
  target_roas: number | null;
  max_cpc_limit: number | null;
  enhanced_cpc: boolean | null;
  target_impression_share: number | null;
  target_impression_location: string | null;
  tracker_id: number | null;
  snapshots_sum_impressions: number;
  snapshots_sum_clicks: number;
  snapshots_sum_cost: string;
  snapshots_sum_conversions: number;
  snapshots_sum_conversion_value: string;
  snapshots_sum_checkout_conversions: number;
  snapshots_sum_checkout_value: string;
  snapshots_avg_impression_share: string;
  snapshots_avg_top_impression_share: string;
  snapshots_avg_abs_top_impression_share: string;
  tracker: { id: number; name: string } | null;
  ad_groups?: GoogleAdsAdGroup[];
}

export interface GoogleAdsAccount {
  id: number;
  external_id: string;
  name: string;
  user_id: number;
  last_synced_at?: string;
  campaigns: GoogleAdsCampaign[];
}

export interface GoogleAdsResponse {
  filters: {
    start_date: string;
    end_date: string;
  };
  data: GoogleAdsAccount[];
}

export interface GoogleAdsFilters {
  start_date: string;
  end_date: string;
  account_id?: number;
}

export interface KanbanRules {
  id?: number;
  user_id?: number;
  use_dynamic_rules: boolean;
  high_performance_roas_min: number;
  high_performance_cpa_max: number;
  high_performance_conv_min: number;
  learning_spend_max: number;
  learning_conv_max: number;
  critical_spend_min: number;
}
