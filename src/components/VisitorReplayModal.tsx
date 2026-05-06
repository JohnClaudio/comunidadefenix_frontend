import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Play, AlertCircle, Video, MonitorPlay, Activity } from 'lucide-react';
import { fetchVisitorReplay } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface VisitorReplayModalProps {
  visitorId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

const VisitorReplayModal: React.FC<VisitorReplayModalProps> = ({ visitorId, isOpen, onClose }) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!isOpen || !visitorId || !token) return;

    let cancelled = false;

    const loadReplay = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const events = await fetchVisitorReplay(token, visitorId);

        if (cancelled) return;

        if (!events || events.length === 0) {
          setError('Nenhuma gravação de tela disponível para esta sessão.');
          setIsLoading(false);
          return;
        }

        // Dynamically import rrweb-player
        const [{ default: rrwebPlayer }] = await Promise.all([
          import('rrweb-player'),
          import('rrweb-player/dist/style.css'),
        ]);

        if (cancelled || !playerContainerRef.current) return;

        // Clear previous player
        if (playerInstanceRef.current) {
          playerContainerRef.current.innerHTML = '';
          playerInstanceRef.current = null;
        }

        playerInstanceRef.current = new rrwebPlayer({
          target: playerContainerRef.current,
          props: {
            events,
            width: 900,
            height: 506,
            autoPlay: true, // Auto-play the premium way
            speed: 1,
            showController: true,
          },
        });

        // Translate "skip inactive" safely by scanning the actual text node (won't break CSS alignment)
        const translatePlayerTexts = () => {
          if (!playerContainerRef.current) return;
          const walker = document.createTreeWalker(
            playerContainerRef.current,
            NodeFilter.SHOW_TEXT,
            null
          );
          let node;
          while ((node = walker.nextNode())) {
            if (node.nodeValue?.includes('skip inactive')) {
              node.nodeValue = node.nodeValue.replace('skip inactive', 'ignorar pausa');
            }
          }
        };

        // Run once shortly after initialization
        setTimeout(translatePlayerTexts, 50);

        // Keep observing in case the toolbar is re-rendered by rrweb
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new MutationObserver(translatePlayerTexts);
        observerRef.current.observe(playerContainerRef.current, { childList: true, subtree: true, characterData: true });

        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading replay:', err);
          setError('Ocorreu um erro ao carregar o arquivo de gravação corrompido ou indisponível.');
          setIsLoading(false);
        }
      }
    };

    loadReplay();

    return () => {
      cancelled = true;
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }
      playerInstanceRef.current = null;
    };
  }, [isOpen, visitorId, token]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handler);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 lg:p-10 animate-in fade-in zoom-in-95 duration-200">
      {/* Premium Backdrop - Respects Light/Dark mode */}
      <div
        className="fixed inset-0 bg-background/80 dark:bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Main Modal Container */}
      <div className="relative z-10 w-full max-w-[1020px] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center ring-1 ring-border/50">

        {/* Sleek Header */}
        <div className="w-full h-16 shrink-0 bg-muted/30 border-b border-border px-6 flex items-center justify-between shadow-sm relative overflow-hidden">

          {/* Subtle animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10 w-full">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <Video className="w-5 h-5 text-primary" />
              </div>
              {/* Recording dot */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-card animate-pulse" />
            </div>

            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground tracking-wide flex items-center gap-2">
                Session Replay
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <MonitorPlay className="w-3.5 h-3.5" />
                  Visitante #{visitorId}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  Alta Fidelidade
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="relative z-10 w-10 h-10 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors border border-border"
            >
              <X className="w-5 h-5 text-foreground/70 group-hover:text-foreground" />
            </button>
          </div>
        </div>

        {/* Player Canvas Area */}
        <div className="relative flex-1 w-full bg-background/50 flex items-center justify-center overflow-hidden min-h-[400px]">

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-20 bg-background dark:bg-[#0A0A0B]">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-5 h-5 text-primary opacity-50" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-foreground tracking-wide">Descriptografando Sessão...</p>
                <p className="text-xs text-muted-foreground">Montando frames de alta fidelidade</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 bg-background dark:bg-[#0A0A0B]">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20 mb-2">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm font-semibold text-foreground">{error}</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border"
              >
                Voltar aos Logs
              </button>
            </div>
          )}

          {/* RRWeb Container */}
          <div
            ref={playerContainerRef}
            className={cn(
              "w-full h-full flex items-center justify-center transition-opacity duration-500 py-6 px-4 md:px-8", // Added padding
              isLoading || error ? 'opacity-0' : 'opacity-100'
            )}
            style={{
              // Add a subtle grid pattern to the background behind the player
              backgroundImage: 'radial-gradient(circle at center, rgba(128,128,128,0.05) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Theme-Aware CSS Overrides for rrweb-player */}
          <style dangerouslySetInnerHTML={{
            __html: `
            .rr-player {
              background: transparent !important;
              box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1) !important;
              border-radius: 12px 12px 12px 12px !important;
              overflow: hidden;
              border: 1px solid hsl(var(--border) / 0.5) !important;
              margin: 0 auto;
              transform: scale(1.05); /* Scales the player nicely to fill */
              transform-origin: center;
              transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .dark .rr-player {
              box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8) !important;
              border: 1px solid rgba(255,255,255,0.08) !important;
            }
            .light .rr-player {
               box-shadow: 0 15px 35px rgba(0,0,0,0.05) !important;
               border: 1px solid rgba(0,0,0,0.05) !important;
            }
            @media (max-width: 1024px) {
              .rr-player { transform: scale(0.9); }
            }
            @media (max-width: 768px) {
              .rr-player { transform: scale(0.7); }
            }
            @media (max-width: 640px) {
              .rr-player { transform: scale(0.45); }
            }
            
            /* Content Area */
            .rr-player .replayer-wrapper {
              background: transparent !important;
            }
            .rr-player .replayer-wrapper iframe {
              background: white !important; /* Keep original page background */
              border: none !important;
              border-radius: 12px 12px 0 0 !important;
              box-shadow: none !important;
            }

            /* Controller Bar - Themed! */
            .rr-controller {
              background: hsl(var(--card)) !important;
              border-top: 1px solid hsl(var(--border) / 0.5) !important;
              color: hsl(var(--foreground)) !important;
              border-radius: 0 0 12px 12px !important;
            }
            
            /* Typography */
            .rr-timeline__time {
              color: hsl(var(--muted-foreground)) !important;
              font-family: inherit !important;
              font-weight: 500 !important;
              font-size: 13px !important;
            }

            /* Tracks & Progress */
            .rr-progress {
              background: hsl(var(--border) / 0.7) !important;
              border-radius: 4px !important;
              height: 6px !important;
            }
            .rr-progress.active {
              background: hsl(var(--border) / 0.7) !important;
            }
            .rr-progress__step,
            .rr-progress__handler,
            .rr-player .rr-timeline__progress {
              background: hsl(var(--primary)) !important;
            }
            .rr-progress__handler {
              width: 12px !important;
              height: 12px !important;
              border-radius: 50% !important;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            }

            /* Buttons & Icons */
            .rr-controller__btns {
              gap: 4px !important;
            }
            .rr-controller__btns button {
              color: hsl(var(--muted-foreground)) !important;
              background: transparent !important;
              border-radius: 6px !important;
              padding: 4px 8px !important;
              transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
              font-weight: 600 !important;
              font-size: 13px !important;
            }
            .rr-controller__btns button:hover {
              color: hsl(var(--foreground)) !important;
              background: hsl(var(--secondary)) !important;
            }
            .rr-controller__btns button.active {
              background: hsl(var(--primary)) !important;
              color: hsl(var(--primary-foreground)) !important;
            }

            /* Force SVGs to inherit color properly */
            .rr-controller__btns button svg {
              fill: currentColor !important;
              color: currentColor !important;
            }
            
            /* Remove focus outlines */
            .rr-controller__btns button:focus {
              outline: none !important;
              box-shadow: 0 0 0 2px hsl(var(--primary) / 0.3) !important;
            }
          `}} />
        </div>
      </div>
    </div>
  );
};

export default VisitorReplayModal;
