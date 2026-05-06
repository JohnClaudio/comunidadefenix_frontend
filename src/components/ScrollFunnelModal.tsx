import React, { useEffect, useState } from 'react';
import { TrendingDown, Users, Activity, BarChart2, CornerDownRight, X, ChevronRight } from 'lucide-react';
import { fetchScrollAnalytics } from '@/services/api';
import { ScrollAnalyticsData, Tracker } from '@/types/tracker';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DecryptedText } from '@/components/DecryptedText';
import { Button } from '@/components/ui/button';

interface ScrollFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracker: Tracker | null;
}

const STAGES = [
  { key: 'reached_25',  label: 'Acesso (0-25%)', sublabel: 'Iniciaram a leitura' },
  { key: 'reached_50',  label: 'Engajamento (25-50%)', sublabel: 'Passaram da primeira dobra' },
  { key: 'reached_75',  label: 'Aprofundamento (50-75%)', sublabel: 'Leram a maior parte' },
  { key: 'reached_100', label: 'Conclusão (75-100%)', sublabel: 'Chegaram ao final' },
] as const;

export default function ScrollFunnelModal({ isOpen, onClose, tracker }: ScrollFunnelModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScrollAnalyticsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && tracker && token) {
      setLoading(true);
      setError('');
      setData(null);
      fetchScrollAnalytics(token, tracker.id)
        .then(res => setData(res.data))
        .catch(err => setError(err.message || 'Erro ao carregar dados.'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, tracker, token]);

  if (!tracker) return null;

  const total = data?.total_visitors ?? 0;

  const stagesWithData = STAGES.map(s => ({
    ...s,
    count: data ? (data[s.key as keyof ScrollAnalyticsData] as number) : 0,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-card border border-border/50 p-0 overflow-hidden shadow-2xl rounded-xl">
        
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b border-border/50 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Funil de Scroll
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-primary/90 font-medium">
                  <DecryptedText value={tracker.name} />
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando métricas...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <TrendingDown className="w-8 h-8 text-destructive/60" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : !data || total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Aguardando dados</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Eventos de scroll serão exibidos aqui assim que as primeiras visitas ocorrerem.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* KPIs Minimizados */}
              <div className="flex gap-4 p-4 rounded-lg border border-border/40 bg-secondary/20">
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Total de Visitantes
                  </p>
                  <p className="text-2xl font-bold text-foreground leading-none">
                    {total.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="w-px bg-border/50 mx-2" />
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Taxa de Conclusão
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-foreground leading-none">
                      {total > 0 ? Math.round((data.reached_100 / total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      chegaram ao fim
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista do Funil Clássica (Estilo SaaS Profissional) */}
              <div className="space-y-4 pt-2">
                {stagesWithData.map((stage, i) => {
                  const percentage = total > 0 ? Math.round((stage.count / total) * 100) : 0;
                  const prevStage = stagesWithData[i - 1];
                  // Calcula o drop-off com base NA ETAPA ANTERIOR
                  const dropOff = prevStage && prevStage.count > 0
                    ? Math.round(((prevStage.count - stage.count) / prevStage.count) * 100)
                    : null;

                  return (
                    <div key={stage.key} className="relative">
                      {/* Indicação de Drop-off entre linhas */}
                      {i > 0 && dropOff !== null && dropOff > 0 && (
                        <div className="absolute -top-3 right-0 pr-2 flex items-center gap-1.5 text-destructive/80 text-[10px] font-medium z-10">
                          <CornerDownRight className="w-3 h-3" />
                          <span>{dropOff}% saíram</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 group">
                        {/* Info (Esquerda) */}
                        <div className="w-[180px] flex-shrink-0">
                          <p className="text-sm font-medium text-foreground">{stage.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">
                              {stage.count.toLocaleString('pt-BR')} visitantes
                            </span>
                          </div>
                        </div>

                        {/* Barra */}
                        <div className="flex-1 relative flex items-center h-8">
                          {/* Fundo leve (100%) */}
                          <div className="absolute inset-x-0 h-6 bg-secondary/40 rounded-sm overflow-hidden border border-border/30">
                            {/* Preenchimento (%) */}
                            <div 
                              className="h-full bg-primary/20 border-r border-primary/30 transition-all duration-700 ease-out"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          
                          {/* Texto de Porcentagem (Absoluta) flutuando sobre a barra ou ao lado */}
                          <span 
                            className={cn(
                              "absolute text-xs font-semibold drop-shadow-sm", 
                              percentage > 12 ? "text-primary-foreground" : "text-foreground/80"
                            )}
                            style={{ 
                              left: percentage > 12 ? `calc(${percentage}% - 38px)` : '8px',
                            }}
                          >
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
