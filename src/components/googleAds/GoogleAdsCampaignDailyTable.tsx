import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCampaignDailyMetrics } from '@/services/googleAdsApi';
import { GoogleAdsDailyMetric } from '@/types/googleAds';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, GripVertical, Settings2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type ColumnDef = {
    id: string;
    label: string;
    visible: boolean;
    align?: 'left' | 'center' | 'right';
};

const DEFAULT_COLUMNS: ColumnDef[] = [
    { id: 'date', label: 'Data', visible: true, align: 'left' },
    { id: 'budget', label: 'Orçamento', visible: true, align: 'right' },
    { id: 'meta', label: 'CPA Desejado', visible: true, align: 'right' },
    { id: 'impressions', label: 'Impressões', visible: true, align: 'right' },
    { id: 'clicks', label: 'Cliques', visible: true, align: 'right' },
    { id: 'cost', label: 'Custo', visible: true, align: 'right' },
    { id: 'cpc', label: 'CPC Médio', visible: true, align: 'right' },
    { id: 'ctr', label: 'CTR', visible: true, align: 'right' },
    { id: 'conversions', label: 'Conversões', visible: true, align: 'right' },
    { id: 'checkouts', label: 'Checkouts', visible: true, align: 'right' },
    { id: 'cpa', label: 'Custo/Conv.', visible: true, align: 'right' },
    { id: 'conv_value', label: 'Valor Conv.', visible: true, align: 'right' },
    { id: 'checkout_value', label: 'Valor Checkouts', visible: true, align: 'right' },
    { id: 'impr_share', label: 'Part. Impr.', visible: true, align: 'right' },
    { id: 'top_impr_share', label: 'Part. Top', visible: true, align: 'right' },
    { id: 'abs_top_share', label: 'Part. Segm.', visible: true, align: 'right' },
];

function SortableColumnItem({
    column,
    onToggle
}: {
    column: ColumnDef;
    onToggle: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: column.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 mb-1 bg-background border border-border rounded-md shadow-sm">
            <div className="flex items-center gap-3">
                <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">{column.label}</span>
            </div>
            <Switch
                checked={column.visible}
                onCheckedChange={() => onToggle(column.id)}
            />
        </div>
    );
}

interface GoogleAdsCampaignDailyTableProps {
    campaignId: number;
    startDate: Date;
    endDate: Date;
    biddingStrategy?: string;
}

