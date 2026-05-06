import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, RefreshCw } from 'lucide-react';
import { ExchangeRate } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface ExchangeRateCardProps {
  rates: Record<string, ExchangeRate>;
}

export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({ rates }) => {
  const rateEntries = Object.entries(rates);
  if (rateEntries.length === 0) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-emerald-400';
      case 'down': return 'text-red-400';
      default: return 'text-primary';
    }
  };

  const getBadgeStyles = (trend: string) => {
    switch (trend) {
      case 'up': return 'bg-emerald-500/10 text-emerald-400';
      case 'down': return 'bg-red-500/10 text-red-400';
      default: return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="sf-card h-full">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Cotação</h3>
      </div>

      <div className="space-y-4">
        {rateEntries.map(([pair, rate]) => {
          const [from, to] = pair.split('/');
          const hasChange = rate.trend !== 'neutral';
          
          return (
            <div key={pair} className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{from}/{to}</span>
                <div className={cn('p-2 rounded-lg', getBadgeStyles(rate.trend))}>
                  {getTrendIcon(rate.trend)}
                </div>
              </div>
              
              <p className={cn('text-3xl font-bold mb-2', getTrendColor(rate.trend))}>
                R$ {rate.exchange_rate}
              </p>
              
              <p className="text-sm text-muted-foreground mb-3">
                {hasChange 
                  ? `${rate.trend === 'up' ? 'Alta' : 'Queda'} de ${rate.percentage}%` 
                  : 'Sem variação'}
              </p>

              <div className="flex items-center justify-between">
                <span className={cn('px-2 py-1 rounded text-xs font-medium', getBadgeStyles(rate.trend))}>
                  {rate.percentage}%
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  {rate.last_updated}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
