// ══════════════════════════════════════════════════════════════
//  Financial Module API — Comunidade Fênix
// ══════════════════════════════════════════════════════════════

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';

const headers = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

// ── Types ────────────────────────────────────────────────────

export interface FinancialCategory {
  id: number;
  user_id: number | null;
  type: 'revenue' | 'expense';
  name: string;
  slug: string;
  is_system: boolean;
  sort_order: number;
}

export interface FinancialEntry {
  id: number;
  user_id: number;
  category_id: number;
  group: 'revenue' | 'expense';
  month: number;
  year: number;
  entry_date: string | null;
  name: string | null;
  value: string;
  category?: FinancialCategory;
  created_at: string;
}

export interface CompanyRow {
  category_id: number;
  category_name: string;
  category_type: 'revenue' | 'expense';
  is_system: boolean;
  months: Record<number, number>;
  total: number;
}

export interface DashboardData {
  total_vendas: number;
  total_despesas: number;
  reembolsos: number;
  lucro: number;
  roi: number;
  chart: { month: number; receitas: number; despesas: number }[];
  year: number;
}

export interface ProductMining {
  id: number;
  product_name: string;
  mining_status: 'em_teste' | 'validado' | 'nao_validou' | null;
  vol_fundo: string | null;
  vol_top_face: string | null;
  vol_top_similarweb: string | null;
  comissao_media: string | null;
  cpc_medio: string | null;
  extra_col1_header: string | null;
  extra_col1_value: string | null;
  extra_col2_header: string | null;
  extra_col2_value: string | null;
  extra_col3_header: string | null;
  extra_col3_value: string | null;
  obs: string | null;
  tracker_id?: number;
  active?: boolean;
}

export interface ViabilitySettings {
  id: number;
  comissao_media: string;
  valor_gasto: string;
  visitas: number;
  checkout: number;
}

// ── Categories ───────────────────────────────────────────────

export const fetchCategories = async (token: string): Promise<FinancialCategory[]> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/categories`, { headers: headers(token) });
  if (!res.ok) throw new Error('Falha ao buscar categorias');
  const json = await res.json();
  return json.data;
};

export const createCategory = async (token: string, data: { type: string; name: string }): Promise<FinancialCategory> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/categories`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao criar categoria');
  const json = await res.json();
  return json.data;
};

export const deleteCategory = async (token: string, id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/categories/${id}`, {
    method: 'DELETE', headers: headers(token),
  });
  if (!res.ok) throw new Error('Falha ao remover categoria');
};

// ── Dashboard ────────────────────────────────────────────────

export const fetchFinancialDashboard = async (
  token: string,
  year?: number,
  month?: number | null
): Promise<DashboardData> => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());
  const res = await fetch(`${API_BASE_URL}/workspace/financial/dashboard?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error('Falha ao buscar dashboard');
  const json = await res.json();
  return json.data;
};

// ── Company ──────────────────────────────────────────────────

export const fetchCompanyData = async (token: string, year?: number): Promise<{ rows: CompanyRow[]; year: number }> => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  const res = await fetch(`${API_BASE_URL}/workspace/financial/company?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error('Falha ao buscar dados empresa');
  const json = await res.json();
  return json.data;
};

export const updateCompanyCell = async (
  token: string,
  data: { category_id: number; month: number; year: number; value: number }
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/company`, {
    method: 'PUT', headers: headers(token), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao salvar dado');
};

// ── Entries ──────────────────────────────────────────────────

export const fetchEntries = async (
  token: string,
  year?: number,
  month?: number | null
): Promise<{ entries: FinancialEntry[]; total_revenue: number; total_expense: number; saldo: number }> => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());
  const res = await fetch(`${API_BASE_URL}/workspace/financial/entries?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error('Falha ao buscar lançamentos');
  const json = await res.json();
  return json.data;
};

export const createEntry = async (token: string, data: Record<string, any>): Promise<FinancialEntry> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/entries`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao criar lançamento');
  const json = await res.json();
  return json.data;
};

export const updateEntry = async (token: string, id: number, data: Record<string, any>): Promise<FinancialEntry> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/entries/${id}`, {
    method: 'PUT', headers: headers(token), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao atualizar lançamento');
  const json = await res.json();
  return json.data;
};

export const deleteEntry = async (token: string, id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/entries/${id}`, {
    method: 'DELETE', headers: headers(token),
  });
  if (!res.ok) throw new Error('Falha ao remover lançamento');
};

// ── Mining ───────────────────────────────────────────────────

export const fetchMining = async (token: string): Promise<ProductMining[]> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/mining`, { headers: headers(token) });
  if (!res.ok) throw new Error('Falha ao buscar garimpagem');
  const json = await res.json();
  return json.data;
};

export const createMining = async (token: string, data: Record<string, any>): Promise<ProductMining> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/mining`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao criar produto');
  const json = await res.json();
  return json.data;
};

export const updateMining = async (token: string, id: number, data: Record<string, any>): Promise<ProductMining> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/mining/${id}`, {
    method: 'PUT', headers: headers(token), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao atualizar produto');
  const json = await res.json();
  return json.data;
};

export const deleteMining = async (token: string, id: number): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/mining/${id}`, {
    method: 'DELETE', headers: headers(token),
  });
  if (!res.ok) throw new Error('Falha ao remover produto');
};

// ── Viability ────────────────────────────────────────────────

export const fetchViability = async (token: string): Promise<ViabilitySettings> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/viability`, { headers: headers(token) });
  if (!res.ok) throw new Error('Falha ao buscar viabilidade');
  const json = await res.json();
  return json.data;
};

export const updateViability = async (token: string, data: Record<string, any>): Promise<ViabilitySettings> => {
  const res = await fetch(`${API_BASE_URL}/workspace/financial/viability`, {
    method: 'PUT', headers: headers(token), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao salvar viabilidade');
  const json = await res.json();
  return json.data;
};
