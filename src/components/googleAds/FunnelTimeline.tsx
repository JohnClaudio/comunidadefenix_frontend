import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { SFTimelineDay, GoogleAdsTimelineDay } from '@/types/googleAdsFunnel';

interface FunnelTimelineProps {
  viewType: 'sf_funnels' | 'google_ads';
  data: SFTimelineDay[] | GoogleAdsTimelineDay[];
}

export const FunnelTimeline: React.FC<FunnelTimelineProps> = ({ viewType, data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Transform data for chart
  const chartData = data.map((item) => {
    const baseData = {
      date: format(parseISO(item.day), 'dd/MM', { locale: ptBR }),
      fullDate: format(parseISO(item.day), 'dd MMM yyyy', { locale: ptBR }),
      cost: item.cost,
      impressions: item.impressions,
      clicks: item.clicks,
    };

    if (viewType === 'sf_funnels') {
      const sfItem = item as SFTimelineDay;
      return {
        ...baseData,
        result: sfItem.purchases,
        resultLabel: 'Vendas',
      };
    } else {
      const adsItem = item as GoogleAdsTimelineDay;
      return {
        ...baseData,
        result: adsItem.conversions,
        resultLabel: 'Conversões',
        conversionValue: adsItem.conversion_value,
      };
    }
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload;

    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-xl">
        <p className="text-sm font-medium text-foreground mb-3">{data?.fullDate}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Custo</span>
            <span className="text-sm font-semibold text-red-400">{formatCurrency(data?.cost || 0)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Impressões</span>
            <span className="text-sm font-semibold text-foreground">{data?.impressions?.toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Cliques</span>
            <span className="text-sm font-semibold text-foreground">{data?.clicks?.toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">{data?.resultLabel}</span>
            <span className="text-sm font-semibold text-primary">{data?.result}</span>
          </div>
          {data?.conversionValue !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Valor Conv.</span>
              <span className="text-sm font-semibold text-emerald-400">{formatCurrency(data?.conversionValue || 0)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="sf-card p-6 flex flex-col h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Linha do Tempo</h3>
      
      <div className="flex items-center gap-6 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-muted-foreground">Valor Gasto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">{viewType === 'sf_funnels' ? 'Vendas' : 'Conversões'}</span>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resultGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false}
            />
            
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              dy={10}
            />
            
            <YAxis 
              yAxisId="cost"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(value) => `R$${value}`}
              width={60}
            />
            
            <YAxis 
              yAxisId="result"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              width={40}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              yAxisId="cost"
              type="monotone"
              dataKey="cost"
              stroke="#a855f7"
              strokeWidth={2}
              fill="url(#costGradient)"
              dot={{ fill: '#a855f7', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
            />
            
            <Area
              yAxisId="result"
              type="monotone"
              dataKey="result"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#resultGradient)"
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
