export interface Platform {
  id: number;
  uuid: string;
  name: string;
  logo: string;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserPlatform {
  id: number;
  uuid: string;
  name: string;
  active: boolean;
  api_key?: string | null;
  platform: {
    id: number;
    name: string;
  };
  created_at: string;
}

export interface UserPlatformFormData {
  platform_id: number;
  name: string;
  api_key?: string;
}
