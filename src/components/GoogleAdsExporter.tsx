import React, { useRef, useState, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, Loader2, X, ImageDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useEncryption } from '@/contexts/EncryptionContext';
import { decryptEnvelope, isEncryptedValue } from '@/services/crypto';
import logoSf from '@/assets/logo-sf.png';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExportRow {
  date: string;
  impressions?: number;
  clicks?: number;
  checkouts?: number;
  clicks_per_checkout?: number;
  top_share?: number;
  abs_top_share?: number;
  impression_share?: number;
  cpc?: number;
  budget?: number;
  target_cpa?: number;
  cost?: number;
  conversion_value?: number;
  conversions?: number;
  checkouts_per_conversion?: number;
  roi_percent?: number;
  profit?: number;
  notes?: string;
  [key: string]: any;
}

interface ExportStats {
  clicks?: number;
  impressions?: number;
  checkouts?: number;
  conversions?: number;
  conversion_value?: number;
  cost?: number;
  profit?: number;
  [key: string]: any;
}

interface GoogleAdsExporterProps {
  campaignName: string;
  trackerName?: string;
  dateFrom: Date;
  dateTo: Date;
  stats: ExportStats;
  rows: ExportRow[];
  onClose: () => void;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtCurrency = (v: any) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const fmtNum = (v: any, decimals = 2) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: decimals }).format(Number(v) || 0);

const fmtPct = (v: any) => `${(Number(v) || 0).toFixed(2)}%`;

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yy'); }
  catch { return d; }
};

// ─── Column definitions — ROI e Cliques/CK removidos conforme solicitado ──────
const EXPORT_COLS: { id: string; label: string; render: (row: ExportRow) => string }[] = [
  { id: 'date',                    label: 'Data',          render: r => fmtDate(r.date) },
  { id: 'impressions',             label: 'Impressões',    render: r => fmtNum(r.impressions, 0) },
  { id: 'clicks',                  label: 'Cliques',       render: r => fmtNum(r.clicks, 0) },
  { id: 'checkouts',               label: 'Checkouts',     render: r => fmtNum(r.checkout_conversions ?? r.checkouts, 0) },
  { id: 'top_share',               label: 'Parc.Superior', render: r => fmtPct(r.top_share) },
  { id: 'abs_top_share',           label: 'Parc.1(Topo)',  render: r => fmtPct(r.abs_top_share) },
  { id: 'impression_share',        label: 'Parc.Impr.',    render: r => fmtPct(r.impression_share) },
  { id: 'cpc',                     label: 'CPC Médio',     render: r => fmtCurrency(r.cpc) },
  { id: 'budget',                  label: 'Orçamento',     render: r => fmtCurrency(r.budget) },
  { id: 'target_cpa',              label: 'CPA Desejado',  render: r => fmtCurrency(r.target_cpa) },
  { id: 'cost',                    label: 'Custo',         render: r => fmtCurrency(r.cost) },
  { id: 'conversion_value',        label: 'Faturamento',   render: r => fmtCurrency(r.conversion_value) },
  { id: 'conversions',             label: 'Conversões',    render: r => fmtNum(r.conversions, 2) },
  { id: 'checkouts_per_conversion',label: 'CK/Conv.',      render: r => fmtNum(Number(r.conversions) > 0 ? Number(r.checkout_conversions ?? r.checkouts ?? 0) / Number(r.conversions) : 0) },
  { id: 'profit',                  label: 'Lucro',         render: r => fmtCurrency(r.profit) },
  { id: 'notes',                   label: 'Observações',   render: r => r.notes || '' },
];

// ─── Export Canvas ─────────────────────────────────────────────────────────────
interface ExportCanvasProps extends Omit<GoogleAdsExporterProps, 'onClose'> {
  reportTitle: string;   // custom editable title
  displayName: string;   // decrypted campaign name (used as subtitle)
}

