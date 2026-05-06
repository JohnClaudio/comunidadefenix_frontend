import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { fetchViability, updateViability } from '@/services/financialApi';
import { fetchGoogleAdsAccounts, fetchGoogleAdsDailyReport } from '@/services/googleAdsApi';
import { useEncryption } from '@/contexts/EncryptionContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { decryptEnvelope, isEncryptedValue } from '@/services/crypto';
import FinancialNav from '@/components/FinancialNav';
import {
  Calculator, AlertTriangle, CheckCircle2, XCircle, Info,
  Briefcase, Loader2, BarChart3, ChevronDown, Check, Search, Calendar,
  TrendingUp, ShoppingCart, MousePointerClick, Target, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtN = (v: number, d = 2) => v.toLocaleString('pt-BR', { maximumFractionDigits: d });

// ─── Input Card ───────────────────────────────────────────────
const InCard = ({ label, val, set, pfx, icon: Icon }: {
  label: string; val: number; set: (v: number) => void; pfx?: string; icon?: any;
}) => (
  <div className="rounded-xl border border-[hsl(var(--fin-border))] p-4" style={{ background: 'hsl(var(--fin-card-alt-bg))' }}>
    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
      {Icon && <Icon size={11} className="text-primary/60" />}
      {label}
    </label>
    <div className="flex items-center gap-1">
      {pfx && <span className="text-primary text-sm font-bold">{pfx}</span>}
      <input
        type="number"
        value={val === 0 ? '' : val}
        onChange={e => set(e.target.value === '' ? 0 : parseFloat(e.target.value))}
        className="w-full bg-[hsl(var(--fin-input-bg))] border border-[hsl(var(--fin-border))] text-foreground rounded-lg px-3 py-2.5 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  </div>
);

// ─── CPA Card ─────────────────────────────────────────────────
const CpaCard = ({ label, pct, val, color }: { label: string; pct: string; val: number; color: string }) => (
  <div className="rounded-xl border p-4 relative overflow-hidden flex flex-col justify-center" style={{ background: 'hsl(var(--fin-card-bg))', borderColor: `${color}33` }}>
    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-lg font-black" style={{ color }}>{pct}</span>
    </div>
    <div className="text-2xl font-bold text-foreground">{fmt(val)}</div>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────
type ViabilityStatus = 'ok' | 'warning' | 'danger';
const getStatus = (percentGasto: number, visitas: number, checkout: number): { status: ViabilityStatus; label: string; color: string; bg: string; border: string } => {
  const visitasIdeal = visitas >= 30;
  const ckIdeal = visitas > 0 ? checkout >= visitas / 10 : false;

  if (percentGasto > 130) return { status: 'danger', label: 'Pausar Campanha', color: '#ef4444', bg: '#ef444412', border: '#ef444433' };
  if (!visitasIdeal) return { status: 'warning', label: 'Visitas Insuficientes', color: '#f59e0b', bg: '#f59e0b12', border: '#f59e0b33' };
  if (!ckIdeal) return { status: 'warning', label: 'Checkout Abaixo do Esperado', color: '#f97316', bg: '#f9731612', border: '#f9731633' };
  if (percentGasto > 80) return { status: 'warning', label: 'Atenção - Gasto Alto', color: '#e87722', bg: '#e8772212', border: '#e8772233' };
  return { status: 'ok', label: 'Viável', color: '#22c55e', bg: '#22c55e12', border: '#22c55e33' };
};

const StatusBadge = ({ s }: { s: ReturnType<typeof getStatus> }) => {
  const Icon = s.status === 'ok' ? CheckCircle2 : s.status === 'warning' ? AlertTriangle : XCircle;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <Icon size={10} /> {s.label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════
const FinancialViability: React.FC = () => {
  const { token } = useAuth();
  const { isUnlocked, privateKey } = useEncryption();
  const { isPrivacyMode } = usePrivacy();

  // ── Manual calculator state ──
  const [comissao, setComissao] = useState(560);
  const [valorGasto, setValorGasto] = useState(500);
  const [visitas, setVisitas] = useState(20);
  const [checkout, setCheckout] = useState(1);
  const [loaded, setLoaded] = useState(false);

  // ── Campaign import state ──
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null);
  const [importDays, setImportDays] = useState(30);

  // ── Load saved viability ──
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchViability(token);
      setComissao(parseFloat(data.comissao_media) || 560);
      setValorGasto(parseFloat(data.valor_gasto) || 0);
      setVisitas(data.visitas || 0);
      setCheckout(data.checkout || 0);
      setLoaded(true);
    } catch { setLoaded(true); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  // ── Auto-save ──
  useEffect(() => {
    if (!token || !loaded) return;
    const t = setTimeout(() => {
      updateViability(token, { comissao_media: comissao, valor_gasto: valorGasto, visitas, checkout }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [comissao, valorGasto, visitas, checkout, token, loaded]);

  // ── CPA calculations ──
  const cpaInicial = comissao * 0.5;
  const cpaLimite = comissao * 0.8;
  const cpaDestrave = comissao * 1.4;
  const percentGasto = comissao > 0 ? (valorGasto / comissao) * 100 : 0;
  const visitasPerCK = checkout > 0 ? visitas / checkout : 0;
  const ckIdeal = visitas > 0 ? visitas / 10 : 0;
  const viabilityStatus = getStatus(percentGasto, visitas, checkout);

  // ── Recommendation ──
  const rec = useMemo(() => {
    const msgs: string[] = [];
    if (percentGasto > 130) msgs.push('Pausar campanha recomendado. Gastos ultrapassaram 130% sem vendas.');
    else if (percentGasto > 80) msgs.push('Atenção! Gastos acima de 80% da comissão. Fique atento!');
    else msgs.push('Gastos dentro do ideal. Continue otimizando!');

    if (visitas < 30) msgs.push(`Visitas insuficientes (${visitas}/30 ideal).`);
    if (checkout < ckIdeal) msgs.push(`Checkout abaixo do esperado: ${checkout} de ${fmtN(ckIdeal, 0)} ideal (1 a cada 10 visitas).`);
    else if (checkout > 0) msgs.push(`Checkout OK: ${checkout} (ideal ≥ ${fmtN(ckIdeal, 0)}).`);

    return msgs;
  }, [percentGasto, visitas, checkout, ckIdeal]);

  // ── Fetch campaigns ──
  const { data: accountsData } = useQuery({
    queryKey: ['viability_campaigns'],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
    }),
    enabled: !!token,
  });

  const allCampaigns = useMemo(() => {
    if (!accountsData?.data || !Array.isArray(accountsData.data)) return [];
    return accountsData.data.flatMap((acc: any) => {
      if (!acc?.campaigns) return [];
      return acc.campaigns.map((c: any) => ({
        ...c,
        accountName: acc.name || '',
        trackerName: c?.tracker?.name || 'Sem Tracker',
      }));
    });
  }, [accountsData]);

  // ── Fetch report for selected campaign ──
  const { data: importReport, isFetching: isImporting } = useQuery({
    queryKey: ['viability_import', selectedImportId, importDays],
    queryFn: () => fetchGoogleAdsDailyReport(token!, {
      campaign_id: selectedImportId!,
      start_date: format(subDays(new Date(), importDays), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
    }),
    enabled: !!token && !!selectedImportId,
  });

  // ── Apply imported data ──
  useEffect(() => {
    if (!importReport?.data?.totals) return;
    const t = importReport.data.totals;
    setVisitas(Number(t.clicks) || 0);
    setCheckout(Number(t.checkouts) || Number(t.checkout_conversions) || 0);
    setValorGasto(Number(t.cost) || 0);
  }, [importReport]);

  // ── Build overview table from all campaigns with reports ──
  const { data: allReports, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['viability_overview'],
    queryFn: async () => {
      if (!token || allCampaigns.length === 0) return [];
      const results = await Promise.allSettled(
        allCampaigns.slice(0, 30).map(async (camp: any) => {
          const r = await fetchGoogleAdsDailyReport(token, {
            campaign_id: camp.id,
            start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
            end_date: format(new Date(), 'yyyy-MM-dd'),
          });
          return { camp, totals: r.data?.totals || {} };
        })
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => Number(r.totals.clicks) > 0 || Number(r.totals.cost) > 0);
    },
    enabled: !!token && allCampaigns.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // ── Decrypt campaign names (for select + table) ──
  const [decryptedNames, setDecryptedNames] = useState<Record<number, string>>({});
  useEffect(() => {
    if (!isUnlocked || !privateKey) return;
    // Decrypt all campaign names
    allCampaigns.forEach((camp: any) => {
      const name = camp?.name;
      if (!name || decryptedNames[camp.id]) return;
      if (!isEncryptedValue(name)) {
        setDecryptedNames(p => ({ ...p, [camp.id]: name }));
        return;
      }
      decryptEnvelope(name, privateKey)
        .then(plain => setDecryptedNames(p => ({ ...p, [camp.id]: plain })))
        .catch(() => setDecryptedNames(p => ({ ...p, [camp.id]: `Campanha ${camp.id}` })));
    });
  }, [allCampaigns, isUnlocked, privateKey]);

  const rules = [
    '1) O valor gasto não pode passar de 130% do valor da comissão média sem que haja ao menos 1 venda.',
    '2) O ideal é ao menos 30 Visitas (desconsiderando a Fuga).',
    '3) O ideal é 1 Checkout a Cada 10 Visitas.',
    '4) Observe as recomendações e analise sua campanha detalhadamente (Termos/CPC Médio/Posicionamento/Fuga).',
  ];

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: 'hsl(var(--fin-page-bg))' }}>
      <FinancialNav />
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "'Cinzel', serif", color: 'hsl(var(--fin-accent))' }}>
        Cálculo de Viabilidade
      </h1>

      {/* ═══ CPA Calculator ═══ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={16} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">Calculadora de CPA Inicial</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InCard label="Valor Médio de Comissão" val={comissao} set={setComissao} pfx="R$" />
          <CpaCard label="CPA Inicial" pct="50%" val={cpaInicial} color="#22c55e" />
          <CpaCard label="CPA Limite" pct="80%" val={cpaLimite} color="#e87722" />
          <CpaCard label="CPA Destrave" pct="140%" val={cpaDestrave} color="#ef4444" />
        </div>
      </div>

      {/* ═══ Viability Calculator ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={16} className="text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">Calculadora de Viabilidade de Teste</h2>
          </div>

          {/* ── Filtro: Preencher a partir de uma campanha ── */}
          <div className="rounded-xl border p-4 mb-4" style={{ background: 'hsl(var(--fin-card-alt-bg))', borderColor: 'hsl(var(--fin-border))' }}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Briefcase size={11} className="text-primary/60" />
              Preencher a partir de uma campanha (opcional)
            </label>
            <div className="flex items-center gap-2 mb-3">
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="flex-1 justify-between h-11 px-3 text-sm font-semibold bg-[hsl(var(--fin-input-bg))] border-[hsl(var(--fin-border))] hover:border-primary/50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isImporting ? (
                        <><Loader2 size={14} className="animate-spin text-primary" /> Importando...</>
                      ) : selectedImportId ? (
                        <span className={cn("truncate", isPrivacyMode && "blur-sm select-none")}>
                          {decryptedNames[selectedImportId] || 'Campanha'} — {allCampaigns.find((c: any) => c.id === selectedImportId)?.trackerName || ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selecionar campanha...</span>
                      )}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", comboOpen && "rotate-180 text-primary")} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl rounded-xl overflow-hidden" align="start" sideOffset={6}>
                  <Command filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                    return 0;
                  }}>
                    <div className="flex items-center border-b px-3 border-border">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <CommandInput placeholder="Pesquisar campanha..." className="h-10 border-none focus:ring-0 text-sm bg-transparent" />
                    </div>
                    <CommandList className="max-h-[260px]">
                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">Nenhuma campanha encontrada.</CommandEmpty>
                      <CommandGroup className="p-1.5">
                        {allCampaigns.map((camp: any) => {
                          const campName = decryptedNames[camp.id] || camp.name;
                          return (
                            <CommandItem
                              key={camp.id}
                              value={`${campName} ${camp.trackerName}`}
                              onSelect={() => { setSelectedImportId(camp.id); setComboOpen(false); }}
                              className="flex flex-col items-start p-2.5 mb-1 gap-0.5 cursor-pointer rounded-md"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={cn("font-bold text-xs text-foreground truncate", isPrivacyMode && "blur-sm select-none")}>{campName}</span>
                                {selectedImportId === camp.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                              </div>
                              <span className="text-[9px] text-muted-foreground">{camp.trackerName}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date range filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar size={12} className="text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground font-medium">Período:</span>
              {[{ label: '7 dias', days: 7 }, { label: '15 dias', days: 15 }, { label: '30 dias', days: 30 }, { label: '60 dias', days: 60 }].map(p => (
                <button
                  key={p.days}
                  onClick={() => setImportDays(p.days)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border",
                    importDays === p.days
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {selectedImportId && !isImporting && (
              <p className="text-[10px] text-emerald-500 mt-2 font-medium">✓ Dados dos últimos {importDays} dias importados com sucesso</p>
            )}
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <InCard label="Comissão (R$)" val={comissao} set={setComissao} pfx="R$" icon={Target} />
            <InCard label="Valor Gasto" val={valorGasto} set={setValorGasto} pfx="R$" icon={TrendingUp} />
            <InCard label="Visitas (Cliques)" val={visitas} set={setVisitas} icon={MousePointerClick} />
            <InCard label="Checkout" val={checkout} set={setCheckout} icon={ShoppingCart} />
          </div>

          {/* Checkout analysis bar */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border p-3 text-center" style={{ background: 'hsl(var(--fin-card-bg))', borderColor: checkout >= ckIdeal ? '#22c55e33' : '#f9731633' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Checkout Ideal (1/10)</div>
              <div className="text-xl font-black" style={{ color: '#3b82f6' }}>{fmtN(ckIdeal, 1)}</div>
            </div>
            <div className="rounded-xl border p-3 text-center" style={{ background: 'hsl(var(--fin-card-bg))', borderColor: checkout >= ckIdeal ? '#22c55e33' : '#f9731633' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Checkout Atual</div>
              <div className="text-xl font-black" style={{ color: checkout >= ckIdeal ? '#22c55e' : '#f97316' }}>{checkout}</div>
            </div>
            <div className="rounded-xl border p-3 text-center" style={{ background: 'hsl(var(--fin-card-bg))', borderColor: visitasPerCK <= 10 ? '#22c55e33' : '#ef444433' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Visitas / Checkout</div>
              <div className="text-xl font-black" style={{ color: visitasPerCK <= 10 ? '#22c55e' : checkout === 0 ? '#ef4444' : '#f97316' }}>
                {checkout > 0 ? fmtN(visitasPerCK, 1) : '∞'}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="rounded-xl border p-5 transition-all duration-500" style={{ background: viabilityStatus.bg, borderColor: viabilityStatus.border }}>
            <div className="flex items-start gap-3">
              {viabilityStatus.status === 'ok' ? <CheckCircle2 size={20} style={{ color: viabilityStatus.color }} className="mt-0.5 shrink-0" />
                : viabilityStatus.status === 'warning' ? <AlertTriangle size={20} style={{ color: viabilityStatus.color }} className="mt-0.5 shrink-0" />
                : <XCircle size={20} style={{ color: viabilityStatus.color }} className="mt-0.5 shrink-0" />}
              <div className="space-y-1">
                <h3 className="text-sm font-bold" style={{ color: viabilityStatus.color }}>Recomendação:</h3>
                {rec.map((r, i) => <p key={i} className="text-sm text-foreground/80">{r}</p>)}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2 italic">*As recomendações não anulam a análise geral da campanha</p>
        </div>

        {/* Rules */}
        <div className="rounded-xl border-2 p-5 h-fit" style={{ background: 'hsl(var(--fin-card-bg))', borderColor: '#e87722' }}>
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: 'hsl(var(--fin-accent))' }}>Regras:</h3>
          <div className="space-y-4">
            {rules.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Info size={14} className="text-primary/60 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground italic leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Overview Table ═══ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">Visão Geral — Viabilidade por Campanha (últimos 30 dias)</h2>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: 'hsl(var(--fin-card-bg))', borderColor: 'hsl(var(--fin-border))' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'hsl(var(--fin-card-alt-bg))' }} className="border-b-2 border-primary/20">
                  {['Campanha', 'Produto', 'Cliques', 'Checkout', 'Checkout Ideal', 'Vis/Checkout', 'Conversões', 'Custo', 'Fat.', 'Lucro', 'Status'].map(h => (
                    <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoadingOverview ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={11} className="px-3 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
                  ))
                ) : !allReports?.length ? (
                  <tr><td colSpan={11} className="px-3 py-12 text-center text-muted-foreground text-xs">Nenhum dado disponível</td></tr>
                ) : (
                  allReports.map((r: any, idx: number) => {
                    const t = r.totals;
                    const clicks = Number(t.clicks) || 0;
                    const ck = Number(t.checkouts) || Number(t.checkout_conversions) || 0;
                    const conv = Number(t.conversions) || 0;
                    const cost = Number(t.cost) || 0;
                    const revenue = Number(t.conversion_value) || 0;
                    const profit = revenue - cost;
                    const ckI = clicks > 0 ? clicks / 10 : 0;
                    const visPerCk = ck > 0 ? clicks / ck : 0;
                    const pctGasto = comissao > 0 ? (cost / comissao) * 100 : 0;
                    const st = getStatus(pctGasto, clicks, ck);
                    const name = decryptedNames[r.camp.id] || '•••';

                    return (
                      <tr key={r.camp.id} className={cn("transition-colors hover:bg-accent/30", idx % 2 === 1 && "bg-muted/10")}>
                        <td className={cn("px-3 py-2.5 text-xs font-bold text-foreground max-w-[180px] truncate", isPrivacyMode && "blur-sm select-none")}>{name}</td>
                        <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{r.camp.trackerName}</td>
                        <td className="px-3 py-2.5 text-xs font-mono font-semibold">{fmtN(clicks, 0)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono font-bold" style={{ color: '#60a5fa' }}>{fmtN(ck, 0)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{fmtN(ckI, 1)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono" style={{ color: ck > 0 && visPerCk <= 10 ? '#22c55e' : ck === 0 ? '#ef4444' : '#f97316' }}>
                          {ck > 0 ? fmtN(visPerCk, 1) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono font-bold" style={{ color: conv > 0 ? '#22c55e' : '#888' }}>{fmtN(conv, 0)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono">{fmt(cost)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono" style={{ color: '#10b981' }}>{fmt(revenue)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono font-bold" style={{ color: profit >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(profit)}</td>
                        <td className="px-3 py-2.5"><StatusBadge s={st} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialViability;
