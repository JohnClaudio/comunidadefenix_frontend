import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    ControlButton,
    Background,
    Connection,
    Edge,
    Node,
    MiniMap,
    MarkerType,
    SelectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTrackers, fetchCanvasViews, saveCanvasView, deleteCanvasView } from '@/services/api';
import { Tracker } from '@/types/tracker';
import { fetchFunnelData, fetchSegmentInsights } from '@/services/googleAdsApi';
import { SegmentType } from '@/types/googleAdsSegments';
import { aggregateSegmentRows } from '@/lib/googleAdsUtils';
import { format, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { CanvasSidebar } from '@/components/canvas/CanvasSidebar';
import { TrackerNode } from '@/components/canvas/nodes/TrackerNode';
import { MetricNode } from '@/components/canvas/nodes/MetricNode';
import { SiteNode } from '@/components/canvas/nodes/SiteNode';
import { TableNode } from '@/components/canvas/nodes/TableNode';
import { AuctionTableNode } from '@/components/canvas/nodes/AuctionTableNode';
import { CampaignNode } from '@/components/canvas/nodes/CampaignNode';
import { AdGroupNode } from '@/components/canvas/nodes/AdGroupNode';
import { FunnelNode } from '@/components/canvas/nodes/FunnelNode';
import { SegmentInsightsNode } from '@/components/canvas/nodes/SegmentInsightsNode';
import { CreativeNode } from '@/components/canvas/nodes/CreativeNode';
import { DemographicsNode } from '@/components/canvas/nodes/DemographicsNode';
import { KeywordsNode } from '@/components/canvas/nodes/KeywordsNode';
import { SegmentsNode } from '@/components/canvas/nodes/SegmentsNode';
import { DailyTableNode } from '@/components/canvas/nodes/DailyTableNode';
import { TextNode } from '@/components/canvas/nodes/TextNode';
import { CompareGeneratorModal, CompareSource } from '@/components/canvas/CompareGeneratorModal';
import { Activity, Calendar, Copy, Trash2, MousePointer2, Hand, Save, FolderOpen, SplitSquareVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const nodeTypes = {
    tracker: TrackerNode,
    site: SiteNode,
    metric: MetricNode,
    table: TableNode,
    auction_table: AuctionTableNode,
    campaign: CampaignNode,
    adGroup: AdGroupNode,
    funnel: FunnelNode,
    segment_insights: SegmentInsightsNode,
    creative: CreativeNode,
    demographics: DemographicsNode,
    keywords: KeywordsNode,
    audiences: SegmentsNode,
    daily_table: DailyTableNode,
    text: TextNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `node_${Date.now()}_${id++}_${Math.random().toString(36).slice(2, 6)}`;

const StoryboardCanvasContent = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // Global Filter State
    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Interaction Mode
    const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('pan');

    const { token } = useAuth();
    const { toast } = useToast();

    // Canvas Views State
    const [canvasViews, setCanvasViews] = useState<any[]>([]);
    const [selectedViewId, setSelectedViewId] = useState<number | 'default' | ''>('');
    const [isSavingView, setIsSavingView] = useState(false);
    const [saveViewName, setSaveViewName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    // Compare Generator
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [availableTrackers, setAvailableTrackers] = useState<Tracker[]>([]);

    // Load available views and trackers on mount
    useEffect(() => {
        if (!token) return;

        fetchCanvasViews(token)
            .then(data => setCanvasViews(data))
            .catch(err => console.error("Error loading canvas views", err));

        fetchTrackers(token)
            .then(res => setAvailableTrackers(res.data.data))
            .catch(err => console.error("Error loading available trackers for comparison view", err));

    }, [token]);

    // ═══════════════════════════════════════════════════
    // API RESPONSE CACHE + IN-FLIGHT DEDUP
    // Prevents duplicate calls when multiple nodes share same source
    // ═══════════════════════════════════════════════════
    const apiCache = useRef<Map<string, any>>(new Map());
    const inflightRequests = useRef<Map<string, Promise<any>>>(new Map());

    // Invalidate cache when date range changes
    useEffect(() => {
        apiCache.current.clear();
        inflightRequests.current.clear();
    }, [dateFrom, dateTo]);

    // Reusable function to fetch and update a specific target node (now multi-source capable)
    const fetchAndUpdateNode = async (any_source: Node, targetNode: Node, currentNodes: Node[], currentEdges: Edge[]) => {
        try {
            // 1. Deteção de Multi-Source: Buscar TODAS as origens conectadas a este nó de destino
            const incomingEdges = currentEdges.filter(e => e.target === targetNode.id);
            const sourceNodes = (currentNodes || nodes).filter(n => incomingEdges.some(e => e.source === n.id));

            if (sourceNodes.length === 0) return;

            // Identificadores coletivos para label
            const sourceLabels = sourceNodes.map(n => n.data.label).join(' + ');

            // 2. Preparar Fetches Paralelos
            const results = await Promise.allSettled(sourceNodes.map(async (sourceNode) => {
                // Identificadores individuais
                const trackerId = sourceNode.type === 'tracker' ? sourceNode.data.trackerId : undefined;
                const campaignId = sourceNode.type === 'campaign' ? sourceNode.data.campaignId : undefined;
                const adGroupId = sourceNode.type === 'adGroup' ? sourceNode.data.adGroupId : undefined;
                
                const getEntityId = (n: Node) => {
                    const eid = n.data.trackerId || n.data.campaignId || n.data.adGroupId || n.data.uuid;
                    return eid ? String(eid) : n.id;
                };
                const entityId = getEntityId(sourceNode);
                const cacheKeyDate = `${dateFrom}_${dateTo}`;

                let funnelResponse: any = null;
                let segResponse: any = null;

                // --- Funnel Data (Metrics/Tables) ---
                const needsFunnel = ['metric', 'table', 'auction_table', 'funnel', 'daily_table'].includes(targetNode.type!);
                if (needsFunnel && (sourceNode.type === 'tracker' || sourceNode.type === 'campaign' || sourceNode.type === 'adGroup')) {
                    const cacheKey = `funnel_${sourceNode.type}_${entityId}_${cacheKeyDate}`;
                    if (apiCache.current.has(cacheKey)) {
                        funnelResponse = apiCache.current.get(cacheKey);
                    } else if (inflightRequests.current.has(cacheKey)) {
                        funnelResponse = await inflightRequests.current.get(cacheKey);
                    } else {
                        const queryParams: any = {
                            view_type: sourceNode.type === 'tracker' ? 'sf_funnels' : 'google_ads',
                            from: dateFrom + ' 00:00:00',
                            to: dateTo + ' 23:59:59',
                        };
                        if (trackerId) queryParams.tracker_id = trackerId;
                        if (campaignId) queryParams.google_ads_campaign_id = campaignId;
                        if (adGroupId) queryParams.group_id = adGroupId;

                        const promise = fetchFunnelData(token!, queryParams).then(res => {
                            apiCache.current.set(cacheKey, res);
                            inflightRequests.current.delete(cacheKey);
                            return res;
                        }).catch(e => {
                            inflightRequests.current.delete(cacheKey);
                            throw e;
                        });
                        inflightRequests.current.set(cacheKey, promise);
                        funnelResponse = await promise;
                    }
                } else if (needsFunnel && sourceNode.type === 'site') {
                    // Site mock logic
                    funnelResponse = {
                        data: {
                            funnel: { page_views: 4500, passed: 1200, checkouts: 400, purchases: 50, impressions: 0, clicks: 0 },
                            cards: { investment: { value: 0 }, result: { value: 50 }, cost_per_result: { value: 0 } },
                            charts: { timeline_daily: [] }
                        }
                    };
                }

                // --- Segment Data ---
                const needsSegments = ['segment_insights', 'creative', 'demographics', 'keywords', 'audiences'].includes(targetNode.type!);
                if (needsSegments && (sourceNode.type === 'tracker' || sourceNode.type === 'campaign' || sourceNode.type === 'adGroup')) {
                    const segCacheKey = `seg_${sourceNode.type}_${entityId}_${cacheKeyDate}`;
                    if (apiCache.current.has(segCacheKey)) {
                        segResponse = apiCache.current.get(segCacheKey);
                    } else if (inflightRequests.current.has(segCacheKey)) {
                        segResponse = await inflightRequests.current.get(segCacheKey);
                    } else {
                        const allSegmentTypes: SegmentType[] = ['device', 'gender', 'age_range', 'keyword', 'search_term', 'placement', 'day_of_week', 'ad', 'video', 'audience'];
                        const promise = fetchSegmentInsights(token!, {
                            segment_types: allSegmentTypes,
                            start_date: dateFrom,
                            end_date: dateTo,
                            google_ads_campaign_id: campaignId,
                            tracker_id: trackerId,
                        }).then(res => {
                            apiCache.current.set(segCacheKey, res.data);
                            inflightRequests.current.delete(segCacheKey);
                            return res.data;
                        }).catch(e => {
                            inflightRequests.current.delete(segCacheKey);
                            throw e;
                        });
                        inflightRequests.current.set(segCacheKey, promise);
                        segResponse = await promise;
                    }
                }

                return { sourceNode, funnelResponse, segResponse };
            }));

            // 3. Filtragem de SUCESSO e AGREGAÇÃO
            const successful = results.filter(r => r.status === 'fulfilled').map((r: any) => r.value);
            if (successful.length === 0) throw new Error("Falha ao carregar dados de todas as fontes");

            // --- Somar Dados de Funil (Financeiro/KPIs) ---
            let totalValue: number = 0;
            let combinedFunnel = { impressions: 0, clicks: 0, page_views: 0, passed: 0, checkouts: 0, purchases: 0, conversions: 0, gadsCheckouts: 0 };
            let combinedInvestment = 0;
            let combinedResultValue = 0;
            let combinedTableData: any[] = [];
            
            successful.forEach(res => {
                if (res.funnelResponse) {
                    const f = res.funnelResponse.data.funnel || {};
                    const cards = res.funnelResponse.data.cards || {};
                    
                    combinedFunnel.impressions += Number(f.impressions || 0);
                    combinedFunnel.clicks += Number(f.clicks || 0);
                    combinedFunnel.page_views += Number(f.page_views || 0);
                    combinedFunnel.passed += Number(f.passed || 0);
                    combinedFunnel.checkouts += Number(f.checkouts || 0);
                    combinedFunnel.purchases += Number(f.purchases || 0);
                    combinedFunnel.conversions += Number(f.conversions || cards.result?.value || 0);
                    combinedFunnel.gadsCheckouts += Number(cards.checkout_conversions?.value || 0);
                    combinedInvestment += Number(cards.investment?.value || 0);
                    combinedResultValue += Number(cards.conversion_value?.value || 0);
                    
                    if (targetNode.type === 'table' || targetNode.type === 'auction_table' || targetNode.type === 'daily_table') {
                        let sourceName = res.sourceNode.data.label;
                        if (res.sourceNode.type === 'adGroup' && res.sourceNode.data.campaignName) {
                            sourceName = `${res.sourceNode.data.campaignName} > ${sourceName}`;
                        }
                        
                        const rows = (res.funnelResponse.data.charts?.timeline_daily || []).map((r: any) => ({ 
                            ...r, 
                            sourceName: r.campaign_name || r.name || r.campaignName || sourceName,
                            date: r.date || r.day,
                            conversions: r.conversions !== undefined ? r.conversions : (r.purchases || 0),
                            conversion_value: r.conversion_value !== undefined ? r.conversion_value : (r.revenue || r.value || 0),
                            checkouts: r.checkouts !== undefined ? r.checkouts : (r.checkout_conversions || 0),
                            checkout_value: r.checkout_value !== undefined ? r.checkout_value : 0,
                            // Ensure snapshot metrics are mapped if they use different names
                            impr_share: r.impr_share || r.impression_share_percent || 0,
                            top_impr_share: r.top_impr_share || r.top_impression_share_percent || 0,
                            abs_top_share: r.abs_top_share || r.absolute_top_impression_share_percent || 0,
                            budget: r.budget || r.snapshot_budget_daily || 0,
                            target_cpa: r.target_cpa || r.snapshot_target_cpa || 0,
                        }));
                        combinedTableData = [...combinedTableData, ...rows];
                    }
                }
            });

            // Aggregate timeline Data if needed
            if (['table', 'auction_table'].includes(targetNode.type!)) {
                // Group by date
                const dateMap = new Map<string, any>();
                combinedTableData.forEach(row => {
                    const d = row.date;
                    if (!dateMap.has(d)) {
                        dateMap.set(d, { ...row });
                    } else {
                        const ex = dateMap.get(d);
                        ex.impressions = Number(ex.impressions || 0) + Number(row.impressions || 0);
                        ex.clicks = Number(ex.clicks || 0) + Number(row.clicks || 0);
                        ex.cost = Number(ex.cost || 0) + Number(row.cost || 0);
                        ex.conversions = Number(ex.conversions || 0) + Number(row.conversions || 0);
                        ex.conversion_value = Number(ex.conversion_value || 0) + Number(row.conversion_value || 0);
                        ex.page_views = Number(ex.page_views || 0) + Number(row.page_views || 0);
                        ex.passed = Number(ex.passed || 0) + Number(row.passed || 0);
                        ex.checkouts = Number(ex.checkouts || 0) + Number(row.checkouts || 0);
                        ex.purchases = Number(ex.purchases || 0) + Number(row.purchases || 0);
                        ex.checkout_conversions = Number(ex.checkout_conversions || 0) + Number(row.checkout_conversions || 0);
                        ex.checkout_value = Number(ex.checkout_value || 0) + Number(row.checkout_value || 0);
                    }
                });
                combinedTableData = Array.from(dateMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            } else if (targetNode.type === 'daily_table') {
                // Just sort by date, keeping separate records
                combinedTableData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            }

            // Definir valor final baseado no MetricType
            if (targetNode.type === 'metric') {
                const mt = targetNode.data.metricType;
                if (mt === 'impressions') totalValue = combinedFunnel.impressions;
                else if (mt === 'clicks') totalValue = combinedFunnel.clicks;
                else if (mt === 'cost') totalValue = combinedInvestment;
                else if (mt === 'gads_conversions') totalValue = combinedFunnel.conversions;
                else if (mt === 'gads_conversion_value') totalValue = combinedResultValue;
                else if (mt === 'sf_purchases') totalValue = combinedFunnel.purchases;
                else if (mt === 'sf_checkouts') totalValue = combinedFunnel.checkouts;
                else if (mt === 'page_views') totalValue = combinedFunnel.page_views;
                else if (mt === 'passed') totalValue = combinedFunnel.passed;
                else if (mt === 'roas') totalValue = combinedInvestment > 0 ? (combinedResultValue / combinedInvestment) : 0;
                else if (mt === 'ctr') totalValue = combinedFunnel.impressions > 0 ? (combinedFunnel.clicks / combinedFunnel.impressions) * 100 : 0;
                else if (mt === 'cpm') totalValue = combinedFunnel.impressions > 0 ? (combinedInvestment / combinedFunnel.impressions) * 1000 : 0;
                else totalValue = 0;
            }

            // --- Somar Dados de Segmentos ---
            let mergedSegData: any = {};
            const segTypes = ['device', 'gender', 'age_range', 'keyword', 'search_term', 'placement', 'day_of_week', 'ad', 'video', 'audience'];
            segTypes.forEach(type => {
                const allRows = successful.flatMap(res => {
                    const rows = res.segResponse?.[type] || [];
                    console.log(`[SegMerge] Source ${res.sourceNode.data.label} / Type ${type} Rows:`, rows);
                    return rows;
                }) as any[];
                
                if (allRows.length > 0) {
                    let keyGetter = (r: any) => r.segment_key;
                    if (type === 'device') keyGetter = (r: any) => r.segment_data?.device || 'OTHER';
                    if (['gender', 'age_range'].includes(type)) keyGetter = (r: any) => r.segment_data?.type || 'UNDETERMINED';
                    if (type === 'keyword') keyGetter = (r: any) => r.segment_data?.text || r.segment_data?.keyword || r.segment_data?.info?.text || r.segment_key;
                    if (type === 'search_term') keyGetter = (r: any) => r.segment_data?.term || 'Desconhecido';
                    if (type === 'day_of_week') keyGetter = (r: any) => r.segment_data?.day_of_week || 'UNKNOWN';
                    if (type === 'ad') keyGetter = (r: any) => r.segment_data?.id || r.segment_key;
                    
                    mergedSegData[type] = aggregateSegmentRows(allRows, keyGetter);
                    if (type === 'gender' || type === 'age_range') {
                        console.log(`[SegMerge] After merge type ${type}:`, mergedSegData[type]);
                    }
                }
            });

            // 4. Update Target Node
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === targetNode.id) {
                        let nodeUpdate: any = {
                            isConnected: true,
                            isLoading: false,
                            sourceLabel: sourceLabels,
                            value: totalValue,
                            tableData: combinedTableData,
                            funnelData: {
                                ...combinedFunnel,
                                cost: combinedInvestment,
                                conversion_value: combinedResultValue,
                                visitors: combinedFunnel.page_views,
                                gadsCheckouts: combinedFunnel.gadsCheckouts
                            }
                        };
                        
                        if (targetNode.type === 'segment_insights') nodeUpdate.segmentData = mergedSegData;
                        else if (targetNode.type === 'creative') nodeUpdate.creatives = [...(mergedSegData.video || []), ...(mergedSegData.ad || [])];
                        else if (targetNode.type === 'demographics') nodeUpdate.segmentData = { gender: mergedSegData.gender || [], age_range: mergedSegData.age_range || [] };
                        else if (targetNode.type === 'keywords') nodeUpdate.segmentData = { search_term: mergedSegData.search_term || [], keyword: mergedSegData.keyword || [] };
                        else if (targetNode.type === 'audiences') nodeUpdate.segmentData = { audience: mergedSegData.audience || [] };

                        return { ...n, data: { ...n.data, ...nodeUpdate } };
                    }
                    return n;
                })
            );

            toast({ title: 'Dados Carregados', description: `Sincronizado: ${sourceLabels} → ${targetNode.data.label || 'Tabela'}` });

        } catch (error) {
            console.error("Error fetching connecting node data", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro ao buscar os dados.' });
            setNodes((nds) => nds.map((n) => n.id === targetNode.id ? { ...n, data: { ...n.data, value: 'Erro', isConnected: true, isLoading: false } } : n));
        }
    };

    const handleUpdateAllEdges = useCallback(async () => {
        // Collect all distinct target nodes that have incoming edges
        const targetIds = Array.from(new Set(edges.map(e => e.target)));
        
        // Run parallel calls for each TARGET node (which will aggregate its own sources)
        await Promise.allSettled(targetIds.map(async (targetId) => {
            const target = nodes.find(n => n.id === targetId);
            if (target) {
                // Set loading state visually
                setNodes((nds) => nds.map((n) => n.id === targetId ? { ...n, data: { ...n.data, value: 'Carregando...', tableData: [], funnelData: null } } : n));
                try {
                    // fetchAndUpdateNode handles all sources for this target internally
                    await fetchAndUpdateNode(target, target, nodes, edges);
                } catch (err) {
                    console.error("Failed silently on bulk update for target", targetId, err);
                }
            }
        }));
    }, [edges, nodes, setNodes, fetchAndUpdateNode]);

    // Auto-update connections when global dates change
    useEffect(() => {
        if (edges.length > 0) {
            handleUpdateAllEdges();
        }
    }, [dateFrom, dateTo]);

    const onConnect = useCallback(
        async (params: Connection) => {
            const newEdge: Edge = {
                ...params,
                id: `e-${params.source}-${params.target}`,
                animated: true,
                style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
            };
            const newEdges = addEdge(newEdge, edges);
            setEdges(newEdges);

            // Auto update target node data visually (Loading State)
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === params.target) {
                        return { ...n, data: { ...n.data, isConnected: true, value: 'Carregando...', tableData: [], funnelData: null } };
                    }
                    return n;
                })
            );

            const sourceNode = nodes.find(n => n.id === params.source);
            const targetNode = nodes.find(n => n.id === params.target);

            if (sourceNode && targetNode) {
                // Pass updated edges so the logic sees the new connection
                fetchAndUpdateNode(sourceNode, targetNode, nodes, newEdges);
            }
        },
        [nodes, edges, setEdges, setNodes, token, toast, dateFrom, dateTo, fetchAndUpdateNode]
    );

    const onEdgesDelete = useCallback(
        (deletedEdges: Edge[]) => {
            // Find all target nodes of deleted edges
            const targetNodeIds = deletedEdges.map(edge => edge.target);

            setNodes((nds) =>
                nds.map((n) => {
                    if (targetNodeIds.includes(n.id)) {
                        // Check if the node STILL has any incoming edges after this deletion
                        // useEdgesState hasn't fully propagated yet, so we filter out the deleted ones
                        const remainingEdges = edges.filter(e => !deletedEdges.find(de => de.id === e.id));
                        const stillHasIncoming = remainingEdges.some(e => e.target === n.id);

                        if (!stillHasIncoming) {
                            return {
                                ...n,
                                data: {
                                    ...n.data,
                                    isConnected: false,
                                    value: '---',
                                    tableData: [],
                                    funnelData: null,
                                    segmentData: null,
                                    sourceLabel: undefined,
                                    dataSource: undefined
                                }
                            };
                        } else {
                            // If it still has other sources, trigger a re-fetch to update aggregated metrics
                            fetchAndUpdateNode(n, n, nodes, remainingEdges);
                        }
                    }
                    return n;
                })
            );
        },
        [edges, setNodes]
    );

    const selectedNodes = nodes.filter(n => n.selected);

    const duplicateSelectedNodes = useCallback(() => {
        if (selectedNodes.length === 0) return;

        // Generate mapping between original IDs and new IDs
        const newNodesMapping: Record<string, Node> = {};

        const newNodesCreated = selectedNodes.map(node => {
            const isTargetNode = ['metric', 'table', 'auction_table', 'funnel', 'segment_insights', 'creative', 'demographics', 'keywords', 'audiences'].includes(node.type!);
            const newId = getId();
            const clonedNode = {
                ...node,
                id: newId,
                position: { x: node.position.x + 40, y: node.position.y + 40 },
                selected: true,
                data: {
                    ...node.data,
                    ...(isTargetNode ? { isConnected: false, value: '---', tableData: [], funnelData: null, sourceLabel: undefined, dataSource: undefined } : {})
                }
            };
            newNodesMapping[node.id] = clonedNode;
            return clonedNode;
        });

        // Find edges that exist entirely within the selected group
        const originalNodeIds = selectedNodes.map(n => n.id);
        const internalEdges = edges.filter(e => originalNodeIds.includes(e.source) && originalNodeIds.includes(e.target));

        const newEdgesCreated = internalEdges.map(edge => {
            const clonedSourceId = newNodesMapping[edge.source]?.id;
            const clonedTargetId = newNodesMapping[edge.target]?.id;

            if (!clonedSourceId || !clonedTargetId) return null;

            return {
                ...edge,
                id: `e-${clonedSourceId}-${clonedTargetId}`,
                source: clonedSourceId,
                target: clonedTargetId,
                selected: false,
            };
        }).filter(Boolean) as Edge[];

        // Batch update nodes and edges safely
        setNodes(nds => {
            const unselectedCurrent = nds.map(n => ({ ...n, selected: false }));
            return [...unselectedCurrent, ...newNodesCreated];
        });

        if (newEdgesCreated.length > 0) {
            setEdges(eds => {
                const unselectedEdges = eds.map(e => ({ ...e, selected: false }));
                return [...unselectedEdges, ...newEdgesCreated];
            });

            // Re-fetch data for the newly connected metrics
            setTimeout(() => {
                setNodes(currentNodes => {
                    newEdgesCreated.forEach(newEdge => {
                        const src = newNodesCreated.find(n => n.id === newEdge.source);
                        const tgt = newNodesCreated.find(n => n.id === newEdge.target);
                        if (src && tgt) {
                            fetchAndUpdateNode(src, tgt, currentNodes, [...edges, ...newEdgesCreated]);
                        }
                    });
                    return currentNodes;
                });
            }, 100);
        }

        toast({ title: 'Cartões Duplicados', description: `${newNodesCreated.length} elemento(s) copiado(s).` });
    }, [selectedNodes, edges, setNodes, setEdges, toast, fetchAndUpdateNode]);

    const deleteSelectedNodes = useCallback(() => {
        if (selectedNodes.length === 0) return;
        const idsToDelete = selectedNodes.map(n => n.id);

        setNodes(nds => nds.filter(n => !idsToDelete.includes(n.id)));

        const edgesToDelete = edges.filter(e => idsToDelete.includes(e.source) || idsToDelete.includes(e.target));
        if (edgesToDelete.length > 0) {
            setEdges(eds => eds.filter(e => !idsToDelete.includes(e.source) && !idsToDelete.includes(e.target)));
            onEdgesDelete(edgesToDelete); // Trigger cleanup of orphaned nodes
        }

        toast({ title: 'Cartões Excluídos', description: `${selectedNodes.length} elemento(s) removido(s).` });
    }, [selectedNodes, edges, setNodes, setEdges, onEdgesDelete, toast]);

    // Handling Duplication (Ctrl+D / Cmd+D)
    useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                duplicateSelectedNodes();
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [duplicateSelectedNodes]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            const nodeDataRaw = event.dataTransfer.getData('application/reactflow-data');

            if (typeof type === 'undefined' || !type || !nodeDataRaw) return;

            const nodeData = JSON.parse(nodeDataRaw);

            // Check if dropped ON an existing node (React Flow DOM adds class .react-flow__node)
            const droppedOnElement = (event.target as Element).closest('.react-flow__node');
            if (droppedOnElement) {
                const targetId = droppedOnElement.getAttribute('data-id');
                const targetNode = nodes.find(n => n.id === targetId);

                // If dropping on a node of the SAME TYPE, replace its data in-place!
                if (targetNode && targetNode.type === type) {
                    setNodes(nds => nds.map(n => {
                        if (n.id === targetId) {
                            return { ...n, data: { ...n.data, ...nodeData } };
                        }
                        return n;
                    }));

                    // We need to trigger fetch for connected edges
                    setTimeout(async () => {
                        // The state needs to update first, but we can use the new node data manually
                        const updatedNode = { ...targetNode, data: { ...targetNode.data, ...nodeData } };

                        // Show loading state first for dependent targets
                        setNodes(nds => nds.map(n => {
                            if (edges.some(e => e.source === targetId && e.target === n.id)) {
                                return { ...n, data: { ...n.data, value: 'Carregando...', tableData: [] } };
                            }
                            return n;
                        }));

                        await Promise.allSettled(edges.map(async (edge) => {
                            if (edge.source === targetId) {
                                const trg = nodes.find(n => n.id === edge.target);
                                if (trg) {
                                    try {
                                        await fetchAndUpdateNode(updatedNode, trg, nodes, edges);
                                    } catch (e) {
                                        console.error("Drop Source Fetch Error:", e);
                                    }
                                }
                            } else if (edge.target === targetId) {
                                const src = nodes.find(n => n.id === edge.source);
                                if (src) {
                                    try {
                                        await fetchAndUpdateNode(src, updatedNode, nodes, edges);
                                    } catch (e) {
                                        console.error("Drop Target Fetch Error:", e);
                                    }
                                }
                            }
                        }));
                    }, 50);

                    toast({ title: 'Elemento Substituído', description: `Nova origem definida: ${nodeData.label}` });
                    return; // Prevent adding a new node
                }
            }

            // Normal drop logic (create new node)
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: getId(),
                type,
                position,
                data: { ...nodeData },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, nodes, edges, setNodes, fetchAndUpdateNode, toast],
    );

    const handleSaveView = async () => {
        if (!saveViewName.trim()) {
            toast({ variant: 'destructive', title: 'Aviso', description: 'Dê um nome para a visão.' });
            return;
        }
        setIsSavingView(true);
        try {
            const payload = { nodes, edges };
            const res = await saveCanvasView(token!, saveViewName.trim(), payload);
            toast({ title: 'Sucesso', description: res.message });

            // Reload views list
            const views = await fetchCanvasViews(token!);
            setCanvasViews(views);
            setSelectedViewId(res.view.id);
            setShowSaveDialog(false);
            setSaveViewName('');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a visão.' });
        } finally {
            setIsSavingView(false);
        }
    };

    const handleLoadView = async (viewId: number | 'default' | '') => {
        setSelectedViewId(viewId);
        if (viewId === '') return;

        if (viewId === 'default') {
            injectDefaultView();
            return;
        }

        const view = canvasViews.find(v => v.id === viewId);
        if (view && view.payload) {
            // Restore structural state
            setNodes(view.payload.nodes || []);
            setEdges(view.payload.edges || []);

            toast({ title: 'Visão Carregada', description: `Lendo estrutura de '${view.name}'` });

            // Force refetch numbers by calling handleUpdateAllEdges but we need to wait for state to commit
            setTimeout(() => {
                const loadedEdges = view.payload.edges || [];
                const loadedNodes = view.payload.nodes || [];
                loadedEdges.forEach((edge: Edge) => {
                    const src = loadedNodes.find((n: Node) => n.id === edge.source);
                    const tgt = loadedNodes.find((n: Node) => n.id === edge.target);
                    if (src && tgt) {
                        fetchAndUpdateNode(src, tgt, loadedNodes, loadedEdges);
                    }
                });
            }, 500);
        }
    };

    const injectDefaultView = useCallback(async () => {
        try {
            // Find a tracker to be the root (fetch directly or assume user has one)
            const trackersRes = await fetchTrackers(token!);
            const rootTracker = trackersRes.data.data[0];

            if (!rootTracker) {
                toast({ variant: 'destructive', title: 'Aviso', description: 'Nenhum tracker encontrado para gerar a visão padrão.' });
                return;
            }

            // Define Base structure
            const newNodes: Node[] = [
                {
                    id: 'default_tracker',
                    type: 'tracker',
                    position: { x: 100, y: 250 },
                    data: { trackerId: rootTracker.id, label: rootTracker.name, platform: rootTracker.platform?.name }
                },
                {
                    id: 'default_table',
                    type: 'table',
                    position: { x: 500, y: 250 },
                    data: { label: 'Tabela Diária Geral', value: 'Carregando...', isConnected: true }
                },
                {
                    id: 'default_metric_cost',
                    type: 'metric',
                    position: { x: 900, y: 50 },
                    data: { metricType: 'cost', label: 'Custo', value: 'Carregando...', isConnected: true }
                },
                {
                    id: 'default_metric_clicks',
                    type: 'metric',
                    position: { x: 900, y: 180 },
                    data: { metricType: 'clicks', label: 'Cliques', value: 'Carregando...', isConnected: true }
                },
                {
                    id: 'default_metric_conv',
                    type: 'metric',
                    position: { x: 900, y: 310 },
                    data: { metricType: 'conversions', label: 'Conversões', value: 'Carregando...', isConnected: true }
                },
                {
                    id: 'default_metric_purch',
                    type: 'metric',
                    position: { x: 900, y: 440 },
                    data: { metricType: 'purchases', label: 'Vendas', value: 'Carregando...', isConnected: true }
                }
            ];

            const newEdges: Edge[] = [
                { id: 'e-track-table', source: 'default_tracker', target: 'default_table', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' }, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
                { id: 'e-track-cost', source: 'default_tracker', target: 'default_metric_cost', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' }, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
                { id: 'e-track-click', source: 'default_tracker', target: 'default_metric_clicks', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' }, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
                { id: 'e-track-conv', source: 'default_tracker', target: 'default_metric_conv', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' }, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
                { id: 'e-track-purch', source: 'default_tracker', target: 'default_metric_purch', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' }, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } },
            ];

            setNodes(newNodes);
            setEdges(newEdges);
            toast({ title: 'Visão Padrão', description: 'Estrutura gerada com sucesso.' });

            // Allow state to set then update
            setTimeout(() => {
                newEdges.forEach(edge => {
                    const src = newNodes.find(n => n.id === edge.source);
                    const tgt = newNodes.find(n => n.id === edge.target);
                    if (src && tgt) {
                        fetchAndUpdateNode(src, tgt, newNodes, newEdges);
                    }
                });
            }, 500);

        } catch (error) {
            console.error("Error creating default view", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível gerar a visão padrão.' });
        }
    }, [token, setNodes, setEdges, toast, fetchAndUpdateNode]);

    const generateCompareLayout = useCallback(async (sources: CompareSource[], metrics: string[]) => {
        try {
            if (sources.length < 2) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Selecione pelo menos 2 origens.' });
                return;
            }

            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];

            // Geometric offset: 400px vertical gap per source
            // Colors: Indigo, Red, Emerald, Purple
            const edgeColors = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#10b981', '#a855f7'];

            sources.forEach((source, sourceIndex) => {
                const startY = 150 + (sourceIndex * 350);
                const color = edgeColors[sourceIndex] || edgeColors[0];
                const sourceNodeId = `comp_${source.type}_${sourceIndex}`;

                // Add Origin Node (Tracker or Campaign)
                const sourceNode: Node = {
                    id: sourceNodeId,
                    type: source.type,
                    position: { x: 100, y: startY },
                    data: source.type === 'tracker'
                        ? { trackerId: Number(source.id), label: source.name }
                        : { campaignId: Number(source.id), label: source.name }
                };
                newNodes.push(sourceNode);

                // Add Metric Nodes in a horizontal row
                metrics.forEach((metricType, metricIndex) => {
                    const metricId = `comp_metric_${sourceIndex}_${metricIndex}`;
                    const startX = 450;
                    const offsetX = metricIndex * 240;

                    newNodes.push({
                        id: metricId,
                        type: 'metric',
                        position: { x: startX + offsetX, y: startY },
                        data: { metricType, label: 'Carregando...', value: '...', isConnected: true }
                    });

                    newEdges.push({
                        id: `edge_${sourceIndex}_${metricIndex}`,
                        source: sourceNode.id,
                        target: metricId,
                        animated: true,
                        markerEnd: { type: MarkerType.ArrowClosed, color },
                        style: { stroke: color, strokeWidth: 2 }
                    });
                });
            });

            // Wipe canvas and load fresh
            setNodes(newNodes);
            setEdges(newEdges);

            // Adjust viewport
            if (reactFlowInstance) {
                setTimeout(() => {
                    reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
                }, 100);
            }

            toast({ title: 'Comparativo Gerado', description: `O Layout para ${sources.length} origens foi criado. Baixando dados...` });

            // Delay and fetch
            setTimeout(() => {
                newEdges.forEach(edge => {
                    const src = newNodes.find(n => n.id === edge.source);
                    const tgt = newNodes.find(n => n.id === edge.target);
                    if (src && tgt) {
                        fetchAndUpdateNode(src, tgt, newNodes, newEdges);
                    }
                });
            }, 600);

        } catch (error) {
            console.error("Error generating comparison layout", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível gerar a estrutura.' });
        }
    }, [setNodes, setEdges, toast, fetchAndUpdateNode, reactFlowInstance]);

    return (
        <div className="flex h-[calc(100vh-theme(spacing.14))] w-full bg-background overflow-hidden relative">
            <CanvasSidebar onInjectDefaultView={injectDefaultView} />
            <div className="flex-1 h-full relative" ref={reactFlowWrapper}>

                {/* Global Canvas Header / Filter */}
                <div className="absolute top-4 left-4 z-50 bg-card/90 backdrop-blur-md border border-border shadow-lg rounded-xl p-3 flex items-center gap-4 fade-in">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Período Global</p>
                            <h3 className="text-sm font-bold text-foreground leading-tight">Filtro do Canvas</h3>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-border mx-2"></div>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                const val = e.target.value;
                                const year = parseInt(val.split('-')[0]);
                                if (year < 2000 || year > 2100) return; // reject absurd dates
                                setDateFrom(val);
                            }}
                            min="2020-01-01"
                            max={dateTo}
                            className="bg-background border border-border text-xs rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-muted-foreground text-xs">até</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                const val = e.target.value;
                                const year = parseInt(val.split('-')[0]);
                                if (year < 2000 || year > 2100) return; // reject absurd dates
                                setDateTo(val);
                            }}
                            min={dateFrom}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            className="bg-background border border-border text-xs rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <button
                        onClick={handleUpdateAllEdges}
                        className="ml-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-4 py-1.5 rounded-md transition-all shadow-sm active:scale-95 flex items-center gap-1"
                    >
                        Atualizar Dados
                    </button>

                    <div className="h-8 w-px bg-border mx-1"></div>

                    <button
                        onClick={() => setShowCompareModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/30 text-xs font-semibold px-4 py-1.5 rounded-md transition-all shadow-sm active:scale-95 border border-indigo-500/30"
                    >
                        <SplitSquareVertical className="w-3.5 h-3.5" />
                        Gerador de Comparativo
                    </button>

                    <div className="flex items-center gap-2 ml-2">
                        <div className="relative">
                            <FolderOpen className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <select
                                value={selectedViewId}
                                onChange={(e) => handleLoadView(e.target.value === 'default' || e.target.value === '' ? e.target.value : Number(e.target.value))}
                                className="pl-8 pr-6 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary text-foreground appearance-none min-w-[140px]"
                            >
                                <option value="">--- Carregar Visão ---</option>
                                <option value="default">Visão Padrão (Auto)</option>
                                {canvasViews.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => setShowSaveDialog(true)}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium px-3 py-1.5 rounded-md transition-all shadow-sm flex items-center gap-1.5 border border-border"
                        >
                            <Save className="w-3.5 h-3.5" />
                            Salvar
                        </button>
                    </div>
                </div>

                {/* Save View Modal Overlays */}
                {showSaveDialog && (
                    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center fade-in">
                        <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-2xl p-5 zoom-in-95">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Salvar Nova Visão</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome da Visão</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={saveViewName}
                                        onChange={(e) => setSaveViewName(e.target.value)}
                                        placeholder="Ex: Comparativo Logzz vs PerfectPay"
                                        className="w-full bg-background border border-border text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveView();
                                            if (e.key === 'Escape') setShowSaveDialog(false);
                                        }}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        onClick={() => setShowSaveDialog(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary/80 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveView}
                                        disabled={isSavingView || !saveViewName.trim()}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSavingView ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                                                Salvando...
                                            </>
                                        ) : (
                                            'Salvar Visão'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compare Generator Modal Overlay */}
                <CompareGeneratorModal
                    isOpen={showCompareModal}
                    onClose={() => setShowCompareModal(false)}
                    trackers={availableTrackers}
                    onGenerate={generateCompareLayout}
                />

                {/* Floating Action Toolbar for Selection */}
                {selectedNodes.length > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] border border-border shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] rounded-2xl p-1.5 flex items-center gap-1 fade-in">
                        <div className="px-3 py-1.5 flex items-center gap-2">
                            <MousePointer2 className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold text-white">{selectedNodes.length} cartão(ões)</span>
                        </div>
                        <div className="h-6 w-px bg-border/50 mx-1"></div>
                        <button
                            onClick={duplicateSelectedNodes}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-medium text-white transition-all hover:scale-105 active:scale-95"
                        >
                            <Copy className="w-4 h-4" />
                            Duplicar
                        </button>
                        <button
                            onClick={deleteSelectedNodes}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                        </button>
                    </div>
                )}

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onEdgesDelete={onEdgesDelete}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    deleteKeyCode={['Backspace', 'Delete']}
                    panOnScroll={false}
                    selectionOnDrag={interactionMode === 'select'}
                    panOnDrag={interactionMode === 'pan'}
                    selectionMode={SelectionMode.Partial}
                    fitView
                    className="bg-background/50 dot-pattern"
                    defaultEdgeOptions={{ type: 'smoothstep' }}
                >
                    <Background gap={24} size={2} color="hsl(var(--muted-foreground) / 0.2)" />
                    <Controls
                        className="bg-card border-border shadow-xl [&>button]:bg-card [&>button]:fill-foreground [&>button]:text-foreground [&>button]:border-border [&>button:hover]:bg-muted rounded-lg overflow-hidden"
                        showInteractive={false}
                    >
                        <ControlButton onClick={() => setInteractionMode('pan')} title="Mover (Mãozinha)">
                            <Hand className={interactionMode === 'pan' ? 'text-primary' : 'text-muted-foreground'} style={{ width: 14, height: 14, strokeWidth: 2.5 }} color="currentColor" />
                        </ControlButton>
                        <ControlButton onClick={() => setInteractionMode('select')} title="Lasso (Seleção)">
                            <MousePointer2 className={interactionMode === 'select' ? 'text-primary' : 'text-muted-foreground'} style={{ width: 14, height: 14, strokeWidth: 2.5 }} color="currentColor" />
                        </ControlButton>
                    </Controls>
                    <MiniMap
                        nodeStrokeColor="hsl(var(--primary))"
                        nodeColor="hsl(var(--card))"
                        maskColor="hsl(var(--background) / 0.7)"
                        className="bg-card border border-border shadow-xl rounded-xl overflow-hidden"
                    />
                </ReactFlow>

                {/* Empty state overlay indicator */}
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none fade-in">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                            <Activity className="w-10 h-10 text-primary opacity-50" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">Storyboard Canvas Avançado</h2>
                        <p className="text-muted-foreground max-w-md text-center">
                            Arraste Trackers, Páginas, Tabelas ou Métricas. Conecte as origens às estruturas de dados para analisar a performance no período selecionado no topo.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const StoryboardCanvas = () => {
    return (
        <ReactFlowProvider>
            <StoryboardCanvasContent />
        </ReactFlowProvider>
    );
};

export default StoryboardCanvas;
