import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMining, createMining, updateMining, deleteMining, ProductMining } from '@/services/financialApi';
import { DecryptedText } from '@/components/DecryptedText';
import FinancialNav from '@/components/FinancialNav';
import { Plus, Trash2, RefreshCw, ArrowUpDown, Search, Download } from 'lucide-react';

type MiningStatus = 'em_teste' | 'validado' | 'nao_validou' | null;
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  em_teste:     { label: 'Em Teste',     color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b40' },
  validado:     { label: 'Validado',     color: '#22c55e', bg: '#22c55e15', border: '#22c55e40' },
  nao_validou:  { label: 'Não Validou',  color: '#ef4444', bg: '#ef444415', border: '#ef444440' },
};

const fmt = (v: string | null) => {
  if (!v || v === '0.00') return '-';
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtNum = (v: string | null) => {
  if (!v || v === '0.00') return '-';
  return parseFloat(v).toLocaleString('pt-BR');
};

const FinancialMining: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductMining[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchMining(token);
      setProducts(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!token) return;
    try {
      await createMining(token, { product_name: 'Novo Produto' });
      load();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try { await deleteMining(token, id); load(); } catch (e) { console.error(e); }
  };

  const handleCellEdit = (id: number, field: string, currentValue: string) => {
    setEditingCell(`${id}-${field}`);
    setEditValue(currentValue || '');
  };

  const handleCellSave = async (id: number, field: string) => {
    if (!token) return;
    try {
      await updateMining(token, id, { [field]: editValue || null });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: editValue } : p));
    } catch (e) { console.error(e); }
    setEditingCell(null);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const filtered = products
    .filter(p => !search || p.product_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortCol) return 0;
      const aVal = (a as any)[sortCol] ?? '';
      const bVal = (b as any)[sortCol] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const exportCSV = () => {
    const headers = ['Produto','Vol. Fundo','Vol. Top: Face','Vol. Top: Similarweb','Comissão Média','CPC Médio','Extra 1','Extra 2','Extra 3','Obs'];
    const rows = products.map(p => [
      p.product_name, p.vol_fundo, p.vol_top_face, p.vol_top_similarweb,
      p.comissao_media, p.cpc_medio, p.extra_col1_value, p.extra_col2_value, p.extra_col3_value, p.obs
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.map(v => v ?? '').join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'garimpagem.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const Cell = ({ id, field, value, isCurrency, isNumber }: {
    id: number; field: string; value: string | null; isCurrency?: boolean; isNumber?: boolean;
  }) => {
    const key = `${id}-${field}`;
    if (editingCell === key) {
      return (
        <input autoFocus type="text" value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellSave(id, field)}
          onKeyDown={(e) => e.key === 'Enter' && handleCellSave(id, field)}
          className="w-full bg-muted border border-primary/40 rounded px-2 py-1 text-xs text-foreground outline-none"
        />
      );
    }
    const display = isCurrency ? fmt(value) : isNumber ? fmtNum(value) : (value || '-');
    return (
      <span onClick={() => handleCellEdit(id, field, value || '')}
        className="cursor-pointer hover:bg-primary/10 rounded px-2 py-1 block transition-colors text-xs text-foreground/80"
      >
        {display}
      </span>
    );
  };

  const SortHeader = ({ label, col }: { label: string; col: string }) => (
    <th onClick={() => handleSort(col)}
      className="px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60 cursor-pointer hover:text-primary transition-colors whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        {sortCol === col && <ArrowUpDown size={10} className="text-orange-400" />}
      </span>
    </th>
  );

  // Get custom headers from first product that has them
  const h1 = products.find(p => p.extra_col1_header)?.extra_col1_header || 'Coluna Extra 1';
  const h2 = products.find(p => p.extra_col2_header)?.extra_col2_header || 'Coluna Extra 2';
  const h3 = products.find(p => p.extra_col3_header)?.extra_col3_header || 'Coluna Extra 3';

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: 'hsl(var(--fin-page-bg))' }}>
      <FinancialNav />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: 'hsl(var(--fin-accent))' }}>
          Garimpagem
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input type="text" placeholder="Buscar produto..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg pl-9 pr-3 py-2 text-sm outline-none w-48 placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-primary hover:bg-primary/10 transition-colors text-sm"
          >
            <Download size={14} /> CSV
          </button>
          <button onClick={() => navigate('/dashboard/trackers')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-foreground text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--fin-border))] overflow-hidden" style={{ background: 'hsl(var(--fin-card-bg))' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr style={{ background: 'hsl(var(--fin-table-header-bg))' }}>
                <SortHeader label="Produto" col="product_name" />
                <th className="px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60 whitespace-nowrap">Status</th>
                <SortHeader label="Vol. Fundo" col="vol_fundo" />
                <SortHeader label="Vol. Top: Face" col="vol_top_face" />
                <SortHeader label="Vol. Top: Similarweb" col="vol_top_similarweb" />
                <SortHeader label="Comissão Média" col="comissao_media" />
                <SortHeader label="CPC Médio" col="cpc_medio" />
                <SortHeader label={h1} col="extra_col1_value" />
                <SortHeader label={h2} col="extra_col2_value" />
                <SortHeader label={h3} col="extra_col3_value" />
                <th className="px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60">Obs</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 13 }).map((_, j) => (
                      <td key={j} className="px-2 py-3"><div className="h-4 bg-muted/50 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-3 py-12 text-center text-muted-foreground/30 text-sm">
                    Nenhum produto encontrado. Clique em "+ Produto" para adicionar.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-1 py-1">
                      <span className="px-2 py-1 block text-xs text-foreground/80">
                        <DecryptedText value={p.product_name} />
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={p.mining_status || ''}
                        onChange={async (e) => {
                          const val = e.target.value as MiningStatus;
                          if (!token) return;
                          try {
                            await updateMining(token, p.id, { mining_status: val || null });
                            setProducts(prev => prev.map(x => x.id === p.id ? { ...x, mining_status: val || null } : x));
                          } catch (err) { console.error(err); }
                        }}
                        className="text-[10px] font-bold rounded-full px-2 py-0.5 cursor-pointer border outline-none"
                        style={{
                          background: p.mining_status ? STATUS_CONFIG[p.mining_status]?.bg : '#33333320',
                          color: p.mining_status ? STATUS_CONFIG[p.mining_status]?.color : '#888',
                          borderColor: p.mining_status ? STATUS_CONFIG[p.mining_status]?.border : '#33333340',
                        }}
                      >
                        <option value="">— Definir —</option>
                        <option value="em_teste">Em Teste</option>
                        <option value="validado">Validado</option>
                        <option value="nao_validou">Não Validou</option>
                      </select>
                    </td>
                    <td className="px-1 py-1"><Cell id={p.id} field="vol_fundo" value={p.vol_fundo} isNumber /></td>
                    <td className="px-1 py-1"><Cell id={p.id} field="vol_top_face" value={p.vol_top_face} isNumber /></td>
                    <td className="px-1 py-1"><Cell id={p.id} field="vol_top_similarweb" value={p.vol_top_similarweb} isNumber /></td>
                    <td className="px-1 py-1"><Cell id={p.id} field="comissao_media" value={p.comissao_media} isCurrency /></td>
                    <td className="px-1 py-1"><Cell id={p.id} field="cpc_medio" value={p.cpc_medio} isCurrency /></td>
                    <td className="px-1 py-1"><Cell id={p.id} field="extra_col1_value" value={p.extra_col1_value} /></td>
                    <td className="px-1 py-1"><Cell id={p.id} field="extra_col2_value" value={p.extra_col2_value} /></td>
                    <td className="px-1 py-1"><Cell id={p.id} field="extra_col3_value" value={p.extra_col3_value} /></td>
                    <td className="px-1 py-1"><Cell id={p.id} field="obs" value={p.obs} /></td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg text-rose-500/40 hover:text-rose-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialMining;
