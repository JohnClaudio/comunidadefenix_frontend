// ─── Segment Insights Types ─────────────────────────────────

export interface SegmentRow {
    segment_key: string;
    segment_data: Record<string, any>;
    extra_metrics: Record<string, number> | null;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    ctr_percent: number;
    avg_cpc: number;
    cpm: number;
}

export type SegmentType =
    | 'device'
    | 'gender'
    | 'age_range'
    | 'audience'
    | 'keyword'
    | 'placement'
    | 'hour_of_day'
    | 'day_of_week'
    | 'location'
    | 'ad'
    | 'search_term'
    | 'video'
    | 'asset'
    | 'labels'
    | 'pmax_asset_group'
    | 'pmax_asset'
    | 'display_creative'
    | 'demand_gen_creative';

export interface SegmentInsightsRequest {
    segment_types: SegmentType[];
    start_date: string;
    end_date: string;
    google_ads_account_id?: number;
    google_ads_campaign_id?: number;
    tracker_id?: number;
}

export interface SegmentInsightsResponse {
    ok: boolean;
    filters: {
        start_date: string;
        end_date: string;
    };
    data: Partial<Record<SegmentType, SegmentRow[]>>;
}
