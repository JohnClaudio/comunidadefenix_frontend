import React, { useState, useEffect } from 'react';
import { DollarSign, Target, TrendingUp, RotateCcw, Percent, Clock, ArrowUpRight, ArrowDownRight, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SFFunnelCards, GoogleAdsCards } from '@/types/googleAdsFunnel';
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

interface FunnelMetricCardsProps {
  viewType: 'sf_funnels' | 'google_ads';
  cards: SFFunnelCards | GoogleAdsCards;
}

interface MetricCardData {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
  iconGradient: string;
}

interface SecondaryMetricCardData {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  value: string;
  variant?: 'default' | 'success' | 'danger' | 'neutral';
}

// --- MAIN CARDS DRAGGABLE COMPONENT ---
const SortableMetricCard: React.FC<{ card: MetricCardData }> = ({ card }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

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
        "sf-card relative overflow-hidden group p-5 transition-all duration-300 isolate",
        isDragging
          ? "opacity-90 scale-105 shadow-2xl border-primary cursor-grabbing"
          : "hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.2)] border-border/60 hover:border-primary/40 hover:-translate-y-1 animate-fade-in"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-md transition-all z-20",
          "text-muted-foreground/40 hover:text-foreground hover:bg-secondary/80",
          isDragging ? "opacity-100 cursor-grabbing" : "opacity-0 group-hover:opacity-100 cursor-grab"
        )}
        title="Arraste para mover"
      >
        <GripHorizontal className="w-4 h-4" />
      </div>

      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
        card.gradient
      )} />

      {/* Top decorative line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r pointer-events-none",
        card.iconGradient,
        "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      )} />

      <div className="relative z-10 flex items-start justify-between pointer-events-none">
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 truncate">
            {card.title}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mb-3">
            {card.subtitle}
          </p>
          <p className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            {card.value}
          </p>
        </div>

        {/* Icon */}
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
            card.iconGradient,
            "transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          )}
          style={{ boxShadow: `0 4px 12px -2px hsl(var(--primary) / 0.25)` }}
        >
          <card.icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
};

