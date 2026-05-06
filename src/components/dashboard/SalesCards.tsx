import React from 'react';
import { CurrencyTotal } from '@/types/dashboard';
import { CurrencyCard } from './CurrencyCard';

interface SalesCardsProps {
  purchases: CurrencyTotal[];
  refunds: CurrencyTotal[];
}

export const SalesCards: React.FC<SalesCardsProps> = ({ purchases, refunds }) => {
  // Moedas que queremos mostrar
  const currencies: Array<'BRL' | 'USD' | 'EUR'> = ['BRL', 'USD', 'EUR'];
  
  // Criar mapa de valores
  const purchaseMap = purchases.reduce((acc, p) => {
    acc[p.currency] = p.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const refundMap = refunds.reduce((acc, r) => {
    acc[r.currency] = r.amount;
    return acc;
  }, {} as Record<string, number>);

  // Filtrar moedas que têm vendas (sempre garante BRL e USD)
  const activeCurrencies = currencies.filter(c => {
    if (c === 'BRL' || c === 'USD') return true;
    return (purchaseMap[c] || 0) > 0;
  });
  
  // Filtrar moedas que têm reembolsos (para reembolsos, apenas se houver dados)
  const refundCurrencies = currencies.filter(c => (refundMap[c] || 0) > 0);

  return (
    <>
      {/* Cards de vendas reais */}
      {activeCurrencies.map((currency) => (
        <CurrencyCard
          key={`sale-${currency}`}
          currency={currency}
          value={purchaseMap[currency] || 0}
          type="sale"
        />
      ))}
      
      {/* Cards de reembolsos - só mostra se tiver */}
      {refundCurrencies.map((currency) => (
        <CurrencyCard
          key={`refund-${currency}`}
          currency={currency}
          value={refundMap[currency] || 0}
          type="refund"
        />
      ))}
    </>
  );
};
