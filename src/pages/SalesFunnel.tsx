import React from 'react';
import { GoogleAdsFunnel } from '@/components/googleAds';
import { TrendingDown } from 'lucide-react';

const SalesFunnel: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10">
          <TrendingDown className="h-6 w-6 text-primary" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o funil de conversão das suas campanhas
          </p>
        </div>
      </div>

      <GoogleAdsFunnel />
    </div>
  );
};

export default SalesFunnel;
