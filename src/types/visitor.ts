export interface VisitorLocation {
  country: string | null;
  iso: string;
  state: string | null;
  city: string | null;
}

export interface VisitorDevice {
  browser: string | null;
  system: string | null;
}

export interface VisitorSource {
  type: string;
  campaign: string | null;
  keyword: string | null;
  gclid: string | null;
}

export interface VisitorNetwork {
  ip: string;
  is_proxy: boolean;
}

export interface VisitorMetrics {
  session_duration: string | null;
  vendor_seconds: number;
  vendor_time_ago: string;
  escape: boolean;
}

export interface VisitorEvent {
  id?: number;
  type: string;
  target: string | null;
  time: string;
  label?: string | null;
  value?: string | number | null;
  duration?: number | null;
}

export interface VisitorActivityStatus {
  promisse: boolean;
  active: boolean;
}

export interface VisitorRecording {
  has_recording: boolean;
  ai_insight: string | null;
}

export interface Visitor {
  id: number;
  status: string;
  activity_status: VisitorActivityStatus;
  date: string;
  time_ago: string;
  location: VisitorLocation;
  device: VisitorDevice;
  source: VisitorSource;
  network: VisitorNetwork;
  metrics: VisitorMetrics;
  events: VisitorEvent[];
  recording: VisitorRecording;
  // Detail-only fields (returned by show endpoint)
  tracker_name?: string;
  url?: string;
  referer?: string;
  user_agent?: string;
  device_type?: string;
  total_visits?: number;
  past_sessions?: Array<{
    id: number;
    date: string;
    time_ago: string;
    created_at: string;
    status: string;
    tracker_name: string;
    url: string | null;
    referer: string | null;
    device_type: string | null;
    browser: string | null;
    system: string | null;
    session_duration: string | null;
    escape: boolean;
    campaign: string | null;
    keyword: string | null;
    gclid: string | null;
    events: Array<{ type: string; target: string | null; time: string }>;
    events_count: number;
  }>;
}

export interface VisitorsResponse {
  current_page: number;
  data: Visitor[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    page: number | null;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}