const ExportCanvas = React.forwardRef<HTMLDivElement, ExportCanvasProps>(
  ({ reportTitle, displayName, trackerName, dateFrom, dateTo, stats, rows }, ref) => {
    const roi = Number(stats.cost) > 0
      ? ((Number(stats.conversion_value) - Number(stats.cost)) / Number(stats.cost)) * 100 : 0;
    const ckPerConv = Number(stats.conversions) > 0 && Number(stats.checkouts) > 0
      ? Number(stats.checkouts) / Number(stats.conversions) : 0;
    const cliPerSale = Number(stats.conversions) > 0
      ? Number(stats.clicks) / Number(stats.conversions) : 0;
    const costPerConv = Number(stats.conversions) > 0
      ? Number(stats.cost) / Number(stats.conversions) : 0;
    const cliPerCK = Number(stats.checkouts) > 0
      ? Number(stats.clicks) / Number(stats.checkouts) : 0;

    const sortedRows = [...rows].sort((a, b) =>
      new Date(a.date + 'T12:00:00').getTime() - new Date(b.date + 'T12:00:00').getTime()
    );

    const kpis = [
      { label: 'TOTAL CLIQUES',   value: fmtNum(stats.clicks, 0),              accent: '#3b82f6' },
      { label: 'CHECKOUTS',       value: fmtNum(stats.checkouts, 0),            accent: '#a855f7' },
      { label: 'CONVERSÕES',      value: fmtNum(stats.conversions, 2),          accent: '#22c55e' },
      { label: 'CLIQUES / CK',    value: fmtNum(cliPerCK),                      accent: '#f97316' },
      { label: 'CK / CONVERSÃO',  value: fmtNum(ckPerConv),                     accent: '#eab308' },
      { label: 'CLI / VENDA',     value: fmtNum(cliPerSale),                    accent: '#06b6d4' },
      { label: 'CUSTO / CONV.',   value: fmtCurrency(costPerConv),              accent: '#ec4899' },
      { label: 'INVESTIMENTO',    value: fmtCurrency(stats.cost),               accent: '#f43f5e' },
      { label: 'FATURAMENTO',     value: fmtCurrency(stats.conversion_value),   accent: '#10b981' },
      { label: 'LUCRO',           value: fmtCurrency(stats.profit),             accent: Number(stats.profit) >= 0 ? '#10b981' : '#ef4444' },
      { label: '% ROI',           value: fmtPct(roi),                           accent: roi >= 0 ? '#10b981' : '#ef4444' },
      { label: 'IMPRESSÕES',      value: fmtNum(stats.impressions, 0),          accent: '#6366f1' },
    ];

    return (
      <div
        ref={ref}
        style={{
          width: 1600,
          background: '#0a0a0a',
          fontFamily: 'Arial, Helvetica, sans-serif',
          padding: 32,
          color: '#ffffff',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #ff8c00',
        }}>
          {/* Logo + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Real logo — html2canvas will render it since it's same-origin */}
            <img
              src={logoSf}
              alt="Sonhos Funcionando"
              crossOrigin="anonymous"
              style={{ height: 56, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
            />
            <div>
              {/* Custom report title (editable by user) */}
              <div style={{ fontSize: 22, fontWeight: 900, color: '#ff8c00', letterSpacing: 2, textTransform: 'uppercase' }}>
                {reportTitle || 'Relatório de Performance'}
              </div>
            </div>
          </div>

          {/* Date range */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Período</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
              {format(dateFrom, 'dd/MM/yyyy')} → {format(dateTo, 'dd/MM/yyyy')}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
              Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
          </div>
        </div>

        {/* ── KPI Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
          {kpis.map((kpi, i) => (
            <div key={i} style={{
              background: '#141414', border: `1px solid ${kpi.accent}33`,
              borderLeft: `3px solid ${kpi.accent}`, borderRadius: 8, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: kpi.accent }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Data Table ── */}
        <div style={{ background: '#111', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#1a1a1a', borderBottom: '2px solid #ff8c00' }}>
                {EXPORT_COLS.map(col => (
                  <th key={col.id} style={{
                    padding: '8px 8px',
                    textAlign: col.id === 'date' || col.id === 'notes' ? 'left' : 'right',
                    fontSize: 8, fontWeight: 800,
                    color: col.id === 'profit' ? '#ff8c00' : col.id === 'checkouts' ? '#60a5fa' : '#777',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    borderRight: '1px solid #222', whiteSpace: 'nowrap', overflow: 'hidden',
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => {
                const hasConversion = Number(row.conversions) > 0;
                const hasCheckout   = Number(row.checkout_conversions ?? row.checkouts) > 0;
                const hasNote       = !!(row.notes && row.notes.trim().length > 0);

                // Priority: green > blue > amber > default
                let rowBg         = i % 2 === 0 ? '#111' : '#131313';
                let rowBorderLeft = 'none';
                if (hasConversion) {
                  rowBg         = '#0c1e13';
                  rowBorderLeft = '3px solid #10b981';
                } else if (hasCheckout) {
                  rowBg         = '#0c1320';
                  rowBorderLeft = '3px solid #3b82f6';
                } else if (hasNote) {
                  rowBg         = '#1c190c';
                  rowBorderLeft = '3px solid #f59e0b';
                }

                return (
                  <tr key={row.date} style={{ background: rowBg, borderBottom: '1px solid #1b1b1b', borderLeft: rowBorderLeft }}>
                    {EXPORT_COLS.map((col, ci) => {
                      const isProfit    = col.id === 'profit';
                      const isCheckouts = col.id === 'checkouts';
                      const isNotes     = col.id === 'notes';
                      const val = col.render(row);

                      let cellColor = ci === 0 ? '#d1d5db' : '#9ca3af';
                      if (isProfit)    cellColor = Number(row.profit) >= 0 ? '#10b981' : '#ef4444';
                      if (isCheckouts) cellColor = '#60a5fa'; // always blue accent

                      const cellBg = isCheckouts && hasCheckout ? 'rgba(59,130,246,0.09)' : 'transparent';

                      return (
                        <td key={col.id} style={{
                          padding: '6px 8px', fontSize: 10,
                          fontWeight: ci === 0 ? 700 : isCheckouts ? 700 : 400,
                          color: cellColor,
                          textAlign: isNotes || ci === 0 ? 'left' : 'right',
                          borderRight: '1px solid #1c1c1c',
                          background: cellBg,
                          whiteSpace: isNotes ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: isNotes ? 'clip' : 'ellipsis',
                          maxWidth: isNotes ? 160 : undefined,
                          wordBreak: isNotes ? 'break-word' : undefined,
                        }}>
                          {val || '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Totals row */}
              <tr style={{ background: '#1a1a1a', borderTop: '2px solid #ff8c00' }}>
                {EXPORT_COLS.map((col, ci) => {
                  let val = '';
                  if (ci === 0)                           val = 'TOTAIS';
                  else if (col.id === 'impressions')      val = fmtNum(stats.impressions, 0);
                  else if (col.id === 'clicks')           val = fmtNum(stats.clicks, 0);
                  else if (col.id === 'checkouts')        val = fmtNum(stats.checkouts, 0);
                  else if (col.id === 'conversions')      val = fmtNum(stats.conversions, 2);
                  else if (col.id === 'cost')             val = fmtCurrency(stats.cost);
                  else if (col.id === 'conversion_value') val = fmtCurrency(stats.conversion_value);
                  else if (col.id === 'profit')           val = fmtCurrency(stats.profit);
                  return (
                    <td key={col.id} style={{
                      padding: '8px 8px', fontSize: 10, fontWeight: 900,
                      color: col.id === 'profit'
                        ? (Number(stats.profit) >= 0 ? '#10b981' : '#ef4444')
                        : col.id === 'checkouts' ? '#60a5fa'
                        : ci === 0 ? '#ff8c00' : '#e5e7eb',
                      textAlign: col.id === 'date' || col.id === 'notes' ? 'left' : 'right',
                      borderRight: '1px solid #222',
                      background: col.id === 'checkouts' ? 'rgba(59,130,246,0.09)' : 'transparent',
                    }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        {/* Footer removido conforme solicitado */}
      </div>
    );
  }
);
ExportCanvas.displayName = 'ExportCanvas';

// ─── Main Exporter Modal ──────────────────────────────────────────────────────
export const GoogleAdsExporter: React.FC<GoogleAdsExporterProps> = ({
  campaignName, trackerName, dateFrom, dateTo, stats, rows, onClose,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ── Custom report title (editable by user) ────────────────────────────────
  const [reportTitle, setReportTitle] = useState('Relatório de Performance');

  // ── Decrypt campaign name ─────────────────────────────────────────────────
  const { isUnlocked, privateKey } = useEncryption();
  const [displayName, setDisplayName] = useState<string>(() => {
    if (!campaignName) return 'Campanha';
    if (!isEncryptedValue(campaignName)) return campaignName;
    return '(Campanha)';
  });

  useEffect(() => {
    if (!campaignName)                    { setDisplayName('Campanha'); return; }
    if (!isEncryptedValue(campaignName))  { setDisplayName(campaignName); return; }
    if (!isUnlocked || !privateKey)       { setDisplayName('(Campanha Criptografada)'); return; }
    decryptEnvelope(campaignName, privateKey)
      .then(plain => setDisplayName(plain))
      .catch(() => setDisplayName('(Erro)'));
  }, [campaignName, isUnlocked, privateKey]);

  // ── html2canvas capture ───────────────────────────────────────────────────
  const generateImage = useCallback(async () => {
    const el = canvasRef.current;
    if (!el) return;
    setIsGenerating(true);
    setPreviewUrl(null);
    try {
      el.style.opacity = '1';
      el.style.pointerEvents = 'none';

      const canvas = await html2canvas(el, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      el.style.opacity = '0';
      el.style.pointerEvents = 'none';

      setPreviewUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('[GoogleAdsExporter] html2canvas error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const downloadImage = useCallback(() => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    const safeName = reportTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_').substring(0, 40);
    link.download = `relatorio_${safeName}_${format(new Date(), 'yyyyMMdd_HHmm')}.png`;
    link.href = previewUrl;
    link.click();
  }, [previewUrl, reportTitle]);

  const inputStyle: React.CSSProperties = {
    background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '10px 14px', color: '#ffffff', fontSize: 14, fontWeight: 600,
    width: '100%', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>

      {/* ── Dialog ── */}
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 32, width: '90vw', maxWidth: 820, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 40px 80px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#ffffff' }}>Exportar Relatório</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>Gera uma imagem PNG de alta qualidade com todos os dados</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Report title input ── */}
        <div>
          <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Pencil size={11} /> Nome do Relatório (aparece na imagem)
          </div>
          <input
            type="text"
            value={reportTitle}
            onChange={e => { setReportTitle(e.target.value); setPreviewUrl(null); }}
            placeholder="Ex: PROD, Relatório Mensal, Campanha X..."
            style={inputStyle}
            maxLength={60}
          />
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Período',         value: `${format(dateFrom, 'dd/MM/yy')} → ${format(dateTo, 'dd/MM/yy')}` },
            { label: 'Linhas de dados', value: `${rows.length} dias` },
          ].map((item, i) => (
            <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '12px 16px', border: '1px solid #2a2a2a' }}>
              <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Preview */}
        {previewUrl ? (
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pré-visualização</div>
            <img src={previewUrl} alt="Preview" style={{ width: '100%', borderRadius: 8, border: '1px solid #222', maxHeight: 360, objectFit: 'cover', objectPosition: 'top' }} />
          </div>
        ) : (
          <div style={{ background: '#0d0d0d', borderRadius: 8, border: '1px dashed #2a2a2a', padding: '40px 20px', textAlign: 'center', color: '#444' }}>
            <ImageDown size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 13 }}>Clique em "Gerar Imagem" para criar a pré-visualização</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>Cancelar</Button>
          <Button onClick={generateImage} disabled={isGenerating} variant="outline" className="gap-2">
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <ImageDown size={14} />}
            {isGenerating ? 'Gerando...' : previewUrl ? 'Regerar' : 'Gerar Imagem'}
          </Button>
          {previewUrl && (
            <Button onClick={downloadImage} className="gap-2 bg-[#ff8c00] hover:bg-[#e07b00] text-black font-bold">
              <Download size={14} /> Baixar PNG
            </Button>
          )}
        </div>
      </div>

      {/* ── Off-screen canvas — opacity:0 so html2canvas can capture it ── */}
      <div style={{
        position: 'absolute', top: '-10000px', left: 0,
        opacity: 0, pointerEvents: 'none', zIndex: -1,
      }}>
        <ExportCanvas
          ref={canvasRef}
          reportTitle={reportTitle}
          displayName={displayName}
          campaignName={campaignName}
          trackerName={trackerName}
          dateFrom={dateFrom}
          dateTo={dateTo}
          stats={stats}
          rows={rows}
        />
      </div>
    </div>
  );
};
