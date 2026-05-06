import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEditorHistory, sendEditorChat, rollbackEditor } from '@/services/editorApi';
import { EditorHistoryItem, EditorHistoryStatus } from '@/types/editor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Send,
  Loader2,
  ImagePlus,
  X,
  RotateCcw,
  User,
  Bot,
  Clock,
  History,
  Maximize2,
  Minimize2,
  AlertCircle,
  Sparkles,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  Globe,
  ScanSearch,
} from 'lucide-react';
import { createEcho } from '@/lib/echo';
import ScraperModal from '@/components/ScraperModal';
import { scrapePage } from '@/services/api';


// Animated AI Orb Component
const AiOrb: React.FC = () => (
  <div className="sf-ai-orb mx-auto mb-6">
    {/* The ::before and ::after pseudo-elements handle the animation */}
  </div>
);

const AiEditor = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const id = Number(siteId);

  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewVersion, setPreviewVersion] = useState(0);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [showScannerInput, setShowScannerInput] = useState(false);
  const [scraperUrl, setScraperUrl] = useState('');
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<{ text: string; images: string[] }>({ text: '', images: [] });
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapedImagesList, setScrapedImagesList] = useState<string[]>([]);
  const [pendingHistoryId, setPendingHistoryId] = useState<number | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<{ id: number; content: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasPendingItems = (items: EditorHistoryItem[]) =>
    items.some(h => h.role === 'assistant' && (h.status === 'queued' || h.status === 'processing'));

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['editor-history', id],
    queryFn: () => fetchEditorHistory(token!, id),
    enabled: !!token && !!id,
  });

  // Escuta as edições de IA em Tempo Real pelo WebSocket
  useEffect(() => {
    if (!token || !id || !user?.id) return;

    let echoInstance: any = null;

    try {
      const userId = user.id;
      echoInstance = createEcho();
      const channel = echoInstance.private(`landing-pages.${userId}`);

      channel.listen('.EditorHistoryUpdated', (e: any) => {
        const updatedItem = e.historyItem;

        if (!updatedItem || updatedItem.site_id !== id) return;

        // The broadcast event omits 'content' and 'html_snapshot' to keep payload light.
        // We must invalidate the query to fetch the full data instead of partially updating the cache,
        // otherwise the text becomes blank.
        queryClient.invalidateQueries({ queryKey: ['editor-history', id] });
      });
    } catch (err) {
      console.error('WebSocket AiEditor Error', err);
    }

    return () => {
      if (echoInstance) echoInstance.disconnect();
    };
  }, [token, user?.id, id, queryClient]);

  const history = historyData?.data || [];

  useEffect(() => {
    if (!pendingHistoryId || history.length === 0) return;
    const item = history.find(h => h.id === pendingHistoryId);
    if (!item) return;

    if (item.status === 'completed' && item.html_snapshot) {
      setPreviewHtml(item.html_snapshot);
      setPendingHistoryId(null);
      toast.success('Alterações aplicadas!');
    } else if (item.status === 'failed') {
      setPendingHistoryId(null);
      toast.error(item.error_message || 'Erro ao processar edição');
    }
  }, [history, pendingHistoryId]);

  // Carrega o preview atual do site na primeira abertura (antes de qualquer histórico)
  useEffect(() => {
    if (!token || !id) return;
    if (previewHtml) return; // Já tem preview carregado

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';
    fetch(`${API_BASE_URL}/workspace/sites/${id}/preview`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html',
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Preview não disponível');
        return res.text();
      })
      .then(html => {
        if (html && !previewHtml) {
          setPreviewHtml(html);
        }
      })
      .catch(() => {/* silencia — preview pode não existir ainda */ });
  }, [token, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (history.length > 0 && !previewHtml) {
      const lastCompleted = [...history]
        .reverse()
        .find(h => h.role === 'assistant' && h.status === 'completed' && h.html_snapshot);
      if (lastCompleted?.html_snapshot) {
        setPreviewHtml(lastCompleted.html_snapshot);
      }
    }
  }, [history, previewHtml]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const chatMutation = useMutation({
    mutationFn: () => sendEditorChat(token!, id, prompt, images.length > 0 ? images : undefined, scrapedImagesList.length > 0 ? scrapedImagesList : undefined),
    onSuccess: (response) => {
      setPendingHistoryId(response.history_id);
      queryClient.invalidateQueries({ queryKey: ['editor-history', id] });
      setPrompt('');
      setImages([]);
      setScrapedImagesList([]);
      setShowScannerInput(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao enviar solicitação');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (historyId: number) => rollbackEditor(token!, id, historyId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['editor-history', id] });
      setPreviewHtml(response.html);
      toast.success('Versão restaurada!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao restaurar versão');
    },
  });

  const handleSend = () => {
    if (!prompt.trim()) return;
    chatMutation.mutate();
  };

  const handleScrapeAction = async (url: string) => {
    if (!url.trim()) return;
    setScraperUrl(url);
    setIsScraperModalOpen(true);
    setScraping(true);
    setScrapeError(null);
    try {
      const res = await scrapePage(token!, url);
      setScrapedData({ text: res.data.text, images: res.data.images });
    } catch (e: any) {
      setScrapeError(e.message || 'Erro ao escanear site');
    } finally {
      setScraping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 5));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isProcessing = chatMutation.isPending || pendingHistoryId !== null;
  const hasHistory = history.length > 0;
  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  const getStatusIcon = (status: EditorHistoryStatus) => {
    switch (status) {
      case 'queued':
      case 'processing':
        return <Loader2 size={10} className="animate-spin" />;
      case 'failed':
        return <AlertCircle size={10} className="text-destructive" />;
      default:
        return <Clock size={10} />;
    }
  };

  // Empty state: centered AI orb with greeting (similar to Aniq-UI AI Assistant)
  if (!hasHistory && !historyLoading) {
    return (
      <div
        className="flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6 relative overflow-hidden bg-background"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% -10%, hsl(var(--primary)/0.15) 0%, transparent 50%),
            linear-gradient(to right, hsl(var(--primary)/0.03) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary)/0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 30px 30px, 30px 30px',
          backgroundPosition: 'center -15px'
        }}
      >
        {/* Minimal header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/30 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/sales-pages')}>
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Editor IA</span>
          </div>
        </div>

        {/* Centered content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <AiOrb />
          <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">
            Bom te ver, {firstName}.
          </h2>
          <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
            Descreva as alterações que deseja na sua landing page.
            Você pode enviar imagens como referência.
          </p>

          {/* Centered input */}
          <div className="w-full max-w-2xl">
            {/* Image previews */}
            {(images.length > 0 || scrapedImagesList.length > 0) && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <div key={i} className="relative shrink-0">
                    <img
                      src={URL.createObjectURL(img)}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-border"
                    />
                    <button
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {scrapedImagesList.map((url, i) => (
                  <div key={'scraped-'+i} className="relative shrink-0">
                    <img
                      src={url}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-border"
                    />
                    <button
                      onClick={() => setScrapedImagesList(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showScannerInput && (
              <div className="flex items-center gap-2 mb-3 bg-background/80 backdrop-blur-md border border-primary/40 p-1.5 rounded-full shadow-lg shadow-primary/5 animate-in slide-in-from-bottom-2 fade-in duration-300 relative z-10 w-full max-w-lg mx-auto">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ml-1">
                  <Globe size={16} className="text-primary animate-pulse" />
                </div>
                <input
                  type="url"
                  autoFocus
                  placeholder="Cole a URL do site referencial..."
                  value={scraperUrl}
                  onChange={(e) => setScraperUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleScrapeAction(scraperUrl);
                      setShowScannerInput(false);
                      setScraperUrl('');
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground ml-1 mr-2 h-8"
                  disabled={isProcessing || scraping}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full px-3 gap-1.5 shrink-0"
                  disabled={!scraperUrl.trim() || isProcessing || scraping}
                  onClick={() => {
                    handleScrapeAction(scraperUrl);
                    setShowScannerInput(false);
                    setScraperUrl('');
                  }}
                >
                  <ScanSearch size={14} />
                  Escanear
                </Button>
              </div>
            )}

            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageAdd}
              />
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ImagePlus size={18} />
                </button>
                <button
                  onClick={() => setShowScannerInput(!showScannerInput)}
                  disabled={isProcessing || scraping}
                  title="Escanear Página para Referência"
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    showScannerInput ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Globe size={18} />
                </button>
                <input
                  type="text"
                  placeholder="Descreva as alterações desejadas..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSend}
                  disabled={!prompt.trim() || isProcessing}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    prompt.trim()
                      ? "bg-primary text-primary-foreground hover:brightness-110"
                      : "text-muted-foreground"
                  )}
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Enter para enviar · Máx. 5 imagens
              </p>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // With history: 3-panel layout
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/30 backdrop-blur-sm shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/sales-pages')}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h1 className="text-sm font-semibold text-foreground truncate">Editor IA</h1>
          <span className="text-xs text-muted-foreground">Site #{id}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border"
          onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
        >
          {isPreviewExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {isPreviewExpanded ? 'Reduzir' : 'Expandir'} Preview
        </Button>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: History sidebar */}
        {!isPreviewExpanded && (
          <div className="w-60 border-r border-border bg-card/30 flex flex-col shrink-0 hidden lg:flex">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <History size={15} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Versões</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : history.filter(h => h.role === 'assistant').length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8 px-2">
                    Nenhuma versão ainda.
                  </p>
                ) : (
                  history
                    .filter(h => h.role === 'assistant')
                    .map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors group cursor-pointer",
                          item.status === 'failed' && "opacity-60",
                          (item.status === 'queued' || item.status === 'processing') && "opacity-50 pointer-events-none",
                          loadingPreviewId === item.id && "ring-1 ring-primary/50 bg-primary/5"
                        )}
                        onClick={async () => {
                          if (item.status !== 'completed') return;
                          setLoadingPreviewId(item.id);
                          try {
                            const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';
                            const res = await fetch(`${API_BASE_URL}/workspace/sites/${id}/editor/history/${item.id}/preview`, {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'text/html',
                              },
                            });
                            if (!res.ok) throw new Error('Preview não disponível');
                            const html = await res.text();
                            setPreviewHtml(html);
                            setPreviewVersion(v => v + 1);
                          } catch {
                            toast.error('Não foi possível carregar o preview desta versão');
                          } finally {
                            setLoadingPreviewId(null);
                          }
                        }}
                      >
                        <p className="text-xs font-medium text-foreground truncate">
                          {item.content}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {loadingPreviewId === item.id ? (
                              <><Loader2 size={10} className="animate-spin" /> Carregando...</>
                            ) : (
                              <>
                                {getStatusIcon(item.status)}
                                {item.status === 'queued' || item.status === 'processing'
                                  ? 'Processando...'
                                  : item.status === 'failed'
                                    ? 'Falhou'
                                    : formatTime(item.created_at)}
                              </>
                            )}
                          </span>
                          {item.status === 'completed' && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRollbackTarget({ id: item.id, content: item.content });
                                }}
                                disabled={rollbackMutation.isPending}
                                title="Restaurar esta versão"
                              >
                                <RotateCcw size={12} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Center: Chat */}
        {!isPreviewExpanded && (
          <div
            className="flex-1 flex flex-col min-w-0 border-r border-border relative bg-background"
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% -10%, hsl(var(--primary)/0.15) 0%, transparent 60%),
                linear-gradient(to right, hsl(var(--primary)/0.03) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--primary)/0.03) 1px, transparent 1px)
              `,
              backgroundSize: '100% 100%, 30px 30px, 30px 30px',
              backgroundPosition: 'center -15px'
            }}
          >
            {/* Chat messages */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex gap-3',
                      item.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {item.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1 ring-1 ring-primary/20">
                        <Bot size={15} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                        item.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : item.status === 'failed'
                            ? 'bg-destructive/10 text-destructive rounded-bl-sm border border-destructive/20'
                            : 'bg-secondary/70 text-foreground rounded-bl-sm'
                      )}
                    >
                      <p className="whitespace-pre-wrap">
                        {item.status === 'failed'
                          ? item.error_message || 'Erro ao processar edição.'
                          : item.content}
                      </p>
                      {(item.status === 'queued' || item.status === 'processing') && (
                        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                          <Loader2 size={12} className="animate-spin" />
                          <span className="text-xs">
                            {item.status === 'queued' ? 'Na fila...' : 'Processando...'}
                          </span>
                        </div>
                      )}
                      <span className={cn(
                        'text-[10px] mt-1.5 block',
                        item.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                      )}>
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                    {item.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary/20 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={14} className="text-primary-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {(images.length > 0 || scrapedImagesList.length > 0) && (
              <div className="px-4 py-2 border-t border-border flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <div key={i} className="relative shrink-0">
                    <img
                      src={URL.createObjectURL(img)}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-border"
                    />
                    <button
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {scrapedImagesList.map((url, i) => (
                  <div key={'scraped-'+i} className="relative shrink-0">
                    <img
                      src={url}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-border"
                    />
                    <button
                      onClick={() => setScrapedImagesList(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showScannerInput && (
              <div className="px-4 py-2 border-t border-border bg-card/30">
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-primary/40 py-1.5 px-2 rounded-full shadow-sm animate-in slide-in-from-left-2 fade-in duration-300 max-w-lg">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe size={14} className="text-primary animate-pulse" />
                  </div>
                  <input
                    type="url"
                    autoFocus
                    placeholder="Cole a URL para a IA escanear..."
                    value={scraperUrl}
                    onChange={(e) => setScraperUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScrapeAction(scraperUrl);
                        setShowScannerInput(false);
                        setScraperUrl('');
                      }
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground h-full ml-1 mr-2"
                    disabled={isProcessing || scraping}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-full px-3 gap-1.5 shrink-0"
                    disabled={!scraperUrl.trim() || isProcessing || scraping}
                    onClick={() => {
                      handleScrapeAction(scraperUrl);
                      setShowScannerInput(false);
                      setScraperUrl('');
                    }}
                  >
                    <ScanSearch size={14} />
                    Escanear
                  </Button>
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="p-4 border-t border-border bg-card/30">
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageAdd}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <ImagePlus size={18} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("shrink-0 h-10 w-10", showScannerInput && "text-primary bg-primary/10")}
                  onClick={() => setShowScannerInput(!showScannerInput)}
                  disabled={isProcessing || scraping}
                  title="Escanear Página para Referência"
                >
                  <Globe size={18} />
                </Button>
                <Textarea
                  placeholder="Descreva as alterações desejadas..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[44px] max-h-32 resize-none bg-secondary/30 border-border"
                  rows={1}
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSend}
                  disabled={!prompt.trim() || isProcessing}
                  size="icon"
                  className="shrink-0 h-10 w-10"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Enter para enviar · Shift+Enter para nova linha · Máx. 5 imagens
              </p>
            </div>
          </div>
        )}

        {/* Right: HTML Preview with Device Mockups */}
        <div className={cn('flex flex-col bg-background', isPreviewExpanded ? 'flex-1' : 'flex-1 min-w-0')}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/30 shrink-0">
            <span className="text-sm font-medium text-foreground">Preview</span>
            <div className="flex items-center gap-2">
              {/* Device Toggle Buttons */}
              <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={cn(
                    'p-1.5 rounded-md transition-all',
                    previewDevice === 'desktop'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Desktop"
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={cn(
                    'p-1.5 rounded-md transition-all',
                    previewDevice === 'tablet'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Tablet"
                >
                  <Tablet size={14} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={cn(
                    'p-1.5 rounded-md transition-all',
                    previewDevice === 'mobile'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Mobile"
                >
                  <Smartphone size={14} />
                </button>
              </div>
              {previewHtml && (
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden" style={{ background: 'radial-gradient(circle at center, hsl(var(--secondary)/0.3) 0%, hsl(var(--background)) 100%)' }}>
            {previewHtml ? (
              <div className="absolute inset-0 flex items-center justify-center p-4" style={{ overflow: 'hidden' }}>
                <div
                  className="relative bg-[#1c1c1e] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-center shadow-[0_30px_60px_rgba(0,0,0,0.15)] ring-1 ring-black/10"
                  style={{
                    width: previewDevice === 'desktop' ? '100%' : 'auto',
                    height: previewDevice === 'desktop' ? '100%' : '100%',
                    maxWidth: '100%',
                    maxHeight: previewDevice === 'desktop' ? '100%' : previewDevice === 'mobile' ? '800px' : '960px',
                    aspectRatio: previewDevice === 'mobile' ? '390/844' : previewDevice === 'tablet' ? '768/1024' : 'auto',
                    borderRadius: previewDevice === 'mobile' ? '46px' : previewDevice === 'tablet' ? '30px' : previewDevice === 'desktop' ? '12px' : '0px',
                    padding: previewDevice === 'desktop' ? '0px' : '14px',
                  }}
                >
                  {/* === FRONT CAMERA (TABLET/MOBILE) === */}
                  <div
                    className={`absolute top-4 left-1/2 -translate-x-1/2 bg-[#0a0a0a] w-5 h-5 rounded-full z-20 shadow-inner flex items-center justify-center transition-opacity duration-300 ${previewDevice !== 'desktop' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-900/30"></div>
                  </div>

                  {/* === MOBILE HOME INDICATOR === */}
                  <div
                    className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-32 h-[5px] bg-[#333] rounded-full z-20 transition-opacity duration-300 ${previewDevice === 'mobile' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  />

                  {/* === SCREEN CONTAINER === */}
                  <div
                    className="relative w-full h-full bg-white flex flex-col overflow-hidden transition-all duration-500"
                    style={{
                      borderRadius: previewDevice === 'mobile' ? '32px' : previewDevice === 'tablet' ? '16px' : previewDevice === 'desktop' ? '12px' : '0px',
                    }}
                  >
                    {/* === DESKTOP BROWSER HEADER === */}
                    <div
                      className={`bg-muted/80 backdrop-blur border-b border-border w-full flex items-center px-4 shrink-0 transition-all duration-500 overflow-hidden ${previewDevice === 'desktop' ? 'h-12 opacity-100' : 'h-0 opacity-0 border-b-0'}`}
                    >
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="ml-6 flex-1 max-w-sm flex items-center justify-center bg-background/50 border border-border/50 text-muted-foreground text-xs font-medium px-4 py-1.5 rounded-md shadow-sm">
                        preview.com
                      </div>
                    </div>

                    {/* === UNIFIED IFRAME === */}
                    <div className="flex-1 w-full relative bg-white overflow-hidden">
                      <iframe
                        key={`iframe-${previewVersion}`}
                        srcDoc={previewHtml ? (previewHtml.includes('::-webkit-scrollbar') ? previewHtml : previewHtml + `<style>::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.3); border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.5); }</style>`) : ''}
                        title="Landing Page Preview"
                        className="absolute inset-0 w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Nenhum conteúdo para exibir</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={!!rollbackTarget} onOpenChange={(open) => !open && setRollbackTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão anterior?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a trocar a versão atual do seu site por uma versão anterior.
              {rollbackTarget && (
                <span className="block mt-2 p-2 bg-secondary rounded text-xs text-foreground font-medium truncate">
                  "{rollbackTarget.content}"
                </span>
              )}
              <span className="block mt-2 text-amber-500 font-medium">
                ⚠️ Essa ação substituirá o HTML atual do site. Tem certeza que deseja prosseguir?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                if (rollbackTarget) {
                  rollbackMutation.mutate(rollbackTarget.id);
                  setRollbackTarget(null);
                }
              }}
            >
              Sim, restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Scraper Modal via Portal */}
      <ScraperModal
        isOpen={isScraperModalOpen}
        onClose={() => setIsScraperModalOpen(false)}
        url={scraperUrl}
        context="style"
        scrapedText={scrapedData.text}
        scrapedImages={scrapedData.images}
        isLoading={scraping}
        error={scrapeError}
        currentImageCount={scrapedImagesList.length}
        onInsertCopy={(text) => {
          setPrompt((prev) => prev ? prev + '\n\n' + text : text);
        }}
        onInsertImages={(urls) => {
          setScrapedImagesList((prev) => [...prev, ...urls].slice(0, 20));
        }}
      />
    </div>
  );
};

export default AiEditor;
