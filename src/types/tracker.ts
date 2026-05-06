export interface Platform {
  id: number;
  uuid: string;
  name: string;
  logo: string;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Tracker {
  id: number;
  uuid: string;
  name: string;
  pixel: string | null;
  pixel_checkout: string | null;
  checkout_type: 'standard' | 'robust';
  checkout_url_match: string | null;
  user_id: number;
  active: boolean;
  platform_id: number | null;
  platform: Platform | null;
  script_type: 'analytics_only' | 'full_tracker';
  google_ads_connections?: Array<{
    id: number;
    tracker_id: number;
    google_account_id: number;
    google_ads_customer_id: string;
    is_mcc: boolean;
    login_customer_id: string | null;
    google_ads_conversion_id: string | null;
    google_ads_conversion_label: string | null;
    google_ads_checkout_conversion_id: string | null;
    google_ads_checkout_conversion_label: string | null;
    status: 'ACTIVE' | 'SUSPENDED' | 'ERROR';
    created_at: string;
    google_account?: {
      id: number;
      name: string;
      google_email: string;
      avatar: string | null;
    } | null;
  }>;
  created_at: string | null;
  updated_at: string | null;
  campaigns_count?: number;
  total_cost?: number;
  total_conversion_value?: number;
  total_profit?: number;
  mining_status?: 'em_teste' | 'validado' | 'nao_validou' | null;
  daily_metrics?: Array<{ date: string; cost: number; profit: number }>;
}

export interface TrackersResponse {
  success: boolean;
  data: {
    current_page: number;
    data: Tracker[];
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
  };
}

export interface TrackerFormData {
  name: string;
  pixel?: string;
  pixel_checkout?: string;
  checkout_type?: 'standard' | 'robust';
  checkout_url_match?: string;
  script_type?: 'analytics_only' | 'full_tracker';
  platform_id?: number;
}

export interface ScrollAnalyticsData {
  total_visitors: number;
  reached_25: number;
  reached_50: number;
  reached_75: number;
  reached_100: number;
}

// Google Ads types
export interface ConversionAction {
  id: string;
  name: string;
  status: string;
  type: string;
  label: string | null;
}

export interface GoogleIntegrationLog {
  id: number;
  user_id: number;
  google_account_id: number | null;
  tracker_id: number | null;
  event_type: 'oauth_connected' | 'conversion_sent' | 'pixel_created' | 'pixel_found' | 'error';
  description: string | null;
  metadata: Record<string, any> | null;
  success: boolean;
  created_at: string;
  google_account?: { id: number; name: string; google_email: string; avatar: string | null } | null;
  tracker?: { id: number; name: string } | null;
}