export const FunnelMetricCards: React.FC<FunnelMetricCardsProps> = ({ viewType, cards }) => {
  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  };

  const buildCards = (): MetricCardData[] => {
    if (viewType === 'sf_funnels') {
      const sfCards = cards as SFFunnelCards;
      return [
        { id: 'sf-main-investment', title: 'Investimento', subtitle: 'Valor Gasto', value: formatCurrency(sfCards.investment.value, sfCards.investment.currency), icon: DollarSign, gradient: 'from-red-500/10 via-red-500/5 to-transparent', iconGradient: 'from-red-500 to-red-600' },
        { id: 'sf-main-result', title: 'Resultado', subtitle: sfCards.result.label === 'purchases' ? 'Vendas' : sfCards.result.label, value: sfCards.result.value.toString(), icon: Target, gradient: 'from-primary/10 via-primary/5 to-transparent', iconGradient: 'from-primary to-primary/80' },
        { id: 'sf-main-cost', title: 'Custo/Resultado', subtitle: `Por ${sfCards.result.label === 'purchases' ? 'Venda' : 'Resultado'}`, value: formatCurrency(sfCards.cost_per_result.value, sfCards.cost_per_result.currency), icon: TrendingUp, gradient: 'from-blue-500/10 via-blue-500/5 to-transparent', iconGradient: 'from-blue-500 to-blue-600' },
        { id: 'sf-main-return', title: 'Retorno', subtitle: 'Valor de Compra', value: formatCurrency(sfCards.return.value, sfCards.return.currency), icon: RotateCcw, gradient: 'from-primary/10 via-primary/5 to-transparent', iconGradient: 'from-primary to-primary/80' },
      ];
    } else {
      const adsCards = cards as GoogleAdsCards;
      return [
        { id: 'ads-main-investment', title: 'Investimento', subtitle: 'Valor Gasto', value: formatCurrency(adsCards.investment.value, adsCards.investment.currency), icon: DollarSign, gradient: 'from-red-500/10 via-red-500/5 to-transparent', iconGradient: 'from-red-500 to-red-600' },
        { id: 'ads-main-result', title: 'Resultado', subtitle: adsCards.result.label === 'conversions' ? 'Conversões' : adsCards.result.label, value: adsCards.result.value.toString(), icon: Target, gradient: 'from-primary/10 via-primary/5 to-transparent', iconGradient: 'from-primary to-primary/80' },
        { id: 'ads-main-cost', title: 'Custo/Resultado', subtitle: 'Por Conversão', value: formatCurrency(adsCards.cost_per_result.value, adsCards.cost_per_result.currency), icon: TrendingUp, gradient: 'from-blue-500/10 via-blue-500/5 to-transparent', iconGradient: 'from-blue-500 to-blue-600' },
        { id: 'ads-main-return', title: 'Retorno', subtitle: 'Valor Conversões', value: formatCurrency(adsCards.return.value, adsCards.return.currency), icon: RotateCcw, gradient: 'from-primary/10 via-primary/5 to-transparent', iconGradient: 'from-primary to-primary/80' },
      ];
    }
  };

  const defaultCards = buildCards();
  const storageKey = `funnel-main-order-${viewType}`;

  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const currentCards = buildCards();
    const saved = localStorage.getItem(storageKey);
    const defaultIds = currentCards.map(c => c.id);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const valid = Array.isArray(parsed) && parsed.length === defaultIds.length && parsed.every(id => defaultIds.includes(id));
        if (valid) {
          setOrderedIds(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse grid order", e);
      }
    }
    setOrderedIds(defaultIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewType]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(storageKey, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  if (!isClient || orderedIds.length === 0) return null; // Avoid hydration mismatch

  // Maps IDs back to card data
  const renderCards = orderedIds.map(id => defaultCards.find(c => c.id === id)!).filter(Boolean);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-2 stagger-fade-in">
          {renderCards.map((card) => (
            <SortableMetricCard key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};


// --- SECONDARY CARDS DRAGGABLE COMPONENT ---
const SortableSecondaryCard: React.FC<{ card: SecondaryMetricCardData }> = ({ card }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

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
        "sf-card p-4 relative group transition-all duration-300 isolate overflow-hidden",
        isDragging
          ? "opacity-90 scale-105 shadow-xl border-primary cursor-grabbing"
          : "hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.2)] border-border/60 hover:border-primary/40 hover:-translate-y-1 animate-fade-in hover:bg-transparent"
      )}
    >
      {/* Background Gradient Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-2 right-2 p-1 rounded-md transition-all z-20",
          "text-muted-foreground/30 hover:text-foreground hover:bg-secondary",
          isDragging ? "opacity-100 cursor-grabbing" : "opacity-0 group-hover:opacity-100 cursor-grab"
        )}
        title="Arraste para mover"
      >
        <GripHorizontal className="w-3.5 h-3.5" />
      </div>

      <div className="flex items-start gap-3 pointer-events-none">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          card.variant === 'success' && 'bg-primary/15 text-primary',
          card.variant === 'danger' && 'bg-red-500/15 text-red-400',
          card.variant === 'neutral' && 'bg-muted text-muted-foreground',
          card.variant === 'default' && 'bg-muted text-muted-foreground'
        )}>
          <card.icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <p className="text-xs font-semibold text-foreground truncate">{card.label}</p>
          <p className="text-[10px] text-muted-foreground truncate mb-2">{card.description}</p>
          <p className={cn(
            "text-lg font-bold",
            card.variant === 'success' && 'text-primary',
            card.variant === 'danger' && 'text-red-400',
            card.variant === 'neutral' && 'text-foreground',
            card.variant === 'default' && 'text-foreground'
          )}>
            {card.value}
          </p>
        </div>
      </div>
    </div>
  );
};

export const FunnelSecondaryMetrics: React.FC<FunnelMetricCardsProps> = ({ viewType, cards }) => {
  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  };
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const buildCards = (): SecondaryMetricCardData[] => {
    if (viewType === 'sf_funnels') {
      const sfCards = cards as SFFunnelCards;
      return [
        { id: 'sf-sec-ctr', icon: TrendingUp, label: "CTR", description: "Taxa de Cliques", value: formatPercent(sfCards.ctr.value), variant: "neutral" },
        { id: 'sf-sec-cpc', icon: Target, label: "Custo/Checkout", description: "Custo por Início de Compra", value: formatCurrency(sfCards.cost_per_checkout.value, sfCards.cost_per_checkout.currency) },
        { id: 'sf-sec-esc', icon: ArrowDownRight, label: "Taxa de Escape", description: "Usuários que Abandonaram", value: formatPercent(sfCards.escape_rate.value), variant: "danger" },
        { id: 'sf-sec-time', icon: Clock, label: "Tempo Médio", description: "Tempo na Página", value: sfCards.avg_time_on_page.formatted }
      ];
    } else {
      const adsCards = cards as GoogleAdsCards;
      return [
        { id: 'ads-sec-cpm', icon: DollarSign, label: "CPM", description: "Custo por Mil Impressões", value: formatCurrency(adsCards.cpm.value, adsCards.cpm.currency) },
        { id: 'ads-sec-ctr', icon: TrendingUp, label: "CTR", description: "Taxa de Cliques", value: formatPercent(adsCards.ctr.value), variant: "neutral" },
        { id: 'ads-sec-roas', icon: ArrowUpRight, label: "ROAS", description: "Retorno sobre Investimento", value: `${adsCards.roas.value.toFixed(2)}x`, variant: "success" },
        { id: 'ads-sec-share', icon: Percent, label: "Imp. Share", description: "Parcela de Impressões", value: formatPercent(adsCards.impression_share.value) },
        { id: 'ads-sec-top', icon: Target, label: "Top Imp.", description: "Impressões no Topo", value: formatPercent(adsCards.top_impression_share.value) }
      ];
    }
  };

  const defaultCards = buildCards();
  const storageKey = `funnel-sec-order-${viewType}`;

  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const currentCards = buildCards();
    const saved = localStorage.getItem(storageKey);
    const defaultIds = currentCards.map(c => c.id);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const valid = Array.isArray(parsed) && parsed.length === defaultIds.length && parsed.every(id => defaultIds.includes(id));
        if (valid) {
          setOrderedIds(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse grid order", e);
      }
    }
    setOrderedIds(defaultIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewType]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(storageKey, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  if (!isClient || orderedIds.length === 0) return null;

  const renderCards = orderedIds.map(id => defaultCards.find(c => c.id === id)!).filter(Boolean);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div className={cn(
          "grid gap-4 stagger-fade-in",
          viewType === 'sf_funnels' ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        )}>
          {renderCards.map((card) => (
            <SortableSecondaryCard key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
