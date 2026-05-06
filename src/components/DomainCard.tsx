import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Globe, Server, CheckCircle2, Clock, AlertCircle, Copy } from 'lucide-react';
import { Domain } from '@/types/domain';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface DomainCardProps {
  domain: Domain;
  onVerify: (domain: Domain) => void;
  onDelete: (domain: Domain) => void;
  isVerifying?: boolean;
  isDeleting?: boolean;
}

const DomainCard: React.FC<DomainCardProps> = ({
  domain,
  onVerify,
  onDelete,
  isVerifying,
  isDeleting
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Ativo',
          icon: CheckCircle2,
          className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        };
      case 'pending':
        return {
          label: 'Pendente',
          icon: Clock,
          className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        };
      case 'error':
        return {
          label: 'Erro',
          icon: AlertCircle,
          className: 'bg-destructive/10 text-destructive border-destructive/20',
        };
      default:
        return {
          label: status,
          icon: Clock,
          className: 'bg-muted text-muted-foreground',
        };
    }
  };

  const statusConfig = getStatusConfig(domain.status);
  const StatusIcon = statusConfig.icon;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <Card className="bg-card border-border/60 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.2)] hover:-translate-y-1 transition-all duration-300 group isolate overflow-hidden relative">
      {/* Background Gradient Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      <CardContent className="p-6 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">{domain.name}</h3>
              <p className="text-xs text-muted-foreground">Zona gerenciada na Cloudflare</p>
            </div>
          </div>

          <Badge variant="outline" className={`${statusConfig.className} gap-1.5`}>
            <StatusIcon size={12} />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Nameservers */}
        {domain.cloudflare_nameservers && domain.cloudflare_nameservers.length > 0 && (
          <div className="mb-5 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Server size={12} />
              <span>Nameservers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {domain.cloudflare_nameservers.map((ns, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => copyToClipboard(ns)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 hover:bg-secondary border border-border rounded-lg text-xs font-mono text-foreground transition-colors cursor-pointer"
                    >
                      {ns}
                      <Copy size={10} className="text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clique para copiar</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onVerify(domain)}
            disabled={isVerifying}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={isVerifying ? 'animate-spin' : ''} />
            Verificar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(domain)}
            disabled={isDeleting}
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50"
          >
            <Trash2 size={14} />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DomainCard;
