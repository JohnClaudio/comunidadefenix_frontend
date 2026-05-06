import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCompanyData, updateCompanyCell, CompanyRow } from '@/services/financialApi';
import FinancialNav from '@/components/FinancialNav';
import { RefreshCw, TrendingUp, ArrowDownRight, TrendingDown, DollarSign } from 'lucide-react';

const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS = ['Total Geral','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinancialCompany: React.FC = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const d = await fetchCompanyData(token, year);
      setRows(d.rows);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, year]);

  useEffect(() => { load(); }, [load]);

  // Computed values
  const revenueRows = rows.filter(r => r.category_type === 'revenue');
  const expenseRows = rows.filter(r => r.category_type === 'expense');

  const sumByMonth = (filteredRows: CompanyRow[], m: number) =>
    filteredRows.reduce((acc, r) => acc + (r.months[m] || 0), 0);

  const totalRevenueByMonth = (m: number) => sumByMonth(revenueRows, m);
  const totalExpenseByMonth = (m: number) => sumByMonth(expenseRows, m);
  const reembolsosByMonth = (m: number) => {
    const reembolsoRows = rows.filter(r => r.category_name.toLowerCase().includes('reembolso') && r.category_type === 'expense');
    return sumByMonth(reembolsoRows, m);
  };
  const receitaLiquidaByMonth = (m: number) => totalRevenueByMonth(m) - reembolsosByMonth(m);
  const lucroByMonth = (m: number) => receitaLiquidaByMonth(m) - totalExpenseByMonth(m);
  const roiByMonth = (m: number) => {
    const desp = totalExpenseByMonth(m);
    return desp > 0 ? ((lucroByMonth(m) / desp) * 100) : 0;
  };

  const totalAll = (fn: (m: number) => number) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += fn(m);
    return total;
  };

  // KPIs
  const kTotalReceitas = month === 0 ? revenueRows.reduce((a, r) => a + r.total, 0) : totalRevenueByMonth(month);
  const kReembolsos = month === 0 ? rows.filter(r => r.category_name.toLowerCase().includes('reembolso')).reduce((a, r) => a + r.total, 0) : reembolsosByMonth(month);
  const kTotalDespesas = month === 0 ? expenseRows.reduce((a, r) => a + r.total, 0) : totalExpenseByMonth(month);
  const kLucro = kTotalReceitas - kReembolsos - kTotalDespesas;

  const handleCellClick = (catId: number, m: number, currentValue: number) => {
    const key = `${catId}-${m}`;
    setEditingCell(key);
    setEditValue(currentValue.toString());
  };

  const handleCellSave = async (catId: number, m: number) => {
    if (!token) return;
    const value = parseFloat(editValue.replace(',', '.')) || 0;
    try {
      await updateCompanyCell(token, { category_id: catId, month: m, year, value });
      setRows(prev => prev.map(r => {
        if (r.category_id === catId) {
          const newMonths = { ...r.months, [m]: value };
          return { ...r, months: newMonths, total: Object.values(newMonths).reduce((a, v) => a + v, 0) };
        }
        return r;
      }));
    } catch (e) { console.error(e); }
    setEditingCell(null);
  };

  const renderCell = (row: CompanyRow, m: number) => {
    const key = `${row.category_id}-${m}`;
    const val = row.months[m] || 0;

    if (editingCell === key) {
      return (
        <input
          autoFocus
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellSave(row.category_id, m)}
          onKeyDown={(e) => e.key === 'Enter' && handleCellSave(row.category_id, m)}
          className="w-full bg-[hsl(var(--fin-input-bg))] border border-primary/40 rounded px-1 py-0.5 text-sm text-right text-foreground outline-none focus:ring-1 focus:ring-primary/50"
        />
      );
    }

    return (
      <span
        onClick={() => handleCellClick(row.category_id, m, val)}
        className="cursor-pointer hover:bg-primary/10 rounded px-1 py-0.5 block text-right transition-colors"
      >
        {val === 0 ? <span className="text-muted-foreground">-</span> : fmt(val)}
      </span>
    );
  };

  const SummaryRow = ({ label, fn, bold, highlight }: { label: string; fn: (m: number) => number; bold?: boolean; highlight?: boolean }) => (
    <tr className={`${bold ? 'font-bold' : ''} ${highlight ? 'bg-primary/10' : ''}`}>
      <td className={`sticky left-0 z-10 px-3 py-2 text-sm ${highlight ? 'text-[hsl(var(--fin-accent))]' : 'text-foreground'}`}
        style={{ background: highlight ? 'hsl(var(--fin-card-alt-bg))' : 'hsl(var(--fin-card-bg))' }}
      >
        {label}
      </td>
      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
        <td key={m} className={`px-2 py-2 text-sm text-right ${highlight ? 'text-[hsl(var(--fin-accent))]' : 'text-foreground/90'}`}>
          {fn(m) === 0 ? <span className="text-muted-foreground">-</span> : fmt(fn(m))}
        </td>
      ))}
      <td className={`px-2 py-2 text-sm text-right font-bold ${highlight ? 'text-[hsl(var(--fin-accent))]' : 'text-primary'}`}>
        {fmt(totalAll(fn))}
      </td>
    </tr>
  );

  const RoiRow = () => (
    <tr className="bg-white/5">
      <td className="sticky left-0 z-10 px-3 py-2 text-sm text-foreground" style={{ background: 'hsl(var(--fin-card-alt-bg))' }}>
        ROI
      </td>
      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
        const roi = roiByMonth(m);
        const color = roi > 0 ? 'text-emerald-500' : (roi < 0 ? 'text-rose-500' : 'text-foreground/70');
        return (
          <td key={m} className={`px-2 py-2 text-sm text-right ${color} font-medium`}>
            {roi.toFixed(0)}%
          </td>
        );
      })}
      <td className="px-2 py-2 text-sm text-right font-bold text-primary">
        {(totalAll(lucroByMonth) > 0 && totalAll(totalExpenseByMonth) > 0
          ? ((totalAll(lucroByMonth) / totalAll(totalExpenseByMonth)) * 100).toFixed(0)
          : 0)}%
      </td>
    </tr>
  );

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: 'hsl(var(--fin-page-bg))' }}>
      <FinancialNav />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h1
          className="text-2xl md:text-3xl font-bold"
          style={{ fontFamily: "'Cinzel', serif", color: 'hsl(var(--fin-accent))' }}
        >
          Gestão Financeira | Empresa
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <button onClick={load} className="p-2 rounded-lg bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-primary hover:bg-primary/10 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger-fade-in">
        {[
          { label: 'TOTAL DE RECEITAS', value: kTotalReceitas, color: '#22c55e', icon: TrendingUp },
          { label: 'REEMBOLSOS', value: kReembolsos, color: '#ef4444', icon: ArrowDownRight },
          { label: 'TOTAL DE DESPESAS', value: kTotalDespesas, color: '#ef4444', icon: TrendingDown },
          { label: 'LUCRO', value: kLucro, color: 'hsl(var(--fin-accent))', icon: DollarSign },
        ].map((kpi, i) => (
          <div key={i} className="relative rounded-xl p-4 border transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'hsl(var(--fin-card-bg))', borderColor: kpi.color.startsWith('hsl') ? kpi.color.replace(')', ' / 0.2)') : `${kpi.color}33` }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: kpi.color }} />
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={14} style={{ color: kpi.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {loading ? <div className="h-6 w-24 bg-muted rounded animate-pulse" /> : fmt(kpi.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-[hsl(var(--fin-border))] overflow-hidden" style={{ background: 'hsl(var(--fin-card-bg))' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr style={{ background: 'hsl(var(--fin-table-header-bg))' }}>
                <th className="sticky left-0 z-20 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60"
                  style={{ background: 'hsl(var(--fin-table-header-bg))', minWidth: '200px' }}
                />
                {MONTH_SHORT.map(m => (
                  <th key={m} className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-primary/60" style={{ minWidth: '80px' }}>
                    {m}
                  </th>
                ))}
                <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--fin-accent))]" style={{ minWidth: '90px' }}>
                  Total Geral
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/10">
              {/* Summary rows */}
              <SummaryRow label="Receita Bruta (A)" fn={totalRevenueByMonth} bold />
              <SummaryRow label="Reembolsos (B)" fn={reembolsosByMonth} />
              <SummaryRow label="Receita Líquida (A-B)" fn={receitaLiquidaByMonth} />
              <SummaryRow label="Despesas (C)" fn={totalExpenseByMonth} />
              <SummaryRow label="Lucro/Prejuízo (A-B-C)" fn={lucroByMonth} bold highlight />
              <RoiRow />

              {/* Spacer */}
              <tr><td colSpan={14} className="h-3" /></tr>

              {/* Revenue header */}
              <tr>
                <td colSpan={14} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground"
                  style={{ background: '#e87722' }}
                >
                  Receitas
                </td>
              </tr>
              {revenueRows.map(row => (
                <tr key={row.category_id} className="hover:bg-primary/5 transition-colors">
                  <td className="sticky left-0 z-10 px-3 py-2 text-sm text-foreground/90" style={{ background: 'hsl(var(--fin-sticky-bg))' }}>
                    {row.category_name}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <td key={m} className="px-1 py-1 text-sm text-foreground/80">
                      {renderCell(row, m)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-sm text-right font-bold text-foreground" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--fin-accent) / 0.06))' }}>
                    {row.total === 0 ? '-' : fmt(row.total)}
                  </td>
                </tr>
              ))}

              {/* Spacer */}
              <tr><td colSpan={14} className="h-3" /></tr>

              {/* Expense header */}
              <tr>
                <td colSpan={14} className="px-3 py-2 text-sm font-bold uppercase tracking-wider text-foreground"
                  style={{ background: '#e87722' }}
                >
                  Despesas
                </td>
              </tr>
              {expenseRows.map(row => (
                <tr key={row.category_id} className="hover:bg-primary/5 transition-colors">
                  <td className="sticky left-0 z-10 px-3 py-2 text-sm text-foreground/90" style={{ background: 'hsl(var(--fin-sticky-bg))' }}>
                    {row.category_name}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <td key={m} className="px-1 py-1 text-sm text-foreground/80">
                      {renderCell(row, m)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-sm text-right font-bold text-foreground" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--fin-accent) / 0.06))' }}>
                    {row.total === 0 ? '-' : fmt(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialCompany;
