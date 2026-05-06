import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Globe } from 'lucide-react';
import { TopCountrySale } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';
import { useTheme } from '@/components/ThemeProvider';

interface GlobeCountriesCardProps {
    countries: TopCountrySale[];
}

const getFlagUrl = (iso: string) => `https://flagcdn.com/w40/${iso?.toLowerCase() || 'un'}.png`;

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
    BR: { lat: -14.2, lng: -51.9 }, US: { lat: 37.1, lng: -95.7 },
    GB: { lat: 55.4, lng: -3.4 }, CA: { lat: 56.1, lng: -106.3 },
    DE: { lat: 51.2, lng: 10.4 }, FR: { lat: 46.2, lng: 2.2 },
    PT: { lat: 39.4, lng: -8.2 }, ES: { lat: 40.5, lng: -3.7 },
    IT: { lat: 41.9, lng: 12.6 }, JP: { lat: 36.2, lng: 138.3 },
    AU: { lat: -25.3, lng: 133.8 }, MX: { lat: 23.6, lng: -102.6 },
    AR: { lat: -38.4, lng: -63.6 }, CL: { lat: -35.7, lng: -71.5 },
    CO: { lat: 4.6, lng: -74.3 }, PE: { lat: -9.2, lng: -75.0 },
    IN: { lat: 20.6, lng: 78.9 }, CN: { lat: 35.9, lng: 104.2 },
    RU: { lat: 61.5, lng: 105.3 }, ZA: { lat: -30.6, lng: 22.9 },
    NG: { lat: 9.1, lng: 8.7 }, AE: { lat: 23.4, lng: 53.8 },
    KR: { lat: 35.9, lng: 127.8 }, ID: { lat: -0.8, lng: 113.9 },
    MY: { lat: 4.2, lng: 101.9 }, SG: { lat: 1.4, lng: 103.8 },
    AO: { lat: -11.2, lng: 17.9 }, MZ: { lat: -18.7, lng: 35.5 },
};

const BUBBLE_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#f43f5e', '#a855f7', '#eab308'];
const PRIMARY_COLOR = '#5b6cf9';
const GEO_JSON_URL = 'https://unpkg.com/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson';

// ─── Module-level cache to avoid re-fetching GeoJSON ───────────────────────
let cachedGeoJson: any = null;
let geoJsonPromise: Promise<any> | null = null;

function fetchGeoJson(): Promise<any> {
    if (cachedGeoJson) return Promise.resolve(cachedGeoJson);
    if (geoJsonPromise) return geoJsonPromise;
    geoJsonPromise = fetch(GEO_JSON_URL)
        .then(r => r.json())
        .then(data => { cachedGeoJson = data; return data; })
        .catch(() => { geoJsonPromise = null; return null; });
    return geoJsonPromise;
}

// ─── Static arcs – created once per session, never change ──────────────────
const STATIC_ARCS = Array.from({ length: 10 }).map(() => ({
    startLat: (Math.random() - 0.5) * 160,
    startLng: (Math.random() - 0.5) * 360,
    endLat:   (Math.random() - 0.5) * 160,
    endLng:   (Math.random() - 0.5) * 360,
}));

