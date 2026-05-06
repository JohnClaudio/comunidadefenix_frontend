export type SiteType = 'pressel' | 'ai_builder';
export type LandingStatus = 'pending' | 'generating' | 'done' | 'failed' | null;

export interface Site {
  id: number;
  name: string | null;
  type: SiteType;
  host: string;
  slug: string;
  url: string;
  aff_link: string | null;
  matomo_id: number | null;
  accept_language: string;
  active: boolean;
  last_captured_at: string | null;
  capture_status: 'success' | 'failed' | 'pending' | null;
  landing_status: LandingStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_id: number;
  tracker_id: number | null;
  domain_id: number | null;
  title: string | null;
  head: string | null;
  script: string | null;
  desk_image: string | null;
  mobile_image: string | null;
  ai_progress?: string;
}

export interface SitesResponse {
  success: boolean;
  data: {
    current_page: number;
    data: Site[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: {
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

// Common fields for both types
export interface SiteFormDataBase {
  name?: string;
  domain_id: number;
  subdomain?: string;
  slug?: string;
  tracker_id?: number | null;
  aff_link?: string;
  active?: boolean;
}

// Pressel specific
export interface PresselFormData extends SiteFormDataBase {
  type: 'pressel';
  url: string;
}

// AI Builder specific
export interface AiBuilderFormData extends SiteFormDataBase {
  type: 'ai_builder';
  source_url?: string;
  source_text?: string;
  style_url?: string;
  style_text?: string;
  prompt: string;
  accept_language?: string;
  images?: File[];
  scraped_images?: string[];
}

export type SiteFormData = PresselFormData | AiBuilderFormData;

// Legacy compat – update endpoint uses flat fields
export interface SiteUpdateData {
  name?: string;
  domain_id: number;
  subdomain?: string;
  slug?: string;
  tracker_id?: number | null;
  url?: string;
  aff_link?: string;
  accept_language?: string;
}
