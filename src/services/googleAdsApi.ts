import { GoogleAdsResponse, GoogleAdsFilters, GoogleAdsDailyMetric } from '@/types/googleAds';
import { FunnelResponse, FunnelFiltersResponse, FunnelRequestParams } from '@/types/googleAdsFunnel';
import { SegmentInsightsRequest, SegmentInsightsResponse } from '@/types/googleAdsSegments';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';

export const fetchGoogleAdsAccounts = async (
  token: string,
  filters: GoogleAdsFilters
): Promise<GoogleAdsResponse> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      start_date: filters.start_date,
      end_date: filters.end_date,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google Ads accounts');
  }

  return response.json();
};

export const linkCampaignTracker = async (
  token: string,
  campaignId: number,
  trackerId: number
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/campaigns/${campaignId}/link-tracker`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ tracker_id: trackerId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to link tracker');
  }

  return response.json();
};

export const fetchCampaignDailyMetrics = async (
  token: string,
  campaignId: number,
  filters: { start_date: string; end_date: string }
): Promise<{ success: boolean; data: GoogleAdsDailyMetric[] }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/campaigns/${campaignId}/daily-metrics`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(filters),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch campaign daily metrics');
  }

  return response.json();
};

export const fetchFunnelData = async (
  token: string,
  params: {
    view_type: 'sf_funnels' | 'google_ads';
    from: string;
    to: string;
    google_ads_account_id?: number;
    google_ads_campaign_id?: number;
    tracker_id?: number;
    group_id?: number;
  }
): Promise<FunnelResponse> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/metrics/funnel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch funnel data');
  }

  return response.json();
};

export const fetchFunnelFilters = async (
  token: string,
  viewType: 'sf_funnels' | 'google_ads'
): Promise<FunnelFiltersResponse> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/metrics/filters`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      view_type: viewType,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch funnel filters');
  }

  return response.json();
};

export const fetchSegmentInsights = async (
  token: string,
  params: SegmentInsightsRequest
): Promise<SegmentInsightsResponse> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/segments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch segment insights');
  }

  return response.json();
};

export const fetchKanbanRules = async (token: string): Promise<{ success: boolean; data: any }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/kanban-rules`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch kanban rules');
  }

  return response.json();
};

export const saveKanbanRules = async (token: string, rules: any): Promise<{ success: boolean; message: string; data: any }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/kanban-rules`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(rules),
  });

  if (!response.ok) {
    throw new Error('Failed to save kanban rules');
  }

  return response.json();
};

export const updateGoogleAdsAccountStatus = async (
  token: string,
  accountId: number,
  status: 'ATIVA' | 'SUSPENSA'
): Promise<{ success: boolean; message: string; data: any }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/accounts/${accountId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update account status');
  }

  return response.json();
};

export const toggleGoogleAdsSync = async (
  token: string,
  accountId: number
): Promise<{ success: boolean; message: string; data: any }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/synced-accounts/${accountId}/toggle`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to toggle sync status');
  }

  return response.json();
};

export const fetchGoogleAdsDailyReport = async (
  token: string,
  params: { campaign_id: number; start_date: string; end_date: string }
): Promise<{ success: boolean; data: any }> => {
  const queryParams = new URLSearchParams({
    campaign_id: params.campaign_id.toString(),
    start_date: params.start_date,
    end_date: params.end_date,
  }).toString();

  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/report-daily?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch daily report');
  }

  return response.json();
};

export const saveGoogleAdsDailyNote = async (
  token: string,
  params: { campaign_id: number; date: string; note: string }
): Promise<{ success: boolean; data: any }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/report-daily/note`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to save daily note');
  }

  return response.json();
};

export const saveGoogleAdsDailyOverride = async (
  token: string,
  params: { campaign_id: number; date: string; field: string; value: number | null }
): Promise<{ success: boolean; data: any }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/report-daily/override`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to save daily override');
  }

  return response.json();
};

export const fetchGoogleAdsLocations = async (
  token: string,
  filters: { start_date: string; end_date: string }
): Promise<{ success: boolean; data: any }> => {
  const queryParams = new URLSearchParams({
    start_date: filters.start_date,
    end_date: filters.end_date,
  }).toString();

  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/report-locations?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch locations report');
  }

  return response.json();
};