const GoogleAdsCampaignDailyTable: React.FC<GoogleAdsCampaignDailyTableProps> = ({
    campaignId,
    startDate,
    endDate,
    biddingStrategy,
}) => {
    const { token, user, mutateUser } = useAuth();
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const [columns, setColumns] = React.useState<ColumnDef[]>(() => {
        let saved: ColumnDef[] | null = null;

        const raw = localStorage.getItem('sf_campaigns_daily_columns');
        if (raw) {
            try { saved = JSON.parse(raw); } catch { /* ignore */ }
        }

        if (!saved && user?.preferences?.sf_campaigns_daily_columns) {
            saved = user.preferences.sf_campaigns_daily_columns;
        }

        if (!saved) return DEFAULT_COLUMNS;

        // Merge new defaults not present in saved prefs
        const savedIds = new Set(saved.map(c => c.id));
        const newCols = DEFAULT_COLUMNS.filter(c => !savedIds.has(c.id));
        if (newCols.length > 0) {
            const dateIdx = saved.findIndex(c => c.id === 'date');
            if (dateIdx >= 0) {
                saved.splice(dateIdx + 1, 0, ...newCols);
            } else {
                saved.unshift(...newCols);
            }
        }

        // Sync labels from defaults (so renames take effect)
        const labelMap = Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, c.label]));
        saved.forEach(c => { if (labelMap[c.id]) c.label = labelMap[c.id]; });

        return saved;
    });

    const isInitialMount = React.useRef(true);

    React.useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        localStorage.setItem('sf_campaigns_daily_columns', JSON.stringify(columns));

        const timeout = setTimeout(async () => {
            try {
                if (token) {
                    await api.updatePreferences(token, { sf_campaigns_daily_columns: columns });
                }
            } catch (error) {
                console.error('Failed to sync daily columns to cloud', error);
            }
        }, 1500);

        return () => clearTimeout(timeout);
    }, [columns, token]);

    const visibleColumns = React.useMemo(() => columns.filter(c => c.visible), [columns]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleColumn = (id: string) => {
        setColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
    };

    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['campaignDailyMetrics', campaignId, formattedStartDate, formattedEndDate],
        queryFn: () =>
            fetchCampaignDailyMetrics(token!, campaignId, {
                start_date: formattedStartDate,
                end_date: formattedEndDate,
            }),
        enabled: !!token && !!campaignId,
    });

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatNumber = (value: number) =>
        new Intl.NumberFormat('pt-BR').format(value);

    const formatPercent = (value: number) =>
        `${value.toFixed(2)}%`;

    if (isError) {
        return (
            <div className="p-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Erro ao carregar métricas diárias da campanha.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const metrics: GoogleAdsDailyMetric[] = data?.data || [];

    return (
        <div className="py-2 px-6 bg-muted/10">
            <div className="rounded-md border border-border/50 bg-background overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                {visibleColumns.map((col) => (
                                    <TableHead key={col.id} className={cn("font-semibold whitespace-nowrap", col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '')}>
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {visibleColumns.map((col) => (
                                            <TableCell key={col.id}><Skeleton className="h-4 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : metrics.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length} className="text-center py-6 text-muted-foreground">
                                        Nenhum dado diário encontrado para este período.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                metrics.map((row) => {
                                    const impressions = Number(row.impressions) || 0;
                                    const clicks = Number(row.clicks) || 0;
                                    const cost = parseFloat(row.cost) || 0;
                                    const conversions = Number(row.conversions) || 0;
                                    const conversionValue = parseFloat(row.conversion_value) || 0;
                                    const checkouts = Number(row.checkout_conversions) || 0;
                                    const checkoutValue = parseFloat(row.checkout_value) || 0;

                                    const cpc = clicks > 0 ? cost / clicks : 0;
                                    const cpa = conversions > 0 ? cost / conversions : 0;
                                    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                                    const imprShare = parseFloat(row.impression_share_percent) || 0;
                                    const topImprShare = parseFloat(row.top_impression_share_percent) || 0;
                                    const absTopImprShare = parseFloat(row.absolute_top_impression_share_percent) || 0;

                                    return (
                                        <TableRow key={row.date} className="hover:bg-muted/30">
                                            {visibleColumns.map(col => {
                                                switch (col.id) {
                                                    case 'date': return <TableCell key={col.id} className="font-medium whitespace-nowrap">{format(parseISO(row.date), 'dd/MM/yyyy')}</TableCell>;
                                                    case 'impressions': return <TableCell key={col.id} className="text-right font-mono">{formatNumber(impressions)}</TableCell>;
                                                    case 'clicks': return <TableCell key={col.id} className="text-right font-mono">{formatNumber(clicks)}</TableCell>;
                                                    case 'cost': return <TableCell key={col.id} className="text-right font-mono text-destructive">{formatCurrency(cost)}</TableCell>;
                                                    case 'cpc': return <TableCell key={col.id} className="text-right font-mono">{formatCurrency(cpc)}</TableCell>;
                                                    case 'ctr': return <TableCell key={col.id} className="text-right font-mono">{formatPercent(ctr)}</TableCell>;
                                                    case 'conversions': return <TableCell key={col.id} className="text-right font-mono">{formatNumber(conversions)}</TableCell>;
                                                    case 'checkouts': return <TableCell key={col.id} className="text-right font-mono">{formatNumber(checkouts)}</TableCell>;
                                                    case 'cpa': return <TableCell key={col.id} className="text-right font-mono">{formatCurrency(cpa)}</TableCell>;
                                                    case 'conv_value': return <TableCell key={col.id} className="text-right font-mono text-emerald-500">{formatCurrency(conversionValue)}</TableCell>;
                                                    case 'checkout_value': return <TableCell key={col.id} className="text-right font-mono text-orange-500">{formatCurrency(checkoutValue)}</TableCell>;
                                                    case 'impr_share': return <TableCell key={col.id} className="text-right font-mono text-muted-foreground">{imprShare > 0 ? formatPercent(imprShare) : '<10%'}</TableCell>;
                                                    case 'top_impr_share': return <TableCell key={col.id} className="text-right font-mono text-muted-foreground">{topImprShare > 0 ? formatPercent(topImprShare) : '<10%'}</TableCell>;
                                                    case 'abs_top_share': return <TableCell key={col.id} className="text-right font-mono text-muted-foreground">{absTopImprShare > 0 ? formatPercent(absTopImprShare) : '<10%'}</TableCell>;
                                                    case 'budget': {
                                                        const budgetVal = row.snapshot_budget_daily != null ? parseFloat(String(row.snapshot_budget_daily)) : null;
                                                        return (
                                                            <TableCell key={col.id} className="text-right font-mono">
                                                                {budgetVal != null ? formatCurrency(budgetVal) : <span className="text-muted-foreground">—</span>}
                                                            </TableCell>
                                                        );
                                                    }
                                                    case 'meta': {
                                                        let metaLbl = '';
                                                        let metaVal: number | null = null;
                                                        const s = biddingStrategy || '';
                                                        if (s === 'TARGET_CPA' || s === 'MAXIMIZE_CONVERSIONS') {
                                                            metaLbl = 'CPA';
                                                            metaVal = row.snapshot_target_cpa != null ? parseFloat(String(row.snapshot_target_cpa)) : null;
                                                        } else if (s === 'TARGET_ROAS' || s === 'MAXIMIZE_CONVERSION_VALUE') {
                                                            metaLbl = 'ROAS';
                                                            metaVal = row.snapshot_target_roas != null ? parseFloat(String(row.snapshot_target_roas)) : null;
                                                        } else if (s === 'MANUAL_CPC' || s === 'ENHANCED_CPC' || s === 'TARGET_SPEND') {
                                                            metaLbl = 'CPC';
                                                            metaVal = row.snapshot_max_cpc_limit != null ? parseFloat(String(row.snapshot_max_cpc_limit)) : null;
                                                        } else if (s === 'TARGET_IMPRESSION_SHARE') {
                                                            metaLbl = 'Impr.';
                                                            metaVal = row.snapshot_max_cpc_limit != null ? parseFloat(String(row.snapshot_max_cpc_limit)) : null;
                                                        }
                                                        return (
                                                            <TableCell key={col.id} className="text-right font-mono">
                                                                {metaVal != null ? (
                                                                    <span>{metaLbl === 'ROAS' ? `${metaVal}x` : formatCurrency(metaVal)} <span className="text-[10px] text-muted-foreground">{metaLbl}</span></span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    }
                                                    default: return <TableCell key={col.id} />;
                                                }
                                            })}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="mt-3 flex justify-end">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
                            <Settings2 className="w-3.5 h-3.5" />
                            Personalizar Colunas Diárias
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-3">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-primary" />
                                    Colunas Diárias
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    Arraste para reordenar ou use o switch para ocultar.
                                </p>
                            </div>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={columns.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                                        {columns.map(col => (
                                            <SortableColumnItem
                                                key={col.id}
                                                column={col}
                                                onToggle={toggleColumn}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};

export default GoogleAdsCampaignDailyTable;
