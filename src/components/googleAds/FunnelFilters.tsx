import React from 'react';
import { format, subDays, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronDown, Building2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FunnelFiltersData, FunnelViewType } from '@/types/googleAdsFunnel';
import { DatePreset } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { DecryptedText } from '@/components/DecryptedText';

interface FunnelFiltersProps {
  dateFrom: Date;
  dateTo: Date;
  onDateChange: (from: Date, to: Date) => void;
  viewType: FunnelViewType;
  onViewTypeChange: (type: FunnelViewType) => void;
  filters?: FunnelFiltersData;
  selectedAccountId: number | null;
  onAccountChange: (id: number | null) => void;
  selectedTrackerId: number | null;
  onTrackerChange: (id: number | null) => void;
  isLoading?: boolean;
}

const presets: { label: string; value: DatePreset }[] = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: '7 dias', value: '7d' },
  { label: '15 dias', value: '15d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
  { label: 'Este ano', value: 'year' },
  { label: 'Personalizado', value: 'custom' },
];

export const FunnelFilters: React.FC<FunnelFiltersProps> = ({
  dateFrom,
  dateTo,
  onDateChange,
  viewType,
  onViewTypeChange,
  filters,
  selectedAccountId,
  onAccountChange,
  selectedTrackerId,
  onTrackerChange,
  isLoading,
}) => {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<DatePreset>('7d');

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    const today = new Date();
    switch (preset) {
      case 'today':
        onDateChange(today, today);
        break;
      case 'yesterday': {
        const yesterday = subDays(today, 1);
        onDateChange(yesterday, yesterday);
        break;
      }
      case '7d':
        onDateChange(subDays(today, 7), today);
        break;
      case '15d':
        onDateChange(subDays(today, 15), today);
        break;
      case '30d':
        onDateChange(subDays(today, 30), today);
        break;
      case '90d':
        onDateChange(subDays(today, 90), today);
        break;
      case 'year':
        onDateChange(startOfYear(today), today);
        break;
      case 'custom':
        setCalendarOpen(true);
        break;
    }
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setActivePreset('custom');
      onDateChange(range.from, range.to);
      setCalendarOpen(false);
    } else if (range?.from) {
      onDateChange(range.from, dateTo);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset buttons + View Type */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.value}
              variant={activePreset === preset.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset.value)}
              disabled={isLoading}
              className={cn(
                'transition-all',
                activePreset === preset.value && 'bg-primary text-primary-foreground'
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Type Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => onViewTypeChange('sf_funnels')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                viewType === 'sf_funnels'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Funil SF
            </button>
            <button
              onClick={() => onViewTypeChange('google_ads')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                viewType === 'google_ads'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Google Ads
            </button>
          </div>

          {/* Date Range Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[200px] justify-start text-left font-normal"
                disabled={isLoading}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {format(dateFrom, 'dd MMM', { locale: ptBR })} -{' '}
                {format(dateTo, 'dd MMM yyyy', { locale: ptBR })}
                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                defaultMonth={dateFrom}
                selected={{ from: dateFrom, to: dateTo }}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Account Filter */}
          <Select
            value={selectedAccountId?.toString() || 'all'}
            onValueChange={(value) => onAccountChange(value === 'all' ? null : Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[180px]">
              <Building2 className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {filters?.accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  <DecryptedText value={account.name} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tracker Filter */}
          {viewType === 'sf_funnels' && (
            <Select
              value={selectedTrackerId?.toString() || 'all'}
              onValueChange={(value) => onTrackerChange(value === 'all' ? null : Number(value))}
              disabled={isLoading || !filters?.trackers?.length}
            >
              <SelectTrigger className="w-[180px]">
                <Tag className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tracker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os trackers</SelectItem>
                {filters?.trackers?.map((tracker) => (
                  <SelectItem key={tracker.id} value={tracker.id.toString()}>
                    <DecryptedText value={tracker.name} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
};
