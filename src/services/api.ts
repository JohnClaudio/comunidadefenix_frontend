import { VisitorsResponse } from '@/types/visitor';
import { TrackersResponse, TrackerFormData, Tracker, ScrollAnalyticsData } from '@/types/tracker';
import { Platform, UserPlatform, UserPlatformFormData } from '@/types/platform';
import { Domain, DomainsResponse, DomainFormData } from '@/types/domain';
import { Site, SitesResponse, SiteFormData, SiteUpdateData } from '@/types/site';
import { DashboardResponse, DashboardFilters } from '@/types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';

export const fetchVisitorsLogs = async (
  token: string,
  page: number = 1,
  filters: any = {}
): Promise<VisitorsResponse> => {
  const response = await fetch(`${API_BASE_URL}/workspace/visitors-logs?page=${page}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(filters),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch visitors logs');
  }

  return response.json();
};

export const fetchCanvasViews = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/workspace/canvas-views`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch canvas views');
  return response.json();
};

export const saveCanvasView = async (token: string, name: string, payload: any) => {
  const response = await fetch(`${API_BASE_URL}/workspace/canvas-views`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ name, payload }),
  });
  if (!response.ok) throw new Error('Failed to save canvas view');
  return response.json();
};

export const deleteCanvasView = async (token: string, id: number) => {
  const response = await fetch(`${API_BASE_URL}/workspace/canvas-views/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to delete canvas view');
  return response.json();
};

export const fetchTrackers = async (
  token: string, 
  filters?: { from: string; to: string }
): Promise<TrackersResponse> => {
  const params = new URLSearchParams();
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);

  const response = await fetch(`${API_BASE_URL}/workspace/trackers?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch trackers');
  }

  return response.json();
};

export const createTracker = async (
  token: string,
  data: TrackerFormData
): Promise<{ success: boolean; message: string; data: Tracker }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/trackers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create tracker');
  }

  return response.json();
};

export const updateTracker = async (
  token: string,
  trackerId: number,
  data: TrackerFormData
): Promise<{ success: boolean; message: string; data: Tracker }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/trackers/${trackerId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update tracker');
  }

  return response.json();
};

export const updateTrackerMiningStatus = async (
  token: string,
  trackerId: number,
  mining_status: string | null
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/trackers/${trackerId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ mining_status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update mining status');
  }

  return response.json();
};

export const deleteTracker = async (
  token: string,
  trackerId: number
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/trackers/${trackerId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete tracker');
  }

  return response.json();
};

// Platform APIs
export const fetchPlatforms = async (token: string): Promise<Platform[]> => {
  const response = await fetch(`${API_BASE_URL}/workspace/platforms`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch platforms');
  }

  return response.json();
};


export const createPlatform = async (
  token: string,
  data: FormData
): Promise<{ success: boolean; message: string; data: Platform }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/platforms`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: data,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to create platform');
  }

  return response.json();
};

export const updatePlatform = async (
  token: string,
  platformId: number,
  data: FormData
): Promise<{ success: boolean; message: string; data: Platform }> => {
  data.append('_method', 'PUT'); // Need to use POST with _method=PUT for multipart/form-data in Laravel
  const response = await fetch(`${API_BASE_URL}/workspace/platforms/${platformId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: data,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to update platform');
  }

  return response.json();
};

export const fetchScrollAnalytics = async (
  token: string,
  trackerId: number
): Promise<{ success: boolean; data: ScrollAnalyticsData }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/trackers/${trackerId}/scroll-analytics`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch scroll analytics');
  }

  return response.json();
};

// User Platform APIs
export const fetchUserPlatforms = async (token: string): Promise<{ data: UserPlatform[] }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/user-platforms`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user platforms');
  }

  return response.json();
};

export const createUserPlatform = async (
  token: string,
  data: UserPlatformFormData
): Promise<UserPlatform> => {
  const response = await fetch(`${API_BASE_URL}/workspace/user-platforms`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create user platform');
  }

  return response.json();
};

export const deleteUserPlatform = async (
  token: string,
  userPlatformId: number
): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/user-platforms/${userPlatformId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete user platform');
  }

  return response.json();
};

// Domain APIs
export const fetchGoogleAccounts = async (token: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-accounts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch google accounts');
  const data = await response.json();
  return data.data;
};

export const fetchAdAccounts = async (token: string, id: number): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-accounts/${id}/ad-accounts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Falha ao buscar contas de anúncios.');
  }
  const data = await response.json();
  return data.data;
};

export const unlinkGoogleAccount = async (token: string, id: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-accounts/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to unlink google account');
  return response.json();
};

