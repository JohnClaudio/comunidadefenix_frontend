import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, Globe, Minus as MinusIcon } from 'lucide-react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { TopCountrySale } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';
import { useTheme } from '@/components/ThemeProvider';

interface TopCountriesCardProps {
  countries: TopCountrySale[];
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const getFlagUrl = (iso: string) => `https://flagcdn.com/w40/${iso?.toLowerCase() || 'un'}.png`;

const TopCountriesCard: React.FC<TopCountriesCardProps> = ({ countries }) => {
  const [position, setPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 });
  const { theme } = useTheme();

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleMoveEnd = (position: { coordinates: [number, number], zoom: number }) => {
    setPosition(position);
  };

  const formatAmount = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`; // Match '50,209K' style
    }
    return value.toString();
  };

  const formatTotalAmount = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value) + 'k';
  };

  const totalAmount = countries.reduce((sum, c) => sum + c.amount, 0);

  const countriesWithShare = countries.map(c => ({
    ...c,
    share: totalAmount > 0 ? (c.amount / totalAmount) * 100 : 0
  })).slice(0, 5);

  const getTrendIcon = (trend: string, className?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className={cn("h-4 w-4", className)} strokeWidth={2.5} />;
      case 'down': return <TrendingDown className={cn("h-4 w-4", className)} strokeWidth={2.5} />;
      default: return <Minus className={cn("h-4 w-4", className)} strokeWidth={2.5} />;
    }
  };

  const activeCountriesIsos = countries.map(c => c.iso.toUpperCase());

  const nameMappings: Record<string, string> = {
    'united states': 'united states of america',
    'usa': 'united states of america',
    'us': 'united states of america',
    'uk': 'united kingdom',
    'great britain': 'united kingdom',
    'uae': 'united arab emirates'
  };

  const normalizeName = (name: string) => {
    const lower = name.toLowerCase();
    return nameMappings[lower] || lower;
  };

  const activeCountriesNames = countries.map(c => normalizeName(c.country));

  return (
    <div className="bg-card rounded-[24px] shadow-sm border border-border/40 p-6 md:p-8 h-full">
      <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-8">Países Top Vendas</h3>

      {countries.length > 0 ? (
        <div className="grid grid-cols-1 2xl:grid-cols-[1.3fr_1fr] gap-8 items-start h-full pb-4">

          {/* Coluna 1: Mapa e Totais */}
          <div className="flex flex-col h-full relative">

            {/* Controles de Zoom */}
            <div className="absolute top-0 left-0 flex flex-col gap-1 z-10">
              <button onClick={handleZoomIn} className="bg-slate-800 text-white rounded p-1 hover:bg-slate-700 transition-colors">
                <Plus size={14} strokeWidth={3} />
              </button>
              <button onClick={handleZoomOut} className="bg-slate-800 text-white rounded p-1 hover:bg-slate-700 transition-colors">
                <MinusIcon size={14} strokeWidth={3} />
              </button>
            </div>

            {/* Mapa Corrigido */}
            <div className="w-full h-[240px] mb-8 relative flex items-center justify-center">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 130 }}
                width={800}
                height={400}
                style={{ width: "100%", height: "100%" }}
              >
                <ZoomableGroup
                  zoom={position.zoom}
                  center={position.coordinates}
                  onMoveEnd={handleMoveEnd}
                  minZoom={1}
                  maxZoom={4}
                >
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const geoName = normalizeName(geo.properties.name || '');
                        const isHighlighted = activeCountriesIsos.includes(geo.properties.iso_a2) ||
                          activeCountriesIsos.includes(geo.id) ||
                          activeCountriesNames.includes(geoName);

                        // Theme-aware colors
                        const defaultFill = isDark ? "#1e293b" : "#e2e8f0"; // slate-800 vs slate-200
                        const defaultStroke = isDark ? "#334155" : "#ffffff"; // slate-700 vs white
                        const activeFill = isDark ? "#0d9488" : "#0f766e"; // teal-600 vs teal-700

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={isHighlighted ? activeFill : defaultFill}
                            stroke={defaultStroke}
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { fill: "#14b8a6", outline: "none" }, // teal-500
                              pressed: { outline: "none" },
                            }}
                          />
                        )
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>

            {/* Total Footer */}
            <div className="flex items-center gap-4 mt-auto">
              <span className="text-4xl font-bold tracking-tight text-slate-700 dark:text-slate-200">
                <AnimatedNumber value={totalAmount} formatFn={formatTotalAmount} duration={2000} />
              </span>
              <span className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
                  +1.5%
                </span>
                <span className="text-sm font-medium text-slate-500">Último Mês</span>
              </span>
            </div>
          </div>

          {/* Coluna 2: Lista Rankeada */}
          <div className="flex flex-col gap-6 pt-2">
            {countriesWithShare.map((country, index) => {
              const isUp = country.trend === 'up' || country.trend !== 'down';
              return (
                <div
                  key={country.iso || index}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={getFlagUrl(country.iso)}
                      alt={country.country}
                      className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-border/20"
                      onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }}
                    />
                    <div>
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 text-base">{country.country}</h4>
                      <p className="text-sm font-medium text-slate-500">
                        <AnimatedNumber value={country.amount} formatFn={formatAmount} duration={2000} />
                      </p>
                    </div>
                  </div>

                  <div className={cn(
                    "flex items-center gap-1 font-bold text-[1.1rem]",
                    isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  )}>
                    <AnimatedNumber value={country.share} formatFn={(val) => val.toFixed(1)} duration={2000} />%
                    {getTrendIcon(isUp ? 'up' : 'down', "ml-1")}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Globe className="h-10 w-10 text-slate-400 mb-3" />
          <p className="text-slate-500 font-medium">Sem dados de países no período</p>
        </div>
      )}
    </div>
  );
};

export { TopCountriesCard };
