import React, { useState, useCallback, useRef } from 'react';
import {
  Globe,
  Clock,
  MapPin,
  Monitor,
  Link as LinkIcon,
  ArrowRight,
  Smartphone,
  ShoppingCart,
  DollarSign,
  User,
  Megaphone,
  AlertTriangle,
  Shield,
  Sparkles,
  Play,
  Loader2
} from 'lucide-react';
import { Visitor } from '@/types/visitor';
import { useAuth } from '@/contexts/AuthContext';
import { fetchVisitorDetail, generateVisitorInsight } from '@/services/api';
import VisitorReplayModal from '@/components/VisitorReplayModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Helper for event translations and colors
const getEventDisplay = (event: any) => {
  const type = event.type?.toLowerCase() || '';

  switch (type) {
    case 'pageview':
      return { label: 'Página vista', colorClass: 'bg-blue-500/10 text-blue-500' };
    case 'scroll':
      return {
        label: event.value ? `Rolagem (${event.value}%)` : 'Rolagem da tela',
        colorClass: 'bg-secondary text-muted-foreground' // Changed from amber to gray
      };
    case 'click_link':
    case 'click':
      return { label: 'Clique em Link', colorClass: 'bg-primary/10 text-primary' };
    case 'video_play':
      return { label: 'Vídeo Executado', colorClass: 'bg-indigo-500/10 text-indigo-500' };
    case 'video_progress':
      return {
        label: event.value ? `Progresso (${event.value}%)` : 'Progresso do Vídeo',
        colorClass: 'bg-purple-500/10 text-purple-500'
      };
    case 'time_on_page':
      return { label: 'Tempo na Página', colorClass: 'bg-teal-500/10 text-teal-500' };
    case 'form_submit':
      return { label: 'Formulário', colorClass: 'bg-emerald-500/10 text-emerald-500' };
    case 'checkout_init':
      return { label: 'Checkout Iniciado', colorClass: 'bg-pink-500/10 text-pink-500' };
    default:
      return { label: event.type, colorClass: 'bg-secondary text-muted-foreground' };
  }
};


interface VisitorCardProps {
  visitor: Visitor;
  onViewDetail?: (visitorId: number) => void;
}

// Status icon and color based on visitor status
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const statusLower = status.toLowerCase();

  if (statusLower === 'checkout') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <ShoppingCart size={20} className="text-blue-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Checkout</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (statusLower === 'venda' || statusLower === 'sale') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <DollarSign size={20} className="text-green-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Venda Realizada</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-10 h-10 rounded-full bg-secondary/50 dark:bg-secondary flex items-center justify-center">
          <User size={20} className="text-muted-foreground" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Visitante</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Country flag component
