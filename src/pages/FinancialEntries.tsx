import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchEntries, createEntry, deleteEntry,
  fetchCategories, FinancialEntry, FinancialCategory,
} from '@/services/financialApi';
import FinancialNav from '@/components/FinancialNav';
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const MONTHS_LABEL = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinancialEntries: React.FC = () => {
  const { token } = useAuth();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [formDate, setFormDate] = useState('');
  const [formGroup, setFormGroup] = useState<'revenue' | 'expense'>('revenue');
  const [formCategoryId, setFormCategoryId] = useState<number>(0);
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [entriesData, cats] = await Promise.all([
        fetchEntries(token, year, filterMonth || null),
        fetchCategories(token),
      ]);
      setEntries(entriesData.entries);
      setTotalRevenue(entriesData.total_revenue);
      setTotalExpense(entriesData.total_expense);
      setSaldo(entriesData.saldo);
      setCategories(cats);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, year, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const filteredCategories = categories.filter(c => c.type === formGroup);

  useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id === formCategoryId)) {
      setFormCategoryId(filteredCategories[0].id);
    }
  }, [formGroup, filteredCategories]);

  const handleSubmit = async () => {
    if (!token || !formCategoryId || !formValue) return;
    setSubmitting(true);
    try {
      await createEntry(token, {
        category_id: formCategoryId,
        group: formGroup,
        month: formMonth,
        year,
        entry_date: formDate || null,
        name: formName || null,
        value: parseFloat(formValue.replace(',', '.')) || 0,
      });
      setFormName('');
      setFormValue('');
      setFormDate('');
      setShowForm(false);
      load();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await deleteEntry(token, id);
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: 'hsl(var(--fin-page-bg))' }}>
      <FinancialNav />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: 'hsl(var(--fin-accent))' }}>
          Outras Receitas e Despesas
        </h1>
        <div className="flex items-center gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value={0}>Todos os meses</option>
            {MONTHS_LABEL.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-foreground text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={16} /> Lançamento
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3 mb-6 stagger-fade-in">
        {[
          { label: 'Total Receitas', value: totalRevenue, color: '#22c55e', icon: TrendingUp },
          { label: 'Total Despesas', value: totalExpense, color: '#ef4444', icon: TrendingDown },
          { label: 'Saldo', value: saldo, color: saldo >= 0 ? '#e87722' : '#ef4444', icon: DollarSign },
        ].map((k, i) => (
          <div key={i} className="relative rounded-xl p-4 border" style={{ background: 'hsl(var(--fin-card-bg))', borderColor: k.color.startsWith('hsl') ? k.color.replace(')', ' / 0.2)') : `${k.color}33` }}>
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: k.color }} />
            <div className="flex items-center gap-2 mb-1">
              <k.icon size={14} style={{ color: k.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {loading ? <div className="h-6 w-24 bg-muted rounded animate-pulse" /> : fmt(k.value)}
            </div>
          </div>
        ))}
      </div>

      {/* New Entry Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 p-5 mb-6 slide-up" style={{ background: 'hsl(var(--fin-card-alt-bg))' }}>
          <h3 className="text-sm font-bold text-[hsl(var(--fin-accent))] mb-4 uppercase tracking-wider">Novo Lançamento</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Mês</label>
              <select value={formMonth} onChange={(e) => setFormMonth(Number(e.target.value))}
                className="w-full bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none"
              >
                {MONTHS_LABEL.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Data</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Grupo</label>
              <select value={formGroup} onChange={(e) => setFormGroup(e.target.value as 'revenue' | 'expense')}
                className="w-full bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="revenue">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Tipo</label>
              <select value={formCategoryId} onChange={(e) => setFormCategoryId(Number(e.target.value))}
                className="w-full bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none"
              >
                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Nome</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Descrição"
                className="w-full bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Valor R$</label>
              <div className="flex gap-2">
                <input type="text" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="0,00"
                  className="w-full bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary text-foreground text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {submitting ? '...' : 'âœ“'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="rounded-xl border border-[hsl(var(--fin-border))] overflow-hidden" style={{ background: 'hsl(var(--fin-card-bg))' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'hsl(var(--fin-card-alt-bg))' }}>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60">Mês</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60">Data</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60">Grupo</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60">Tipo</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-primary/60">Nome</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-primary/60">Valor R$</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-primary/60 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-muted/50 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground/30 text-sm">
                    Nenhum lançamento encontrado. Clique em "+ Lançamento" para adicionar.
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-foreground/80">{MONTHS_LABEL[entry.month]}</td>
                    <td className="px-3 py-2.5 text-xs text-foreground/80">
                      {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        entry.group === 'revenue'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-rose-500'
                      }`}>
                        {entry.group === 'revenue' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-foreground/80">{entry.category?.name || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-foreground/80">{entry.name || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-right font-medium text-foreground">
                      {fmt(parseFloat(entry.value))}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => handleDelete(entry.id)}
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

export default FinancialEntries;
