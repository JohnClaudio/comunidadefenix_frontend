export interface Domain {
  id: number;
  user_id: number;
  name: string;
  cloudflare_zone_id: string;
  cloudflare_nameservers: string[];
  status: 'active' | 'pending' | 'error';
  ssl_mode: string;
  always_use_https: boolean;
  created_at: string;
  updated_at: string;
}

export interface DomainsResponse {
  current_page: number;
  data: Domain[];
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
}

export interface DomainFormData {
  name: string;
}