// ─── Build reusable SVG globe texture ─────────────────────────────────────
function buildGlobeTexture(isDark: boolean): string {
    const hexColor = isDark ? 'rgba(91,108,249,0.25)' : 'rgba(91,108,249,0.15)';
    const bgColor  = isDark ? 'rgba(15,23,42,0.85)'  : 'rgba(241,245,249,0.85)';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='80' height='80' fill='${bgColor}'/><path d='M40 10 L70 25 L70 55 L40 70 L10 55 L10 25 Z' fill='none' stroke='${hexColor}' stroke-width='0.5'/><circle cx='40' cy='40' r='0.8' fill='${hexColor}' opacity='0.3'/></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const GlobeCountriesCard: React.FC<GlobeCountriesCardProps> = ({ countries }) => {
    const containerRef   = useRef<HTMLDivElement>(null);
    const globeWrapRef   = useRef<HTMLDivElement>(null);
    const globeRef       = useRef<any>(null);
    const isVisibleRef   = useRef(false);
    const initDoneRef    = useRef(false);
    const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { theme } = useTheme();

    const isDark = useMemo(() =>
        theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    , [theme]);

    // ── Normalise countries data ──────────────────────────────────────────
    const safeCountries = Array.isArray(countries) ? countries : [];
    const isMockData    = safeCountries.length === 0;

    const displayCountries: TopCountrySale[] = isMockData ? [
        { iso: 'US', country: 'Estados Unidos', amount: 0, sales_count: 0, trend: 'neutral', change_pct: 0 },
        { iso: 'BR', country: 'Brasil',          amount: 0, sales_count: 0, trend: 'neutral', change_pct: 0 },
        { iso: 'IT', country: 'Itália',           amount: 0, sales_count: 0, trend: 'neutral', change_pct: 0 },
        { iso: 'GB', country: 'Reino Unido',      amount: 0, sales_count: 0, trend: 'neutral', change_pct: 0 },
        { iso: 'AU', country: 'Austrália',         amount: 0, sales_count: 0, trend: 'neutral', change_pct: 0 },
    ] : safeCountries;

    const getCount = useCallback((c: TopCountrySale) =>
        (c.sales_count && c.sales_count > 0) ? c.sales_count : Math.round(c.amount) || 0,
    []);

    const totalSalesCount = useMemo(() =>
        displayCountries.reduce((s, c) => s + getCount(c), 0),
    [displayCountries, getCount]);

    const countriesWithShare = useMemo(() => {
        return displayCountries.map(c => ({
            ...c,
            _count: getCount(c),
            share: totalSalesCount > 0 ? (getCount(c) / totalSalesCount) * 100 : 0,
        })).slice(0, 5);
    }, [displayCountries, totalSalesCount, getCount]);

    const activeIsos = useMemo(() =>
        displayCountries.map(c => c.iso.toUpperCase()),
    [displayCountries]);

    // ── HTML bubble data ───────────────────────────────────────────────────
    const htmlData = useMemo(() => {
        if (!displayCountries.length) return [];
        const maxCount = Math.max(...displayCountries.map(c => getCount(c)), 1);
        return displayCountries
            .filter(c => COUNTRY_COORDS[c.iso.toUpperCase()])
            .map((c, i) => {
                const coords = COUNTRY_COORDS[c.iso.toUpperCase()];
                const count  = getCount(c);
                const sz     = 24 + (count / maxCount) * 20;
                return { lat: coords.lat, lng: coords.lng, size: sz, color: BUBBLE_COLORS[i % BUBBLE_COLORS.length], count, country: c.country };
            });
    }, [displayCountries, getCount]);

    // ── Build HTML bubble element (no deps, stable fn) ────────────────────
    const buildBubbleEl = useCallback((d: any, isDarkMode: boolean) => {
        const el    = document.createElement('div');
        el.style.cssText = 'position:relative;width:0;height:0;';
        const inner = document.createElement('div');
        const sz    = d.size;
        const fs    = sz > 36 ? 12 : sz > 28 ? 10 : 9;
        inner.style.cssText = `
            position:absolute;left:-${sz/2}px;top:-${sz/2}px;
            width:${sz}px;height:${sz}px;border-radius:50%;
            background:${isDarkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)'};
            border:2px solid ${d.color};
            box-shadow:0 0 16px ${d.color}55;
            display:flex;align-items:center;justify-content:center;
            color:${isDarkMode ? 'white' : '#1e3a8a'};
            font-size:${fs}px;font-weight:900;
            backdrop-filter:blur(4px);
            z-index:20;
        `;
        const span = document.createElement('span');
        span.textContent = `${d.count}`;
        inner.appendChild(span);
        el.appendChild(inner);
        return el;
    }, []);

    // ── Apply polygons + arcs to existing globe instance ─────────────────
    const applyPolygons = useCallback((globe: any, geoJson: any, isos: string[]) => {
        if (!globe || !geoJson?.features) return;
        const inactive = 'rgba(91,108,249,0.15)';
        globe
            .polygonsData(geoJson.features)
            .polygonCapColor((d: any) => {
                const iso = d.properties?.ISO_A2 || d.properties?.iso_a2;
                return isos.includes(iso?.toUpperCase()) ? PRIMARY_COLOR : inactive;
            })
            .polygonSideColor(() => 'rgba(0,0,0,0)')
            .polygonStrokeColor((d: any) => {
                const iso = d.properties?.ISO_A2 || d.properties?.iso_a2;
                return isos.includes(iso?.toUpperCase()) ? PRIMARY_COLOR : 'rgba(91,108,249,0.3)';
            })
            .polygonAltitude((d: any) => {
                const iso = d.properties?.ISO_A2 || d.properties?.iso_a2;
                return isos.includes(iso?.toUpperCase()) ? 0.02 : 0.005;
            })
            .arcsData(STATIC_ARCS)
            .arcColor(() => PRIMARY_COLOR)
            .arcDashLength(0.4)
            .arcDashGap(4)
            .arcDashInitialGap(() => Math.random() * 5)
            .arcDashAnimateTime(2500)
            .arcAltitude(0.3);
    }, []);

    // ── Lazy globe initialisation (only when visible) ────────────────────
    const initGlobe = useCallback(async () => {
        if (initDoneRef.current || !globeWrapRef.current) return;
        initDoneRef.current = true;

        const geoJson = await fetchGeoJson();
        if (!geoJson || !globeWrapRef.current) return;

        const { default: Globe3D } = await import('globe.gl');

        const container = globeWrapRef.current;
        const width  = container.clientWidth;
        const height = 320;

        const globe = new Globe3D(container)
            .width(width)
            .height(height)
            .backgroundColor('rgba(0,0,0,0)')
            .globeImageUrl(buildGlobeTexture(isDark))
            .showGlobe(true)
            .showAtmosphere(true)
            .atmosphereColor(isDark ? '#3b82f6' : '#60a5fa')
            .atmosphereAltitude(0.2)
            .pointOfView({ lat: 10, lng: -30, altitude: 2.3 })
            .htmlAltitude(0.08)
            .enablePointerInteraction(false); // ← disabled = major perf win

        const controls = globe.controls() as any;
        if (controls) {
            controls.autoRotate      = true;
            controls.autoRotateSpeed = 0.4;
            controls.enableZoom      = false;
            controls.enablePan       = false;
        }

        const mat = globe.globeMaterial();
        if (mat) mat.transparent = true;

        applyPolygons(globe, geoJson, activeIsos);

        globe.htmlElementsData(htmlData);
        globe.htmlElement((d: any) => buildBubbleEl(d, isDark));

        globeRef.current = globe;
    }, [isDark, activeIsos, htmlData, applyPolygons, buildBubbleEl]);

    // ── IntersectionObserver – only mount globe when card enters viewport ─
    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisibleRef.current) {
                    isVisibleRef.current = true;
                    initGlobe();
                }
            },
            { threshold: 0.1 }
        );
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, [initGlobe]);

    // ── Update globe when theme changes (after init) ─────────────────────
    useEffect(() => {
        const globe = globeRef.current;
        if (!globe || !initDoneRef.current) return;
        const url = buildGlobeTexture(isDark);
        if (globe.globeImageUrl() !== url) globe.globeImageUrl(url);
        globe.atmosphereColor(isDark ? 'rgba(91,108,249,0.5)' : 'rgba(91,108,249,0.8)');
        globe.htmlElement((d: any) => buildBubbleEl(d, isDark));
    }, [isDark, buildBubbleEl]);

    // ── Update bubbles when countries change ─────────────────────────────
    useEffect(() => {
        const globe = globeRef.current;
        if (!globe || !initDoneRef.current) return;
        globe.htmlElementsData(htmlData);
        globe.htmlElement((d: any) => buildBubbleEl(d, isDark));
        // also re-highlight polygons
        if (cachedGeoJson) applyPolygons(globe, cachedGeoJson, activeIsos);
    }, [htmlData, activeIsos, isDark, buildBubbleEl, applyPolygons]);

    // ── Debounced resize handler ──────────────────────────────────────────
    useEffect(() => {
        const handle = () => {
            if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
            resizeTimerRef.current = setTimeout(() => {
                if (globeRef.current && globeWrapRef.current) {
                    globeRef.current.width(globeWrapRef.current.clientWidth);
                }
            }, 150);
        };
        window.addEventListener('resize', handle, { passive: true });
        return () => {
            window.removeEventListener('resize', handle);
            if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        };
    }, []);

    // ── Cleanup on unmount ────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (globeRef.current) {
                try {
                    const renderer = globeRef.current.renderer?.();
                    if (renderer) renderer.dispose();
                } catch (_) {}
                if (globeWrapRef.current) {
                    while (globeWrapRef.current.firstChild)
                        globeWrapRef.current.removeChild(globeWrapRef.current.firstChild);
                }
                globeRef.current  = null;
                initDoneRef.current = false;
            }
        };
    }, []);

    const getTrendIcon = (trend: string, className?: string) => {
        switch (trend) {
            case 'up':   return <TrendingUp   className={cn('h-4 w-4', className)} strokeWidth={2.5} />;
            case 'down': return <TrendingDown className={cn('h-4 w-4', className)} strokeWidth={2.5} />;
            default:     return <Minus        className={cn('h-4 w-4', className)} strokeWidth={2.5} />;
        }
    };

    const formatTotal = (v: number) => new Intl.NumberFormat('en-US').format(Math.round(v));

    return (
        <div ref={containerRef} className="bg-card rounded-[24px] shadow-sm border border-border/40 p-6 md:p-8 h-full">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse-ring { 0%{transform:scale(.33);opacity:0} 80%,100%{opacity:0} }
            `}} />
            <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Métricas Geográficas</h3>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-[1.3fr_1fr] gap-10 items-start h-full pb-4">

                {/* Globe column */}
                <div className="flex flex-col h-full relative">
                    <div ref={globeWrapRef} className="w-full h-[320px] mb-4 relative overflow-hidden rounded-2xl" />

                    {/* Totals footer */}
                    <div className="flex items-center gap-4 mt-auto">
                        <span className="text-4xl font-bold tracking-tight text-slate-700 dark:text-slate-200">
                            <AnimatedNumber value={totalSalesCount} formatFn={formatTotal} duration={1800} />
                        </span>
                        <span className="text-sm font-medium text-slate-500 ml-1">vendas totais</span>
                    </div>
                </div>

                {/* Ranking column */}
                <div className="flex flex-col gap-6 pt-2">
                    {countriesWithShare.length > 0 ? countriesWithShare.map((country, index) => {
                        const isUp = country.trend !== 'down';
                        return (
                            <div key={country.iso || index} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: BUBBLE_COLORS[index % BUBBLE_COLORS.length] }} />
                                    <img
                                        src={getFlagUrl(country.iso)}
                                        alt={country.country}
                                        loading="lazy"
                                        className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-border/20"
                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    <div>
                                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-base">{country.country}</h4>
                                        <p className="text-sm font-medium text-slate-500">
                                            {country._count} vendas
                                        </p>
                                    </div>
                                </div>

                                <div className={cn(
                                    'flex items-center gap-1 font-bold text-[1.1rem]',
                                    isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                                )}>
                                    <AnimatedNumber value={country.share} formatFn={(v) => v.toFixed(1)} duration={1800} />%
                                    {getTrendIcon(isUp ? 'up' : 'down', 'ml-1')}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Globe className="h-10 w-10 text-slate-400 mb-3" />
                            <p className="text-slate-500 font-medium">Sem dados de países no período</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export { GlobeCountriesCard };
