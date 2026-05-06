import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = {
  cost: '#6366f1',
  revenue: '#10b981',
  profit: '#f59e0b',
  muted: '#a1a1aa',
  pie: ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#a1a1aa'],
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    fontSize: '12px',
    padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  labelStyle: { fontWeight: 600, marginBottom: 4, color: 'hsl(var(--foreground))' },
};

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const fmtFull = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ── Cost vs Revenue vs Profit Area Chart ─────────────────────────
interface TimeSeriesPoint { date: string; custo: number; receita: number; lucro?: number; }

export const CostRevenueChart: React.FC<{ data: TimeSeriesPoint[] }> = ({ data }) => {
  // Add lucro if not present
  const enrichedData = data.map(d => ({
    ...d,
    lucro: d.lucro !== undefined ? d.lucro : d.receita - d.custo,
  }));

  const totalCost = enrichedData.reduce((s, d) => s + d.custo, 0);
  const totalRev = enrichedData.reduce((s, d) => s + d.receita, 0);
  const totalProfit = totalRev - totalCost;

  return (
    <div className="border border-border/60 bg-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Custo vs Receita</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Desempenho no período selecionado</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Investido</p>
            <p className="text-sm font-bold" style={{ color: COLORS.cost }}>{fmt(totalCost)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Receita</p>
            <p className="text-sm font-bold" style={{ color: COLORS.revenue }}>{fmt(totalRev)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Lucro</p>
            <p className={`text-sm font-bold ${totalProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>{fmt(totalProfit)}</p>
          </div>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={enrichedData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.cost} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COLORS.cost} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtFull(v), name === 'custo' ? 'Custo' : name === 'receita' ? 'Receita' : 'Lucro']} />
            <Area type="monotone" dataKey="custo" stroke={COLORS.cost} strokeWidth={2} fill="url(#gradCost)" dot={false} />
            <Area type="monotone" dataKey="receita" stroke={COLORS.revenue} strokeWidth={2} fill="url(#gradRev)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-5 mt-3 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.cost }} /> Custo
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.revenue }} /> Receita
        </div>
      </div>
    </div>
  );
};

// ── Cost Distribution Donut ───────────────────────────────
interface PieSlice { name: string; value: number; }

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const CostDistributionPie: React.FC<{ data: PieSlice[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="border border-border/60 bg-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Distribuição de Custo</h3>
      <p className="text-xs text-muted-foreground mb-4">Top campanhas por investimento</p>
      <div className="h-[220px] flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              label={renderCustomLabel}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS.pie[i % COLORS.pie.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtFull(v), 'Custo']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 mt-3">
        {data.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS.pie[i % COLORS.pie.length] }} />
              <span className="text-muted-foreground truncate max-w-[140px]">{d.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium">{fmtFull(d.value)}</span>
              <span className="text-muted-foreground/60 w-10 text-right">{total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Top Campaigns Bar Chart ──────────────────────────────
interface BarItem { name: string; custo: number; receita: number; }

export const TopCampaignsBar: React.FC<{ data: BarItem[] }> = ({ data }) => (
  <div className="border border-border/60 bg-card rounded-xl p-5 col-span-full">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Top Campanhas por Custo</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Comparativo de investimento vs retorno</p>
      </div>
    </div>
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
          <Tooltip {...tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} formatter={(v: number, name: string) => [fmtFull(v), name === 'custo' ? 'Custo' : 'Receita']} />
          <Bar dataKey="custo" fill={COLORS.cost} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="receita" fill={COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="flex items-center gap-5 mt-3 px-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.cost }} /> Custo
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.revenue }} /> Receita
      </div>
    </div>
  </div>
);
