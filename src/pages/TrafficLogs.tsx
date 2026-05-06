import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchVisitorsLogs, fetchTrackers } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Visitor } from '@/types/visitor';
import VisitorCard from '@/components/VisitorCard';
import VisitorDetailDrawer from '@/components/VisitorDetailDrawer';
import { Loader2, RefreshCw, Activity, Calendar, Monitor, Smartphone, LayoutGrid, Search, DollarSign, ShoppingCart, Shield, Megaphone, Eye, Target, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { MasterDetailLayout } from '@/components/layout/MasterDetailLayout';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type StatusFilter = 'all' | 'sale' | 'checkout' | 'proxy';
type TrafficFilter = 'all' | 'paid';
type DeviceFilter = 'all' | 'mobile' | 'desktop';
type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';

const TrafficLogs: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [trafficFilter, setTrafficFilter] = useState<TrafficFilter>('all');
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all');
  const [trackerFilter, setTrackerFilter] = useState<string>('all');
  const [trackerOpen, setTrackerOpen] = useState(false);

  // Drawer state
  const [selectedVisitorId, setSelectedVisitorId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { token, user } = useAuth();
  const { toast } = useToast();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch trackers for the filter
  const { data: trackersData } = useQuery({
    queryKey: ['trackers-all'],
    queryFn: async () => {
      const result = await fetchTrackers(token!);
      return result.data.data;
    },
    enabled: !!token,
  });

  const loadVisitors = useCallback(async (page: number, append: boolean = false) => {
    if (!token) return;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      // Build filters payload
      const filters = {
        search: searchTerm,
        date_range: dateFilter,
        date_start: dateFilter === 'custom' ? dateStart : undefined,
        date_end: dateFilter === 'custom' ? dateEnd : undefined,
        status: statusFilter,
        traffic: trafficFilter,
        device: deviceFilter,
        tracker_id: trackerFilter
      };

      const response = await fetchVisitorsLogs(token, page, filters);

      if (append) {
        setVisitors(prev => [...prev, ...response.data]);
      } else {
        setVisitors(response.data);
      }

      setCurrentPage(response.current_page);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err) {
      console.error('Error loading visitors:', err);
      setError('Erro ao carregar os logs de visitantes');
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os logs de visitantes.',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [token, toast]);

  // Initial load
  useEffect(() => {
    loadVisitors(1);
  }, [loadVisitors]);

  // Stable ref for the load more callback to avoid dependency loops in IntersectionObserver
  const loadMoreCallbackRef = useRef(() => { });
  useEffect(() => {
    loadMoreCallbackRef.current = () => {
      if (!isLoadingMore && currentPage < lastPage && !isLoading) {
        loadVisitors(currentPage + 1, true);
      }
    };
  }, [currentPage, lastPage, isLoading, isLoadingMore, loadVisitors]);

  // Infinite scroll observer - initialized once
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadMoreCallbackRef.current();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Real-time listener for new visitor events
  useEffect(() => {
    if (!token || !user?.id) return;

    let echoInstance: any = null;
    let channel: any = null;

    import('@/lib/echo').then(({ createEcho }) => {
      try {
        const userId = user.id;
        if (!userId) return;

        echoInstance = createEcho();
        channel = echoInstance.private(`visitors.${userId}`);

        console.log(`[Echo] Subscribing to private-visitors.${userId}`);

        channel.listen('.VisitorCreated', (e: any) => {
          console.log('[Echo] VisitorCreated event received:', e);
          // Quando bate um evento no back-end (promesa ou clique), ele chega aqui.
          // Se o visitante já existe no state (ex: atualizar de promessa -> ativo)
          //  então atualiza. Se não, insere no topo
          setVisitors(prev => {
            const index = prev.findIndex(v => v.id === e.visitor.id);
            if (index !== -1) {
              const updated = [...prev];
              const oldVisitor = updated[index];
              const newVisitor = { ...e.visitor };

              const mergedEvents = [...(oldVisitor.events || [])];
              if (newVisitor.events && Array.isArray(newVisitor.events)) {
                newVisitor.events.forEach((newEvent: any) => {
                  if (newEvent.id && !mergedEvents.some(eve => eve.id === newEvent.id)) {
                    mergedEvents.push(newEvent);
                  }
                });
                // Sort by ID descending to keep the newest events at the top
                mergedEvents.sort((a, b) => b.id - a.id);
                newVisitor.events = mergedEvents.slice(0, 5); // display only latest 5
              }

              updated[index] = { ...oldVisitor, ...newVisitor };
              return updated;
            }

            // Limita a 100 os logs para nao estourar RAM do navegador se vierem mtos.
            // Mas garante q a pessoa veja pingar sem dar f5
            setTotal(prev => prev + 1);
            return [e.visitor, ...prev].slice(0, 100);
          });
        });

        // Ouve atualizações de status de gravação de vídeo
        channel.listen('.VisitorRecordingUpdated', (e: any) => {
          console.log('[Echo] VisitorRecordingUpdated received:', e);
          setVisitors(prev => prev.map(v => {
            if (v.id === e.visitorId) {
              return {
                ...v,
                recording: {
                  ...v.recording,
                  has_recording: e.hasRecording
                }
              };
            }
            return v;
          }));
        });

        // Ouve atualizações incrementais leves (eventos, status, métricas)
        channel.listen('.VisitorUpdated', (e: any) => {
          console.log('[Echo] VisitorUpdated received:', e);
          setVisitors(prev => prev.map(v => {
            if (v.id === e.visitorId) {
              const payload = e.payload;
              const updatedVisitor = { ...v };

              // Merge status
              if (payload.status) updatedVisitor.status = payload.status;
              if (payload.activity_status) updatedVisitor.activity_status = payload.activity_status;
              if (payload.recording) updatedVisitor.recording = payload.recording;

              // Merge metrics
              if (payload.metrics) {
                updatedVisitor.metrics = { ...updatedVisitor.metrics, ...payload.metrics };
              }

              // Append new event if present
              if (payload.new_event && payload.new_event.id) {
                const existingEvents = updatedVisitor.events || [];
                const alreadyExists = existingEvents.some((ev: any) => ev.id === payload.new_event.id);
                if (!alreadyExists) {
                  updatedVisitor.events = [payload.new_event, ...existingEvents].slice(0, 5);
                }
              }

              return updatedVisitor;
            }
            return v;
          }));
        });

      } catch (err) {
        console.error('[Echo] Failed to bind echo', err);
      }
    });

    // Cleanup: disconnect Echo when the component unmounts or deps change
    return () => {
      if (echoInstance) {
        console.log('[Echo] Disconnecting...');
        echoInstance.disconnect();
      }
    };
  }, [token, user?.id]);

  const handleRefresh = () => {
    setCurrentPage(1);
    setVisitors([]);
    loadVisitors(1);
  };

  const handleOpenDetail = (visitorId: number) => {
    setSelectedVisitorId(visitorId);
    setDrawerOpen(true);
  };

  // Trigger load on filter changes
  useEffect(() => {
    setCurrentPage(1);
    setVisitors([]);
    loadVisitors(1);
  }, [searchTerm, dateFilter, dateStart, dateEnd, statusFilter, trafficFilter, deviceFilter, trackerFilter, loadVisitors]);

  const FilterItem = ({ label, active, onClick, icon: Icon, colorClass, count }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group mb-0.5",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className={cn("w-4 h-4", active ? colorClass || "text-primary" : "text-muted-foreground group-hover:text-foreground/70")} />}
        <span>{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
          active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
        )}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <MasterDetailLayout>
      <MasterDetailLayout.Sidebar title="Logs de Tráfego">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar IP ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/20 h-9"
          />
        </div>

        <div className="space-y-6">
          {/* Trackers */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Tracker
            </h3>
            <div className="px-3">
              <Popover open={trackerOpen} onOpenChange={setTrackerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={trackerOpen}
                    className="w-full justify-between bg-background border-border/50 font-normal h-9 px-3 hover:bg-secondary/50"
                  >
                    {trackerFilter === 'all'
                      ? "Todos os Trackers"
                      : trackersData?.find((t: any) => t.id.toString() === trackerFilter)?.name || "Selecione..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[15rem] xl:w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar tracker..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Nenhum tracker encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          keywords={["Todos os Trackers", "Todos", "all", "todos"]}
                          onSelect={() => {
                            setTrackerFilter('all');
                            setTrackerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              trackerFilter === 'all' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Todos os Trackers
                        </CommandItem>
                        {trackersData?.map((tracker: any) => (
                          <CommandItem
                            key={tracker.id}
                            value={tracker.id.toString()} // Unique value to avoid collision
                            keywords={[tracker.name]}     // Allows text-based search
                            onSelect={(currentValue) => {
                              // currentValue is the tracker.id.toString() from the 'value' prop
                              setTrackerFilter(currentValue);
                              setTrackerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                trackerFilter === tracker.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {tracker.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Período */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Período
            </h3>
            <div className="space-y-0.5">
              <FilterItem label="Qualquer data" active={dateFilter === 'all'} onClick={() => setDateFilter('all')} icon={Calendar} />
              <FilterItem label="Hoje" active={dateFilter === 'today'} onClick={() => setDateFilter('today')} icon={Calendar} />
              <FilterItem label="Ontem" active={dateFilter === 'yesterday'} onClick={() => setDateFilter('yesterday')} icon={Calendar} />
              <FilterItem label="Últimos 7 dias" active={dateFilter === 'last7days'} onClick={() => setDateFilter('last7days')} icon={Calendar} />
              <FilterItem label="Últimos 30 dias" active={dateFilter === 'last30days'} onClick={() => setDateFilter('last30days')} icon={Calendar} />
              <FilterItem label="Personalizado" active={dateFilter === 'custom'} onClick={() => setDateFilter('custom')} icon={Calendar} />

              {dateFilter === 'custom' && (
                <div className="px-3 py-2 space-y-2 fade-in">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data Inicial</label>
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full bg-background border border-border/50 rounded text-xs px-2 py-1.5 focus:outline-none focus:border-primary/50 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data Final</label>
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full bg-background border border-border/50 rounded text-xs px-2 py-1.5 focus:outline-none focus:border-primary/50 text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Status
            </h3>
            <div className="space-y-0.5">
              <FilterItem label="Todos" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} icon={Eye} />
              <FilterItem label="Vendas" active={statusFilter === 'sale'} onClick={() => setStatusFilter('sale')} icon={DollarSign} colorClass="text-green-500" />
              <FilterItem label="Checkouts" active={statusFilter === 'checkout'} onClick={() => setStatusFilter('checkout')} icon={ShoppingCart} colorClass="text-blue-500" />
              <FilterItem label="VPN / Proxy" active={statusFilter === 'proxy'} onClick={() => setStatusFilter('proxy')} icon={Shield} colorClass="text-red-500" />
            </div>
          </div>

          {/* Tráfego */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Tráfego
            </h3>
            <div className="space-y-0.5">
              <FilterItem label="Todo Tráfego" active={trafficFilter === 'all'} onClick={() => setTrafficFilter('all')} icon={Activity} />
              <FilterItem label="Tráfego Pago" active={trafficFilter === 'paid'} onClick={() => setTrafficFilter('paid')} icon={Megaphone} colorClass="text-amber-500" />
            </div>
          </div>

          {/* Dispositivo */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Dispositivo
            </h3>
            <div className="space-y-0.5">
              <FilterItem label="Todos" active={deviceFilter === 'all'} onClick={() => setDeviceFilter('all')} icon={LayoutGrid} />
              <FilterItem label="Mobile" active={deviceFilter === 'mobile'} onClick={() => setDeviceFilter('mobile')} icon={Smartphone} />
              <FilterItem label="Desktop" active={deviceFilter === 'desktop'} onClick={() => setDeviceFilter('desktop')} icon={Monitor} />
            </div>
          </div>
        </div>
      </MasterDetailLayout.Sidebar>

      <MasterDetailLayout.Content>
        <MasterDetailLayout.Header
          title="Log em Tempo Real"
          description={`${total.toLocaleString()} visitantes encontrados para os filtros selecionados`}
        >
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading && visitors.length === 0}
            className="gap-2 h-9"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        </MasterDetailLayout.Header>

        <MasterDetailLayout.Body>
          {error && (
            <div className="p-4 mb-6 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
              {error}
            </div>
          )}

          {searchTerm && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6 bg-card/50 px-4 py-2 rounded-lg border border-border/50 inline-flex">
              <Search className="w-4 h-4" />
              <span>Resultados para "{searchTerm}"</span>
              <button
                onClick={() => setSearchTerm('')}
                className="text-primary hover:underline text-xs ml-2 font-medium"
              >
                Limpar
              </button>
            </div>
          )}

          {isLoading && visitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
              <p className="text-muted-foreground">Carregando logs de visitantes...</p>
            </div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              Nenhum visitante encontrado para os filtros atuais.
            </div>
          ) : (
            <div className="space-y-4 stagger-fade-in">
              {visitors.map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} onViewDetail={handleOpenDetail} />
              ))}
            </div>
          )}

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="h-20 mt-4 flex items-center justify-center">
            {isLoadingMore && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-muted-foreground text-sm">Carregando mais...</span>
              </div>
            )}
            {!isLoadingMore && currentPage < lastPage && (
              <Button
                variant="ghost"
                onClick={() => loadVisitors(currentPage + 1, true)}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              >
                Carregar mais
              </Button>
            )}
            {currentPage >= lastPage && visitors.length > 0 && (
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" /> Fim dos registros
              </p>
            )}
          </div>
        </MasterDetailLayout.Body>
      </MasterDetailLayout.Content>

      {/* Visitor Detail Drawer */}
      <VisitorDetailDrawer
        visitorId={selectedVisitorId}
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedVisitorId(null); }}
      />
    </MasterDetailLayout>
  );
};

export default TrafficLogs;
