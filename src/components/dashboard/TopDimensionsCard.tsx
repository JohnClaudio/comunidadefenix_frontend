import React from 'react';
import { Smartphone, Monitor, Laptop, Tablet, LucideIcon } from 'lucide-react';
import { TopDimensionSale } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface TopDimensionsCardProps {
  title: string;
  icon: LucideIcon;
  dimensions: TopDimensionSale[];
  type: 'device' | 'os';
}

const deviceIcons: Record<string, LucideIcon> = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
  laptop: Laptop,
};

const barColors = ['bg-primary', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];

const TopDimensionsCard: React.FC<TopDimensionsCardProps> = ({ title, icon: Icon, dimensions, type }) => {
  const getDeviceIcon = (name: string) => deviceIcons[name.toLowerCase()] || Monitor;

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="sf-card h-full">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>

      {dimensions.length > 0 ? (
        <div className="space-y-4">
          {dimensions.map((dim, index) => {
            const DeviceIcon = type === 'device' ? getDeviceIcon(dim.name) : null;
            return (
              <div key={dim.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {DeviceIcon && <DeviceIcon className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-medium text-foreground capitalize">{dim.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {dim.share_pct.toFixed(1)}% ({formatAmount(dim.amount)})
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn('h-full rounded-full transition-all duration-500', barColors[index % barColors.length])}
                    style={{ width: `${dim.share_pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icon className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sem dados no período</p>
        </div>
      )}
    </div>
  );
};

export { TopDimensionsCard };
