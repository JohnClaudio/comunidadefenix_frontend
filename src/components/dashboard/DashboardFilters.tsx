import React, { useState } from 'react';
import { Calendar, ChevronDown, Filter } from 'lucide-react';
import { format, subDays, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { cn } from '@/lib/utils';
import { Tracker } from '@/types/tracker';
import { DatePreset } from '@/types/dashboard';

interface DashboardFiltersProps {
  trackers: Tracker[];
  selectedTrackerId: number | null;
  onTrackerChange: (trackerId: number | null) => void;
  dateFrom: Date;
  dateTo: Date;
  onDateChange: (from: Date, to: Date) => void;
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

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  trackers,
  selectedTrackerId,
  onTrackerChange,
  dateFrom,
  dateTo,
  onDateChange,
  isLoading,
}) => {
  const [activePreset, setActivePreset] = useState<DatePreset>('7d');
  const [calendarOpen, setCalendarOpen] = useState(false);

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
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
      {/* Preset buttons */}
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

      <div className="flex flex-wrap gap-3 items-center">
        {/* Date Range Picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[240px] justify-start text-left font-normal"
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

        {/* Tracker Selector */}
        <Select
          value={selectedTrackerId?.toString() || 'all'}
          onValueChange={(value) => onTrackerChange(value === 'all' ? null : Number(value))}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Todos os trackers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os trackers</SelectItem>
            {trackers.map((tracker) => (
              <SelectItem key={tracker.id} value={tracker.id.toString()}>
                {tracker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