const CountryFlag: React.FC<{ iso: string; country: string | null }> = ({ iso, country }) => {
  if (!iso) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <img
          src={`https://flagcdn.com/24x18/${iso.toLowerCase()}.png`}
          alt={country || 'Unknown'}
          className="w-6 h-4 object-cover rounded-sm"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>{country || 'País desconhecido'}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Browser icon component
const BrowserIcon: React.FC<{ browser: string | null }> = ({ browser }) => {
  const browserLower = browser?.toLowerCase() || '';

  if (browserLower.includes('chrome')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" fill="#4285F4" />
            <circle cx="12" cy="12" r="4" fill="white" />
            <path d="M12 8 L21 8 A10 10 0 0 0 6 6 Z" fill="#EA4335" />
            <path d="M6.5 17 L12 8 L3 8 A10 10 0 0 0 6.5 17 Z" fill="#34A853" />
            <path d="M17.5 17 L12 8 L6.5 17 A10 10 0 0 0 17.5 17 Z" fill="#FBBC05" />
            <circle cx="12" cy="12" r="3" fill="white" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>Google Chrome</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (browserLower.includes('safari')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" fill="#006CFF" />
            <circle cx="12" cy="12" r="8" fill="white" />
            <polygon points="12,4 13,12 12,20 11,12" fill="#FF3B30" />
            <polygon points="4,12 12,11 20,12 12,13" fill="#FF3B30" />
            <circle cx="12" cy="12" r="1.5" fill="#006CFF" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>Safari</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (browserLower.includes('edge')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#0078D4" />
            <path d="M12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9-1.34-1.5-3.28-2.45-5.43-2.45-2.24 0-4.25 1.02-5.58 2.62A7.96 7.96 0 0 1 4 12c0-4.42 3.58-8 8-8z" fill="#50E6FF" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>Microsoft Edge</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (browserLower.includes('firefox')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" fill="#FF7139" />
            <circle cx="12" cy="12" r="6" fill="#FFBD4F" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>Firefox</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Globe size={18} className="text-muted-foreground flex-shrink-0" />
      </TooltipTrigger>
      <TooltipContent>
        <p>{browser || 'Navegador desconhecido'}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// OS icon component  
const OSIcon: React.FC<{ system: string | null }> = ({ system }) => {
  const systemLower = system?.toLowerCase() || '';

  if (systemLower.includes('ios') || systemLower.includes('mac')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 bg-gray-800 rounded">
            <svg width="12" height="14" viewBox="0 0 14 17" fill="white">
              <path d="M13.1 12.7c-.3.7-.7 1.4-1.2 2-.7 1-1.4 1.5-2.1 1.5-.4 0-1-.1-1.7-.4-.7-.3-1.3-.4-1.8-.4s-1.1.1-1.7.4c-.7.3-1.2.4-1.6.4-.8 0-1.6-.6-2.4-1.8C.9 13.5.5 12.4.5 11.3c0-1.2.3-2.2.9-3 .7-1 1.6-1.5 2.7-1.5.5 0 1.1.2 1.9.5.8.3 1.3.5 1.5.5.2 0 .7-.2 1.5-.5.8-.3 1.5-.5 2-.5 1.1 0 2 .4 2.7 1.3-.9.6-1.4 1.4-1.4 2.4 0 1.1.5 2 1.4 2.6l.4-.4zM10.5.3c0 .9-.3 1.7-.9 2.4-.7.9-1.6 1.4-2.5 1.3 0-.1 0-.2 0-.3 0-.8.4-1.7 1-2.3.3-.3.7-.6 1.2-.9.5-.2.9-.4 1.2-.4v.2z" />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{system || 'iOS/macOS'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (systemLower.includes('android')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#3DDC84" d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Android</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (systemLower.includes('windows')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <rect x="1" y="1" width="10" height="10" fill="#F25022" />
              <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
              <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
              <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Windows</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (systemLower.includes('linux')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Monitor size={18} className="text-yellow-400 flex-shrink-0" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Linux</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (systemLower.includes('chromeos')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" fill="#4285F4" />
            <circle cx="12" cy="12" r="4" fill="white" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>ChromeOS</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Monitor size={18} className="text-muted-foreground flex-shrink-0" />
      </TooltipTrigger>
      <TooltipContent>
        <p>{system || 'Sistema desconhecido'}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Source type icon with proper branding
const SourceIcon: React.FC<{ type: string }> = ({ type }) => {
  const typeLower = type.toLowerCase();

  if (typeLower.includes('google')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>Google</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (typeLower.includes('youtube')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
            <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>YouTube</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (typeLower.includes('facebook')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
            <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>Facebook</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (typeLower.includes('instagram')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
            <defs>
              <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFDC80" />
                <stop offset="50%" stopColor="#F77737" />
                <stop offset="100%" stopColor="#C13584" />
              </linearGradient>
            </defs>
            <rect width="24" height="24" rx="6" fill="url(#instagram-gradient)" />
            <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="18" cy="6" r="1.5" fill="white" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>Instagram</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (typeLower.includes('tiktok')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
            <rect width="24" height="24" rx="4" fill="black" />
            <path fill="#25F4EE" d="M9 8v8a3 3 0 1 0 3-3V8h3c0 2 1.5 3.5 3.5 3.5v3c-2 0-3.5-1-4.5-2.5v5a5 5 0 1 1-5-5z" />
            <path fill="#FE2C55" d="M10 9v8a3 3 0 1 0 3-3V9h3c0 2 1.5 3.5 3.5 3.5v3c-2 0-3.5-1-4.5-2.5v5a5 5 0 1 1-5-5z" />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>TikTok</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (typeLower.includes('sf system')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">SF</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>SF System</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (typeLower.includes('entrada direta') || typeLower.includes('direct')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-5 h-5 rounded bg-muted/60 dark:bg-muted flex items-center justify-center flex-shrink-0">
            <ArrowRight size={12} className="text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Entrada Direta</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Globe size={18} className="text-muted-foreground flex-shrink-0" />
      </TooltipTrigger>
      <TooltipContent>
        <p>{type}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Paid traffic indicator (GCLID)
const PaidTrafficBadge: React.FC<{ gclid: string | null }> = ({ gclid }) => {
  if (!gclid) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
          <Megaphone size={12} />
          <span>Ads</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-medium mb-1">Tráfego Pago</p>
        <p className="text-xs text-muted-foreground break-all">{gclid}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Proxy warning badge
const ProxyBadge: React.FC<{ isProxy: boolean }> = ({ isProxy }) => {
  if (!isProxy) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
          <AlertTriangle size={12} />
          <span>Proxy</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Conexão via Proxy/VPN detectada</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Get card border color based on status
const getCardBorderClass = (status: string, isProxy: boolean) => {
  if (isProxy) return 'border-red-500/50 border-2 shadow-red-500/10 shadow-lg';
  const statusLower = status.toLowerCase();
  if (statusLower === 'checkout') return 'border-blue-500/40';
  if (statusLower === 'venda' || statusLower === 'sale') return 'border-green-500/40';
  return 'border-border';
};

const VisitorCard: React.FC<VisitorCardProps> = ({ visitor, onViewDetail }) => {
  const { location, device, source, network, metrics, events, date, time_ago, status } = visitor;
  const { token } = useAuth();

  // Initialize from list response data
  const [aiInsight, setAiInsight] = useState<string | null>(visitor.recording?.ai_insight ?? null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(false);
  const hasRecording = visitor.recording?.has_recording ?? false;
  const [showReplay, setShowReplay] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleInsight = useCallback(async () => {
    if (!token || insightLoading || aiInsight) return;
    setInsightLoading(true);
    setInsightError(false);

    try {
      // 1. Trigger async generation
      await generateVisitorInsight(token, visitor.id);

      // 2. Poll GET /visitors-logs/{id} every 5s until ai_insight appears
      let attempts = 0;
      pollingRef.current = setInterval(async () => {
        attempts++;
        try {
          const poll = await fetchVisitorDetail(token, visitor.id);
          if (poll.recording?.ai_insight) {
            setAiInsight(poll.recording.ai_insight);
            setInsightLoading(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
          } else if (attempts >= 24) {
            setInsightLoading(false);
            setInsightError(true);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        } catch {
          setInsightLoading(false);
          setInsightError(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }, 5000);
    } catch {
      setInsightLoading(false);
      setInsightError(true);
    }
  }, [token, visitor.id, insightLoading, aiInsight]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(
        "sf-card space-y-4 shadow-sm dark:shadow-none hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 group/card relative overflow-hidden",
        getCardBorderClass(status, network.is_proxy)
      )}>
        {/* Hover Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* VPN/Proxy Banner */}
        {network.is_proxy && (
          <div className="flex items-center gap-2 px-3 py-2 -mx-5 -mt-5 mb-3 rounded-t-xl bg-gradient-to-r from-red-500/20 via-red-500/10 to-transparent border-b border-red-500/20">
            <Shield size={14} className="text-red-500 shrink-0" />
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">VPN / Proxy Detectado</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <StatusIcon status={status} />
              {/* Activity indicator as an absolute dot on the icon if active */}
              {visitor.activity_status.active && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-background"></span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Date */}
              <span className="text-sm font-medium text-foreground">{date}</span>

              {/* Separator */}
              <span className="text-muted-foreground/30 text-xs">•</span>

              {/* Country flag */}
              {location.iso && (
                <CountryFlag iso={location.iso} country={location.country} />
              )}

              {/* Device icons */}
              <div className="flex items-center gap-1.5">
                <BrowserIcon browser={device.browser} />
                <OSIcon system={device.system} />
              </div>

              {/* Paid traffic indicator */}
              <PaidTrafficBadge gclid={source.gclid} />

              {/* Proxy badge */}
              <ProxyBadge isProxy={network.is_proxy} />
            </div>
          </div>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {time_ago}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {/* GCLID if present */}
          {source.gclid && (
            <div className="flex items-start gap-2">
              <Megaphone size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Gclid:</span>
              <span className="text-amber-400 text-xs break-all opacity-80">
                {source.gclid}
              </span>
            </div>
          )}

          {/* IP */}
          <div className="flex items-center gap-2">
            <Globe size={14} className={`shrink-0 ${network.is_proxy ? 'text-destructive' : 'text-primary/70'}`} />
            <span className="text-muted-foreground w-16">IP:</span>
            <span className={cn("font-medium", network.is_proxy ? 'text-destructive' : 'text-foreground')}>{network.ip}</span>
          </div>

          {/* Location */}
          {(location.city || location.state || location.country) && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-primary/70 shrink-0" />
              <span className="text-muted-foreground w-16">Local:</span>
              <span className="text-foreground font-medium">
                {[location.city, location.state].filter(Boolean).join(' - ') || location.country || 'Desconhecido'}
              </span>
            </div>
          )}

          {/* Session duration */}
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-primary/70 shrink-0" />
            <span className="text-muted-foreground w-16">Duração:</span>
            <span className="text-foreground font-medium">
              {metrics.session_duration || '0 segundos'}
            </span>
          </div>

          {/* Campaign & Keyword */}
          {(source.campaign || source.keyword) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground w-16">Origem:</span>
              <span className="text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                {source.campaign || '-'}
              </span>
              {source.keyword && (
                <span className="text-foreground bg-secondary px-2 py-0.5 rounded text-xs">
                  {source.keyword}
                </span>
              )}
            </div>
          )}

          {/* Escape status */}
          <div className="flex items-center gap-2">
            <ArrowRight size={14} className="text-primary/70 shrink-0" />
            <span className="text-muted-foreground w-16">Fuga:</span>
            <span className={cn("font-medium text-xs px-2 py-0.5 rounded-full", metrics.escape ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500')}>
              {metrics.escape ? 'SIM' : 'NÃO'}
            </span>
          </div>

          {/* Source */}
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SourceIcon type={source.type} />
              <span className="text-sm font-medium text-foreground">{source.type}</span>
            </div>
            <span className="text-xs text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity">
              ID: {visitor.id}
            </span>
          </div>
        </div>

        {/* AI Insight */}
        {aiInsight && (
          <div className="border border-primary/20 bg-primary/5 dark:bg-primary/10 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-semibold text-primary">Insight da IA</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{aiInsight}</p>
          </div>
        )}

        {/* Events section */}
        {events.length > 0 && (
          <div className="border border-border/50 bg-secondary/20 dark:bg-secondary/10 rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock size={12} /> Últimos eventos
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {events.map((event, index) => {
                const { label, colorClass } = getEventDisplay(event);

                return (
                  <div key={index} className="flex items-start gap-2.5 text-xs group/event">
                    <span className="text-muted-foreground/60 font-mono whitespace-nowrap pt-0.5">{event.time}</span>
                    <div className="flex-1 flex items-start gap-1.5 min-w-0 flex-wrap">
                      <span className={cn(
                        "font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                        colorClass
                      )}>
                        {label}
                      </span>
                      {event.target && (
                        <a
                          href={event.target}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground group-hover/event:text-primary transition-colors hover:underline truncate max-w-[280px] flex items-center gap-1 mt-0.5"
                        >
                          <LinkIcon size={10} className="shrink-0" />
                          <span className="truncate">{event.target}</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer with action buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/60">
          <div className="flex-1 flex items-center gap-2">
            {/* Replay button - shows if recording exists (First button) */}
            {hasRecording && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowReplay(true)}
                    className="flex text-xs font-semibold items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 transition-all active:scale-95"
                  >
                    <Play size={14} className="fill-current" />
                    Ver Gravação
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assistir gravação de tela do visitante</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Insight button (Second button) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleInsight}
                  disabled={insightLoading || !!aiInsight}
                  className={cn(
                    "flex text-xs font-medium items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg border transition-all active:scale-95",
                    aiInsight
                      ? "bg-primary/5 border-primary/20 text-primary cursor-default"
                      : insightError
                        ? "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
                        : "bg-background border-border hover:bg-secondary text-foreground hover:border-primary/30"
                  )}
                >
                  {insightLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className={aiInsight ? "text-primary" : "text-amber-500"} />
                  )}
                  {aiInsight ? 'Insight Gerado' : insightError ? 'Tentar Novamente' : 'Gerar Insight'}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{aiInsight ? 'Insight já gerado' : 'Gerar insight com IA'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center justify-end">
            {/* View More button (Last button) */}
            {onViewDetail && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onViewDetail(visitor.id)}
                    className="flex text-xs font-medium items-center justify-center gap-1.5 px-3 py-1.5 h-8 rounded-lg bg-secondary/50 dark:bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95 border border-transparent hover:border-border"
                  >
                    Ver Mais
                    <ArrowRight size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver histórico completo do visitante</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Replay Modal */}
      <VisitorReplayModal
        visitorId={visitor.id}
        isOpen={showReplay}
        onClose={() => setShowReplay(false)}
      />
    </TooltipProvider>
  );
};

export default VisitorCard;
