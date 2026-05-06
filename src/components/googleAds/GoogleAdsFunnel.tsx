import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFunnelData, fetchFunnelFilters } from '@/services/googleAdsApi';
import { FunnelViewType, SFFunnelsData, GoogleAdsViewData } from '@/types/googleAdsFunnel';
import { FunnelVisualization } from './FunnelVisualization';
import { FunnelMetricCards, FunnelSecondaryMetrics } from './FunnelMetricCards';
import { FunnelTimeline } from './FunnelTimeline';
import { FunnelFilters } from './FunnelFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, GripHorizontal } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

// --- Sortable Wrapper ---
const SortableBlock: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group transition-all duration-300 h-full",
        isDragging && "opacity-90 scale-[1.02] shadow-2xl z-50 ring-2 ring-primary rounded-xl cursor-grabbing"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-4 right-4 p-2 rounded-lg transition-all z-20 shadow-sm",
          "bg-secondary/80 text-muted-foreground/50 border border-border/50",
          "hover:text-foreground hover:bg-secondary hover:shadow-md",
          "opacity-0 group-hover:opacity-100",
          isDragging ? "opacity-100 cursor-grabbing bg-primary text-primary-foreground" : "cursor-grab"
        )}
        title="Arraste para mover este bloco"
      >
        <GripHorizontal className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
};

export const GoogleAdsFunnel: React.FC = () => {
  const { token } = useAuth();

  // State
  const [viewType, setViewType] = useState<FunnelViewType>('sf_funnels');
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedTrackerId, setSelectedTrackerId] = useState<number | null>(null);

  // Fetch filters
  const { data: filtersData } = useQuery({
    queryKey: ['funnelFilters', viewType],
    queryFn: () => fetchFunnelFilters(token!, viewType),
    enabled: !!token,
  });

  // Fetch funnel data
  const { data: funnelResponse, isLoading, isError } = useQuery({
    queryKey: [
      'funnelData',
      viewType,
      format(dateFrom, 'yyyy-MM-dd'),
      format(dateTo, 'yyyy-MM-dd'),
      selectedAccountId,
      selectedTrackerId,
    ],
    queryFn: () => fetchFunnelData(token!, {
      view_type: viewType,
      from: format(dateFrom, 'yyyy-MM-dd') + ' 00:00:00',
      to: format(dateTo, 'yyyy-MM-dd') + ' 23:59:59',
      google_ads_account_id: selectedAccountId || undefined,
      tracker_id: selectedTrackerId || undefined,
    }),
    enabled: !!token,
  });

  const handleDateChange = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const funnelData = funnelResponse?.data;

  // --- Dnd-kit logic for Main Visualizations ---
  const storageKey = `funnel-main-blocks-${viewType}`;
  const defaultLayout = ['visualization', 'timeline'];
  const [layoutOrder, setLayoutOrder] = useState<string[]>(defaultLayout);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2 && parsed.includes('visualization') && parsed.includes('timeline')) {
          setLayoutOrder(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse main blocks layout", e);
      }
    }
    setLayoutOrder(defaultLayout);
  }, [viewType]);

  const sensors = useSensors(
    // Require a larger distance (10px) to start dragging the main blocks
    // This prevents accidental drags when trying to interact with chart tooltips
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayoutOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(storageKey, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const renderBlock = (id: string) => {
    if (!funnelData) return null;

    if (id === 'visualization') {
      return (
        <SortableBlock id="visualization" key="visualization">
          <FunnelVisualization
            viewType={viewType}
            funnel={funnelData.funnel}
            rates={viewType === 'sf_funnels'
              ? (funnelData as SFFunnelsData).funnel_rates
              : (funnelData as GoogleAdsViewData).funnel_rates}
            investment={funnelData.cards.investment}
          />
        </SortableBlock>
      );
    }

    if (id === 'timeline') {
      return (
        <SortableBlock id="timeline" key="timeline">
          <FunnelTimeline
            viewType={viewType}
            data={funnelData.charts.timeline_daily}
          />
        </SortableBlock>
      );
    }
  };

  if (isError) {
    return (
      <div className="sf-card p-8 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar dados</h3>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os dados do funil. Tente novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <FunnelFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={handleDateChange}
        viewType={viewType}
        onViewTypeChange={setViewType}
        filters={filtersData?.data}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        selectedTrackerId={selectedTrackerId}
        onTrackerChange={setSelectedTrackerId}
        isLoading={isLoading}
      />

      {isLoading ? (
        <FunnelSkeleton />
      ) : funnelData && isClient ? (
        <>
          {/* Main Metric Cards (Draggable inside) */}
          <FunnelMetricCards viewType={viewType} cards={funnelData.cards} />

          {/* Secondary Metrics (Draggable inside) */}
          <FunnelSecondaryMetrics viewType={viewType} cards={funnelData.cards} />

          {/* Main Content: Funnel + Timeline (Draggable Blocks) */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={layoutOrder} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                {layoutOrder.map(renderBlock)}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : null}
    </div>
  );
};

// ... Skeleton stays exactly the same as original ...
const FunnelSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="sf-card p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="sf-card px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="sf-card p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-center">
              <Skeleton className="h-14 rounded-lg" style={{ width: `${100 - i * 15}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="sf-card p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  </div>
);
