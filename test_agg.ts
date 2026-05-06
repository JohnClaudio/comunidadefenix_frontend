import { aggregateSegmentRows } from "./src/lib/googleAdsUtils"; 
console.log(aggregateSegmentRows([
    {impressions: 100, clicks: 0, cost: 0, conversions: 0, conversion_value: 0, segment_key: "MALE", segment_data: {type: "MALE"}}, 
    {impressions: 50, clicks: 0, cost: 0, conversions: 0, conversion_value: 0, segment_key: "MALE", segment_data: {type: "MALE"}}
] as any, (r: any) => r.segment_key));