export const fetchDomains = async (
  token: string,
  page: number = 1
): Promise<DomainsResponse> => {
  const response = await fetch(`${API_BASE_URL}/workspace/domains?page=${page}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch domains');
  }

  return response.json();
};

export const createDomain = async (
  token: string,
  data: DomainFormData
): Promise<{ success: boolean; message: string; data: Domain }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/domains`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create domain');
  }

  return response.json();
};

export const verifyDomain = async (
  token: string,
  domainId: number
): Promise<{ success: boolean; message: string; data: Domain }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/domains/${domainId}/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to verify domain');
  }

  return response.json();
};

export const deleteDomain = async (
  token: string,
  domainId: number
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/domains/${domainId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete domain');
  }

  return response.json();
};

// Site/Landing Page APIs
export const fetchSites = async (
  token: string,
  page: number = 1,
  search: string = ''
): Promise<SitesResponse> => {
  const params = new URLSearchParams({ page: page.toString() });
  if (search) params.append('q', search);

  const response = await fetch(`${API_BASE_URL}/workspace/sites?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sites');
  }

  return response.json();
};

export const createSite = async (
  token: string,
  data: SiteFormData
): Promise<{ success: boolean; message: string; data: Site }> => {
  // AI Builder needs multipart/form-data for image uploads
  if (data.type === 'ai_builder') {
    const formData = new FormData();
    formData.append('type', 'ai_builder');
    if (data.name) formData.append('name', data.name);
    formData.append('domain_id', data.domain_id.toString());
    if (data.subdomain) formData.append('subdomain', data.subdomain);
    if (data.slug) formData.append('slug', data.slug);
    if (data.tracker_id) formData.append('tracker_id', data.tracker_id.toString());
    if (data.aff_link) formData.append('aff_link', data.aff_link);
    if (data.accept_language) formData.append('accept_language', data.accept_language);
    if (data.active !== undefined) formData.append('active', data.active ? '1' : '0');
    formData.append('prompt', data.prompt);
    if (data.source_url) formData.append('source_url', data.source_url);
    if (data.source_text) formData.append('source_text', data.source_text);
    if (data.style_url) formData.append('style_url', data.style_url);
    if (data.style_text) formData.append('style_text', data.style_text);
    if (data.images) {
      data.images.forEach((file) => {
        formData.append('images[]', file);
      });
    }
    if (data.scraped_images) {
      data.scraped_images.forEach((url) => {
        formData.append('scraped_images[]', url);
      });
    }

    const response = await fetch(`${API_BASE_URL}/workspace/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create site');
    }
    return response.json();
  }

  // Pressel uses JSON
  const response = await fetch(`${API_BASE_URL}/workspace/sites`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create site');
  }

  return response.json();
};

export const updateSite = async (
  token: string,
  siteId: number,
  data: SiteUpdateData
): Promise<{ success: boolean; message: string; data: Site }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/sites/${siteId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update site');
  }

  return response.json();
};

export const deleteSite = async (
  token: string,
  siteId: number
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/sites/${siteId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete site');
  }

  return response.json();
};

export const captureSite = async (
  token: string,
  siteId: number
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/landing-pages/${siteId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to capture screenshot');
  }

  return response.json();
};

// Dashboard API
export const fetchDashboard = async (
  token: string,
  filters: DashboardFilters
): Promise<DashboardResponse> => {
  const body: Record<string, unknown> = {
    from: filters.from,
    to: filters.to,
  };

  if (filters.tracker_id) {
    body.tracker_id = filters.tracker_id;
  }

  const response = await fetch(`${API_BASE_URL}/workspace/dashboard`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }

  return response.json();
};

// Generate Visitor Insight (triggers async generation)
export const generateVisitorInsight = async (
  token: string,
  visitorId: number
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/workspace/visitors-logs/${visitorId}/insight`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate visitor insight');
  }
};

// Visitor Detail API
export const fetchVisitorDetail = async (
  token: string,
  visitorId: number
): Promise<{
  id: number;
  system: string;
  device_type: string;
  browser: string;
  recording: {
    has_recording: boolean;
    ai_insight: string | null;
  };
}> => {
  const response = await fetch(`${API_BASE_URL}/workspace/visitors-logs/${visitorId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch visitor detail');
  }

  return response.json();
};

