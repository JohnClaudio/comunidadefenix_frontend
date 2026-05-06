import React from 'react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';

interface CurrencyCardProps {
  currency: 'BRL' | 'USD' | 'EUR';
  value: number;
  type: 'sale' | 'refund';
}

const currencyConfig = {
  BRL: {
    symbol: 'R$',
    name: 'Real',
    flag: '🇧🇷',
    iso: 'br',
    gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  USD: {
    symbol: '$',
    name: 'Dólar',
    flag: '🇺🇸',
    iso: 'us',
    gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  EUR: {
    symbol: '€',
    name: 'Euro',
    flag: '🇪🇺',
    iso: 'eu',
    gradient: 'from-purple-500/20 via-purple-500/10 to-transparent',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
};

export const CurrencyCard: React.FC<CurrencyCardProps> = ({ currency, value, type }) => {
  const config = currencyConfig[currency];
  const isRefund = type === 'refund';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 transition-all duration-300 h-full w-full flex flex-col justify-between min-h-[110px]',
        'hover:scale-[1.02] hover:shadow-lg',
        isRefund ? 'border-red-500/30' : config.border,
        isRefund ? 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent' : `bg-gradient-to-br ${config.gradient}`,
        isRefund ? 'shadow-red-500/10' : config.glow
      )}
    >
      {/* Enhanced Background decoration */}
      <img
        src={`https://flagcdn.com/w320/${config.iso}.png`}
        alt=""
        className={cn(
          "absolute -right-8 top-1/2 -translate-y-1/2 w-40 object-cover select-none pointer-events-none transition-opacity duration-300",
          isRefund ? "opacity-5 grayscale" : "opacity-20 dark:opacity-[0.08] grayscale-0"
        )}
      />
      <div className="absolute top-0 right-0 bottom-0 left-1/2 bg-gradient-to-r from-transparent to-background/80 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{config.flag}</span>
          <div>
            <p className={cn(
              'text-xs font-medium uppercase tracking-wider',
              isRefund ? 'text-red-400' : 'text-muted-foreground'
            )}>
              {isRefund ? 'Reembolso' : 'Vendas'} {currency}
            </p>
            <p className="text-xs text-muted-foreground">{config.name}</p>
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className={cn(
            'text-sm font-medium',
            isRefund ? 'text-red-400' : config.text
          )}>
            {config.symbol}
          </span>
          <AnimatedNumber
            value={value}
            decimals={2}
            className={cn(
              'text-2xl font-bold',
              isRefund ? 'text-red-400' : 'text-foreground'
            )}
          />
        </div>
      </div>
    </div>
  );
};
