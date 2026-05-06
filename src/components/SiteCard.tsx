import React from 'react';
import { Site } from '@/types/site';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2, ExternalLink, ImageOff, Sparkles, FileText, Loader2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SiteCardProps {
  site: Site;
  onView: (site: Site) => void;
  onEdit: (site: Site) => void;
  onConfig: (site: Site) => void;
  onDelete: (site: Site) => void;
}

const SiteCard: React.FC<SiteCardProps> = ({
  site,
  onView,
  onEdit,
  onConfig,
  onDelete,
}) => {
  const hasImage = site.desk_image;
  const isAiBuilder = site.type === 'ai_builder';
  const isGenerating = isAiBuilder && (site.landing_status === 'pending' || site.landing_status === 'generating');

  return (
    <div className="group relative bg-card border border-border/60 hover:border-primary/40 rounded-xl overflow-hidden hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.2)] transition-all duration-300 isolate">
      {/* Background Gradient Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      {/* Image Preview */}
      <div className="relative aspect-video bg-secondary/30 overflow-hidden">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/50 gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium text-center px-4">{site.ai_progress || 'Gerando com IA...'}</p>
          </div>
        ) : hasImage ? (
          <img
            src={site.desk_image!}
            alt={site.name || site.slug}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {!isGenerating && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-secondary/50",
            hasImage && "hidden"
          )}>
            <ImageOff className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Type + Language Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <Badge variant={isAiBuilder ? 'default' : 'secondary'} className="gap-1 text-xs">
            {isAiBuilder ? <Sparkles size={10} /> : <FileText size={10} />}
            {isAiBuilder ? 'AI' : 'Pre-Sell'}
          </Badge>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-background/80 text-foreground backdrop-blur-sm uppercase">
            {site.accept_language || 'PT'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground text-lg truncate">
            {site.name || site.slug}
          </h3>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5" title={site.slug ? `${site.host}/${site.slug}` : site.host}>
            <ExternalLink size={12} />
            {site.slug ? `${site.host}/${site.slug}` : site.host}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(site)}
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
            disabled={isGenerating}
          >
            <Eye size={14} />
            Ver
          </Button>

          <div className="flex gap-1">
            {isAiBuilder && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onConfig(site)}
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                title="Configurações da Página"
              >
                <Settings size={14} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(site)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(site)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteCard;
