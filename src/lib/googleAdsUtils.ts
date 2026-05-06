import { SegmentRow } from '@/types/googleAdsSegments';

export function aggregateSegmentRows<T extends { 
    impressions: number; 
    clicks: number; 
    cost: number; 
    conversions: number; 
    conversion_value: number;
    extra_metrics?: any;
    ctr_percent?: number;
    cpm?: number;
    avg_cpc?: number;
}>(rows: T[], keyGetter: (row: T) => string): T[] {
  const map = new Map<string, T>();

  rows.forEach((row) => {
    const key = keyGetter(row);
    if (!map.has(key)) {
      map.set(key, { ...row });
    } else {
      const existing = map.get(key)!;
      existing.impressions = Number(existing.impressions || 0) + Number(row.impressions || 0);
      existing.clicks = Number(existing.clicks || 0) + Number(row.clicks || 0);
      existing.cost = Number(existing.cost || 0) + Number(row.cost || 0);
      existing.conversions = Number(existing.conversions || 0) + Number(row.conversions || 0);
      existing.conversion_value = Number(existing.conversion_value || 0) + Number(row.conversion_value || 0);
      
      // Recalculate averages/rates based on new totals
      if (existing.impressions > 0) {
        existing.ctr_percent = (existing.clicks / existing.impressions) * 100;
        existing.cpm = (existing.cost / existing.impressions) * 1000;
      }
      if (existing.clicks > 0) {
        existing.avg_cpc = existing.cost / existing.clicks;
      }
      if (existing.cost > 0) {
        (existing as any).roas = existing.conversion_value / existing.cost;
      }
      
      // Handle extra_metrics if present
      if (row.extra_metrics && existing.extra_metrics) {
        Object.keys(row.extra_metrics).forEach(k => {
            if (typeof row.extra_metrics[k] === 'number') {
                existing.extra_metrics[k] = (existing.extra_metrics[k] || 0) + row.extra_metrics[k];
            }
        });
      }
    }
  });

  return Array.from(map.values());
}
