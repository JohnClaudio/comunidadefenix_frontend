import React from 'react';
import { format, parseISO, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { SalesDailyByCurrency } from '@/types/dashboard';

interface SalesChartProps {
  salesData: SalesDailyByCurrency[];
  dateFrom?: Date;
  dateTo?: Date;
}

// Cores para plataformas
const platformColors: Record<string, string> = {
  clickbank: '#3b82f6',
  'traffict light': '#10b981',
  hotmart: '#f59e0b',
  monetizze: '#a855f7',
  kiwify: '#ec4899',
  eduzz: '#14b8a6',
  braip: '#f97316',
  default: '#6366f1',
};

// Símbolos de moeda
const currencySymbols: Record<string, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
  AUD: 'A$',
};

const getPlatformColor = (platform: string): string => {
  const normalizedPlatform = platform.toLowerCase();
  return platformColors[normalizedPlatform] || platformColors.default;
};

export const SalesChart: React.FC<SalesChartProps> = ({ salesData, dateFrom, dateTo }) => {
  // Determinar se deve agrupar por mês (mais de 30 dias)
  const shouldGroupByMonth = () => {
    if (!dateFrom || !dateTo) return false;
    const diffTime = Math.abs(dateTo.getTime() - dateFrom.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  };

  const isMonthlyView = shouldGroupByMonth();

  // Gerar períodos (dias ou meses)
  const generatePeriods = () => {
    if (!dateFrom || !dateTo) {
      const dates = salesData.map(s => s.date).sort();
      if (dates.length === 0) return [];
      const start = parseISO(dates[0]);
      const end = parseISO(dates[dates.length - 1]);
      return eachDayOfInterval({ start, end }).map(d => ({ start: d, end: d, isMonth: false }));
    }

    if (isMonthlyView) {
      return eachMonthOfInterval({ start: dateFrom, end: dateTo }).map(monthStart => ({
        start: monthStart,
        end: endOfMonth(monthStart) > dateTo ? dateTo : endOfMonth(monthStart),
        isMonth: true
      }));
    }

    return eachDayOfInterval({ start: dateFrom, end: dateTo }).map(d => ({
      start: d,
      end: d,
      isMonth: false
    }));
  };

  const periods = generatePeriods();
  const totalPeriods = periods.length;

  // Determinar intervalo de ticks
  const getTickInterval = () => {
    if (isMonthlyView) return 0; // Mostrar todos os meses
    if (totalPeriods <= 14) return 0;
    if (totalPeriods <= 30) return 2;
    return Math.floor(totalPeriods / 10);
  };

  // Configuração das barras
  const getBarConfig = () => {
    if (isMonthlyView) {
      return { barSize: 40, gap: "25%" };
    }

    const chartWidth = 900;
    const availableWidth = chartWidth * 0.85;
    const calculatedBarWidth = availableWidth / totalPeriods;
    const minBar = 8;
    const maxBar = 50;
    const barWidth = Math.max(minBar, Math.min(maxBar, calculatedBarWidth * 0.7));

    return {
      barSize: barWidth,
      gap: totalPeriods <= 14 ? "20%" : "15%"
    };
  };

  const barConfig = getBarConfig();

  // Obter todas as plataformas únicas dos dados
  const allPlatforms = [...new Set(salesData.filter(s => s.platform).map(s => s.platform!))];

  // Processar dados: criar entrada para cada período
  const chartData = periods.map((period, index) => {
    const periodKey = isMonthlyView
      ? format(period.start, 'yyyy-MM')
      : format(period.start, 'yyyy-MM-dd');

    // Encontrar vendas para este período
    const salesForPeriod = salesData.filter(sale => {
      const saleDate = parseISO(sale.date);
      if (isMonthlyView) {
        return isWithinInterval(saleDate, { start: period.start, end: period.end });
      }
      return sale.date === periodKey;
    });

    // Para visão mensal: agrupar por plataforma
    if (isMonthlyView) {
      const platformValues: Record<string, number> = {};
      let currency = '';

      salesForPeriod.forEach(sale => {
        const curr = ['BRL', 'USD', 'EUR', 'AUD'].find(
          (c) => sale[c as keyof SalesDailyByCurrency] !== undefined && sale[c as keyof SalesDailyByCurrency] !== null
        );
        if (curr && sale.platform) {
          const val = sale[curr as keyof SalesDailyByCurrency] as number;
          platformValues[sale.platform] = (platformValues[sale.platform] || 0) + val;
          if (!currency) currency = curr;
        }
      });

      return {
        id: `${periodKey}-${index}`,
        date: periodKey,
        dateFormatted: format(period.start, 'MMMM yyyy', { locale: ptBR }),
        dateLabel: format(period.start, 'MMM/yy', { locale: ptBR }),
        currency,
        currencySymbol: currency ? currencySymbols[currency] || currency : '',
        ...platformValues, // Adiciona cada plataforma como propriedade
      };
    }

    // Para visão diária: manter comportamento original (uma barra por dia)
    let totalValue = 0;
    let dominantPlatform = '';
    let currency = '';
    const platformTotals: Record<string, number> = {};

    salesForPeriod.forEach(sale => {
      const curr = ['BRL', 'USD', 'EUR', 'AUD'].find(
        (c) => sale[c as keyof SalesDailyByCurrency] !== undefined && sale[c as keyof SalesDailyByCurrency] !== null
      );
      if (curr) {
        const val = sale[curr as keyof SalesDailyByCurrency] as number;
        totalValue += val;
        if (sale.platform) {
          platformTotals[sale.platform] = (platformTotals[sale.platform] || 0) + val;
        }
        if (!currency) currency = curr;
      }
    });

    if (Object.keys(platformTotals).length > 0) {
      dominantPlatform = Object.entries(platformTotals).sort((a, b) => b[1] - a[1])[0][0];
    }

    return {
      id: `${periodKey}-${index}`,
      date: periodKey,
      dateFormatted: format(period.start, 'dd/MM/yyyy', { locale: ptBR }),
      dateLabel: format(period.start, 'dd/MM', { locale: ptBR }),
      platform: dominantPlatform,
      value: totalValue,
      currency,
      currencySymbol: currency ? currencySymbols[currency] || currency : '',
      color: dominantPlatform ? getPlatformColor(dominantPlatform) : platformColors.default,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      if (isMonthlyView) {
        // Tooltip para visão mensal com múltiplas plataformas
        const platformsWithValue = payload.filter((p: any) => p.value > 0);
        if (platformsWithValue.length === 0) {
          return (
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
              <p className="text-xs text-muted-foreground">{data.dateFormatted}</p>
              <p className="text-sm text-muted-foreground mt-1">Sem vendas</p>
            </div>
          );
        }
        return (
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
            <p className="text-xs text-muted-foreground mb-2">{data.dateFormatted}</p>
            {platformsWithValue.map((p: any) => (
              <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.fill }}
                  />
                  <span className="text-sm text-foreground capitalize">{p.dataKey}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {data.currencySymbol} {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        );
      }

      // Tooltip para visão diária
      if (data.value === 0) {
        return (
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
            <p className="text-xs text-muted-foreground">{data.dateFormatted}</p>
            <p className="text-sm text-muted-foreground mt-1">Sem vendas</p>
          </div>
        );
      }
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs text-muted-foreground mb-1">{data.dateFormatted}</p>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="text-sm font-medium text-foreground capitalize">{data.platform}</span>
          </div>
          <p className="text-lg font-bold text-foreground mt-1">
            {data.currencySymbol} {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasData = isMonthlyView
    ? chartData.some(d => allPlatforms.some(p => (d as any)[p] > 0))
    : chartData.some(d => (d as any).value > 0);

  const uniquePlatforms = isMonthlyView
    ? allPlatforms
    : [...new Set(chartData.filter(d => (d as any).platform).map(d => (d as any).platform))];

  const isMockData = !hasData;

  const renderChartData = isMockData ? periods.map((period, index) => {
    const periodKey = isMonthlyView
      ? format(period.start, 'yyyy-MM')
      : format(period.start, 'yyyy-MM-dd');
    return {
      id: `mock-${periodKey}-${index}`,
      date: periodKey,
      dateFormatted: format(period.start, isMonthlyView ? 'MMMM yyyy' : 'dd/MM/yyyy', { locale: ptBR }),
      dateLabel: format(period.start, isMonthlyView ? 'MMM/yy' : 'dd/MM', { locale: ptBR }),
      platform: 'hotmart',
      value: 0,
      currency: 'BRL',
      currencySymbol: 'R$',
      color: platformColors.hotmart,
      'hotmart': 0,
    };
  }) : chartData;

  const renderUniquePlatforms = isMockData ? ['hotmart'] : uniquePlatforms;
  const renderAllPlatforms = isMockData ? ['hotmart'] : allPlatforms;

  return (
    <div className="sf-card relative">
      <div className="flex items-center gap-3 mb-6 pr-32">
        <div className="p-2 rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Vendas por Plataforma</h3>
          <p className="text-sm text-muted-foreground">
            {isMonthlyView ? 'Valores mensais por plataforma' : 'Valores diários por plataforma e moeda'}
          </p>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={renderChartData}
                margin={{ top: 20, right: 20, left: 10, bottom: 40 }}
                barCategoryGap={isMonthlyView ? "20%" : barConfig.gap}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                  vertical={true}
                />
                <XAxis
                  dataKey="dateLabel"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))', opacity: 0.3 }}
                  dy={10}
                  interval={getTickInterval()}
                  angle={!isMonthlyView && totalPeriods > 20 ? -45 : 0}
                  textAnchor={!isMonthlyView && totalPeriods > 20 ? 'end' : 'middle'}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  width={60}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'hsl(var(--muted)/0.1)', radius: 4 }}
                />

                {isMonthlyView ? (
                  // Barras agrupadas por plataforma no modo mensal
                  renderAllPlatforms.map((platform) => (
                    <Bar
                      key={platform}
                      dataKey={platform}
                      fill={getPlatformColor(platform)}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                  ))
                ) : (
                  // Barra única com cor por plataforma dominante no modo diário
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    barSize={barConfig.barSize}
                  >
                    {renderChartData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={(entry as any).value > 0 ? (entry as any).color : (isMockData ? (entry as any).color : 'transparent')}
                      />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda customizada */}
          {renderUniquePlatforms.length > 0 && (
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border/50">
              {renderUniquePlatforms.map((platform) => (
                <div key={platform} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getPlatformColor(platform) }}
                  />
                  <span className="text-xs text-muted-foreground capitalize">{platform}</span>
                </div>
              ))}
            </div>
          )}
    </div>
  );
};
