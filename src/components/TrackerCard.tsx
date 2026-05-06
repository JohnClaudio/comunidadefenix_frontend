import React from 'react';
import { Tracker } from '@/types/tracker';
import { Crosshair, Edit2, Trash2, Copy, ShieldCheck, Zap, BarChart2, Link as LinkIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DecryptedText } from '@/components/DecryptedText';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface TrackerCardProps {
  tracker: Tracker;
  onEdit: (tracker: Tracker) => void;
  onDelete: (tracker: Tracker) => void;
  onLinkCampaigns?: (tracker: Tracker) => void;
  onViewCampaigns?: (tracker: Tracker) => void;
}

const TrackerCard: React.FC<TrackerCardProps> = ({ tracker, onEdit, onDelete, onLinkCampaigns, onViewCampaigns }) => {
  const { toast } = useToast();
  const { isPrivacyMode } = usePrivacy();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: `${label} copiado na área de transferência.` });
  };

  const isRobust = tracker.checkout_type === 'robust';

  // Script completo que o usuário deve colar na página dele
  const scriptTag = `<script async src="https://sonhosfuncionando.com.br/api/client/${tracker.uuid}"></script>`;

  return (
    <div className="group relative bg-card border border-border/60 hover:border-primary/40 rounded-2xl p-5 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.2)] transition-all duration-300 overflow-hidden isolate">
      {/* Background Gradient Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

      {/* Header Section */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative">
            {tracker.platform ? (
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner p-2">
                <img
                  src={tracker.platform.logo}
                  alt={tracker.platform.name}
                  className="w-full h-full object-contain drop-shadow-md"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center shrink-0">
                <Crosshair className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
            )}

            {/* Status Dot */}
            <div className={cn(
              "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card flex items-center justify-center z-10",
              tracker.active ? "bg-emerald-500" : "bg-red-500"
            )}>
              {tracker.active && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className={cn(
              "font-semibold truncate text-base leading-tight",
              isPrivacyMode ? "blur-md select-none" : "text-foreground"
            )}>
              <DecryptedText value={tracker.name} />
            </h3>
            {tracker.platform && (
              <p className={cn(
                "text-xs font-medium mt-0.5",
                isPrivacyMode ? "blur-sm select-none" : "text-muted-foreground"
              )}>
                {tracker.platform.name}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Badge de Plataforma (se necessário) ou Status */}
      <div className="mb-4 flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "px-2 py-0.5 text-[10px] gap-1.5 flex items-center rounded-full border border-primary/20 bg-primary/5 text-primary"
          )}
        >
          <ShieldCheck className="w-3 h-3" />
          Agrupador de Campanhas
        </Badge>
      </div>

      {/* Grid Dados (Métricas Financeiras e Quantitativas) */}
      <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-xl bg-secondary/30">
        <div className="min-w-0 col-span-2 flex items-center justify-between border-b border-border/50 pb-3 mb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campanhas Vinculadas</p>
          <p className="text-sm font-bold text-foreground">
            {tracker.campaigns_count || 0}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><BarChart2 className="w-3 h-3" /> Custo (30d)</p>
          <p className="text-sm font-bold text-rose-500 truncate">
            {tracker.total_cost ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tracker.total_cost) : 'R$ 0,00'}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Lucro (30d)</p>
          <p className={cn(
            "text-sm font-bold truncate",
            (tracker.total_profit || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {tracker.total_profit ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tracker.total_profit) : 'R$ 0,00'}
          </p>
        </div>
      </div>

      {/* Actions (Hidden until hover on desktop) */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/5 opacity-100 md:opacity-0 md:-translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        <div className="flex gap-2">
          {onLinkCampaigns && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onLinkCampaigns(tracker)}
              className="flex-1 gap-2 h-8 text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Vincular
            </Button>
          )}
          {onViewCampaigns && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewCampaigns(tracker)}
              className="flex-1 gap-2 h-8 text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-0"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver Campanhas
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(tracker)}
            className="flex-1 gap-2 h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 border-0"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(tracker)}
            className="text-destructive/80 hover:text-destructive hover:bg-destructive/10 h-8 px-3"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrackerCard;