// Visitor Replay API
export const fetchVisitorReplay = async (
  token: string,
  visitorId: number
): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/workspace/visitors-logs/${visitorId}/replay`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch visitor replay');
  }

  const data = await response.json();

  // API returns { events: [...], insight: "...", success: true }
  if (data.events && Array.isArray(data.events)) {
    return data.events;
  }

  // Fallback: if response is already an array
  if (Array.isArray(data)) {
    return data;
  }

  throw new Error('Invalid replay data format');
};

// Dashboard Charts API
export const fetchDashboardCharts = async (
  token: string,
  filters: DashboardFilters
): Promise<{ range: { tz: string; from: string; to: string }; charts: { sales_daily_by_currency: { date: string; BRL: number; USD: number; EUR?: number }[]; checkouts_daily: { date: string; total: number }[] } }> => {
  const body: Record<string, unknown> = {
    from: filters.from,
    to: filters.to,
  };

  if (filters.tracker_id) {
    body.tracker_id = filters.tracker_id;
  }

  const response = await fetch(`${API_BASE_URL}/workspace/dashboard/charts/sales`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard charts');
  }

  return response.json();
};

// Profile APIs
export const updateProfile = async (
  token: string,
  data: FormData
): Promise<{ success: boolean; message: string; user: any }> => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'POST', // POST for file uploads, Laravel handle with multipart
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: data,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update profile');
  }

  return response.json();
};

export const updatePassword = async (
  token: string,
  data: any
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/profile/password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update password');
  }

  return response.json();
};

export const updatePreferences = async (
  token: string,
  preferences: Record<string, any>
): Promise<{ message: string; preferences: Record<string, any> }> => {
  const response = await fetch(`${API_BASE_URL}/profile/preferences`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ preferences }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update preferences');
  }

  return response.json();
};

// ── Scraper ──────────────────────────────────────────────────────────
export const scrapePage = async (
  token: string,
  url: string
): Promise<{ success: boolean; data: { url: string; text: string; images: string[] } }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/scraper`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Falha ao escanear a página');
  }
  return response.json();
};

// ── User Prompt Library ───────────────────────────────────────────────
export interface UserPrompt {
  id: number;
  name: string;
  content: string;
  created_at: string;
}

export const fetchUserPrompts = async (token: string): Promise<{ success: boolean; data: UserPrompt[] }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/user-prompts`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Falha ao buscar prompts');
  return response.json();
};

export const createUserPrompt = async (
  token: string,
  data: { name: string; content: string }
): Promise<{ success: boolean; data: UserPrompt }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/user-prompts`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Falha ao criar prompt');
  }
  return response.json();
};

export const deleteUserPrompt = async (
  token: string,
  id: number
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/user-prompts/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Falha ao excluir prompt');
  return response.json();
};

export const fetchUnlinkedCampaignsCount = async (
  token: string
): Promise<{ count: number }> => {
  const response = await fetch(`${API_BASE_URL}/workspace/trackers/unlinked-campaigns/count`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch unlinked campaigns count');
  return response.json();
};

// ── Google Ads Integration APIs ───────────────────────────────────────────

export const fetchGoogleIntegrationLogs = async (token: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/integrations`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch integration logs');
  return response.json();
};

export const fetchConversionActions = async (
  token: string,
  googleAccountId: number,
  customerId: string
): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/workspace/google-ads/accounts/${googleAccountId}/conversion-actions?customer_id=${customerId}`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to fetch conversion actions');
  }
  return response.json();
};

export const linkTrackerToGoogleAds = async (
  token: string,
  trackerId: number,
  data: {
    google_account_id: number;
    google_ads_customer_id: string;
    is_mcc?: boolean;
    login_customer_id?: string;
    google_ads_conversion_id?: string;
    google_ads_conversion_label?: string;
    google_ads_checkout_conversion_id?: string;
    google_ads_checkout_conversion_label?: string;
    auto_create_pixels?: boolean;
  }
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/trackers/${trackerId}/link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to link tracker');
  }
  return response.json();
};

export const unlinkTrackerFromGoogleAds = async (
  token: string,
  trackerId: number,
  connectionId: number
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/trackers/${trackerId}/link/${connectionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to unlink tracker');
  }
  return response.json();
};

export const ensureTrackerPixel = async (token: string, trackerId: number, connectionId: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/workspace/google-ads/trackers/${trackerId}/ensure-pixel/${connectionId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to ensure pixel');
  }
  return response.json();
};

const api = {
  fetchVisitorsLogs, fetchCanvasViews, saveCanvasView, deleteCanvasView,
  fetchTrackers, createTracker, updateTracker, deleteTracker, fetchScrollAnalytics,
  fetchPlatforms, fetchUserPlatforms, createUserPlatform, deleteUserPlatform,
  fetchDomains, createDomain, verifyDomain, deleteDomain,
  fetchSites, createSite, updateSite, deleteSite, captureSite,
  fetchDashboard, generateVisitorInsight, fetchVisitorDetail, fetchVisitorReplay, fetchDashboardCharts,
  updateProfile, updatePassword, updatePreferences,

  // Create generic get/post helpers for AdminSettings to work without full refactor
  get: async (url: string) => {
    const token = localStorage.getItem('sf_token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';
    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('API GET failed');
    return { data: await res.json() };
  },
  post: async (url: string, body: any) => {
    const token = localStorage.getItem('sf_token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw { response: { data: err } };
    }
    return { data: await res.json() };
  }
};

export default api;
