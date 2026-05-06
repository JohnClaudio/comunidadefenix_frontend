import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFinancialDashboard, DashboardData } from '@/services/financialApi';
import FinancialNav from '@/components/FinancialNav';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, ArrowDownRight, Percent } from 'lucide-react';

const MONTHS = ['Total Geral','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinancialAffiliate: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<number>(0); // 0 = total geral
  const [year, setYear] = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const d = await fetchFinancialDashboard(token, year, month || null);
      setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, year, month]);

  useEffect(() => { load(); }, [load]);

  const chartData = data?.chart.map((c, i) => ({
    name: MONTH_SHORT[i],
    Receitas: c.receitas,
    Despesas: c.despesas,
  })) || [];

  const kpis = [
    { label: 'TOTAL EM VENDAS', value: data?.total_vendas ?? 0, color: '#22c55e', icon: TrendingUp, fmt: fmt },
    { label: 'TOTAL DE DESPESAS', value: data?.total_despesas ?? 0, color: '#ef4444', icon: TrendingDown, fmt: fmt },
    { label: 'REEMBOLSOS', value: data?.reembolsos ?? 0, color: '#ef4444', icon: ArrowDownRight, fmt: fmt },
    { label: 'LUCRO', value: data?.lucro ?? 0, color: 'hsl(var(--fin-accent))', icon: DollarSign, fmt: fmt },
    { label: 'ROI', value: data?.roi ?? 0, color: '#ffffff', icon: Percent, fmt: (v: number) => `${v.toFixed(2).replace('.', ',')}%` },
  ];

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: 'hsl(var(--fin-page-bg))' }}>
      <FinancialNav />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h1
          className="text-2xl md:text-3xl font-bold"
          style={{ fontFamily: "'Cinzel', serif", color: 'hsl(var(--fin-accent))' }}
        >
          Resultados Afiliado
        </h1>

        <div className="flex items-center gap-3">
          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month filter */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <button
            onClick={load}
            className="p-2 rounded-lg bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-primary hover:bg-primary/10 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 stagger-fade-in">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="relative rounded-xl p-4 border transition-all duration-300 hover:-translate-y-1"
            style={{
              background: 'hsl(var(--fin-card-bg))',
              borderColor: kpi.color.startsWith('hsl') ? kpi.color.replace(')', ' / 0.2)') : `${kpi.color}33`,
              boxShadow: kpi.color.startsWith('hsl') ? `0 4px 20px ${kpi.color.replace(')', ' / 0.07)')}` : `0 4px 20px ${kpi.color}11`,
            }}
          >
            {/* Accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
              style={{ background: kpi.color }}
            />
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={14} style={{ color: kpi.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </span>
            </div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {loading ? (
                <div className="h-6 w-24 bg-muted rounded animate-pulse" />
              ) : (
                kpi.fmt(kpi.value)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div
        className="rounded-xl border border-[hsl(var(--fin-border))] p-5"
        style={{ background: 'hsl(var(--fin-card-bg))' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded bg-primary" />
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: 'hsl(var(--fin-accent))' }}
          >
            Receitas x Despesas
          </h2>
        </div>

        <div className="h-[350px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-muted-foreground/30" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#a0845e', fontSize: 11 }}
                  axisLine={{ stroke: '#ffffff10' }}
                />
                <YAxis
                  tick={{ fill: '#a0845e', fontSize: 11 }}
                  axisLine={{ stroke: '#ffffff10' }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--fin-input-bg))',
                    border: '1px solid #e8772233',
                    borderRadius: '10px',
                    color: 'hsl(var(--fin-accent))',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [fmt(value), '']}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }}
                />
                <Bar
                  dataKey="Receitas"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="Despesas"
                  fill="#e87722"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialAffiliate;
