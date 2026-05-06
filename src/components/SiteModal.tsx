import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Site, SiteFormData, SiteType } from '@/types/site';
import { Domain } from '@/types/domain';
import { Tracker } from '@/types/tracker';
import {
  Link, Monitor, Smartphone, Info, RefreshCw, ImageOff,
  Globe, Sparkles, FileText, Upload, X, ArrowLeft, ArrowRight,
  Check, Crosshair, Languages, Zap, ExternalLink, ScanSearch, Loader2, ChevronDown, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PromptLibraryPanel from '@/components/PromptLibraryPanel';
import ScraperModal from '@/components/ScraperModal';
import { DecryptedText } from '@/components/DecryptedText';
import { scrapePage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  site?: Site | null;
  domains: Domain[];
  trackers: Tracker[];
  onSubmit: (data: SiteFormData) => void;
  onCapture?: (site: Site) => void;
  isLoading?: boolean;
  isCapturing?: boolean;
}

const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'cs', label: 'Čeština', flag: '🇨🇿' },
];

const WIZARD_STEPS = [
  { id: 1, label: 'Tipo', icon: Zap },
  { id: 2, label: 'Configuração', icon: Globe },
  { id: 3, label: 'Detalhes', icon: Sparkles },
];

const SiteModal: React.FC<SiteModalProps> = ({
  isOpen,
  onClose,
  site,
  domains,
  trackers,
  onSubmit,
  onCapture,
  isLoading = false,
  isCapturing = false,
}) => {
  // Wizard step
  const [step, setStep] = useState(1);

  // Common fields
  const [siteType, setSiteType] = useState<SiteType>('pressel');
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [slug, setSlug] = useState('');
  const [domainId, setDomainId] = useState<string>('');
  const [trackerId, setTrackerId] = useState<string>('');
  const [affLink, setAffLink] = useState('');
  const [active, setActive] = useState(true);

  // Pressel fields
  const [url, setUrl] = useState('');

  // AI Builder fields
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [styleUrl, setStyleUrl] = useState('');
  const [styleText, setStyleText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [acceptLanguage, setAcceptLanguage] = useState('pt-BR');
  const [images, setImages] = useState<File[]>([]);
  const [scrapedImagesList, setScrapedImagesList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scraper state
  const { token } = useAuth();
  const [scraperOpen, setScraperOpen] = useState(false);
  const [scraperContext, setScraperContext] = useState<'style' | 'product'>('product');
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperText, setScraperText] = useState('');
  const [scraperImages, setScraperImages] = useState<string[]>([]);
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperError, setScraperError] = useState<string | null>(null);

  // Preview
  const [previewTab, setPreviewTab] = useState<'desktop' | 'mobile'>('desktop');

  const isEditing = !!site;

  useEffect(() => {
    if (site) {
      setSiteType(site.type || 'pressel');
      setName(site.name || '');
      setSubdomain('');
      setSlug(site.slug);
      setDomainId(site.domain_id?.toString() || '');
      setTrackerId(site.tracker_id?.toString() || '');
      setUrl(site.url || '');
      setAffLink(site.aff_link || '');
      setAcceptLanguage(site.accept_language || 'pt-BR');
      setActive(site.active);
      setStep(2); // Skip type selection when editing
    } else {
      resetForm();
    }
  }, [site, isOpen]);

  const resetForm = () => {
    setStep(1);
    setSiteType('pressel');
    setName('');
    setSubdomain('');
    setSlug('');
    setDomainId('');
    setTrackerId('');
    setUrl('');
    setAffLink('');
    setActive(true);
    setSourceUrl('');
    setSourceText('');
    setStyleUrl('');
    setStyleText('');
    setPrompt('');
    setAcceptLanguage('pt-BR');
    setImages([]);
    setScrapedImagesList([]);
    setPreviewTab('desktop');
    setScraperOpen(false);
    setScraperText('');
    setScraperImages([]);
    setScraperError(null);
  };

  const handleSubmit = () => {
    const base = {
      name: name || undefined,
      domain_id: parseInt(domainId),
      subdomain: subdomain || undefined,
      slug: slug || undefined,
      tracker_id: trackerId ? parseInt(trackerId) : null,
      aff_link: affLink || undefined,
      active,
    };

    if (siteType === 'ai_builder') {
      onSubmit({
        ...base,
        type: 'ai_builder',
        source_url: sourceUrl || undefined,
        source_text: sourceText || undefined,
        style_url: styleUrl || undefined,
        style_text: styleText || undefined,
        prompt,
        accept_language: acceptLanguage,
        images: images.length > 0 ? images : undefined,
        scraped_images: scrapedImagesList.length > 0 ? scrapedImagesList : undefined,
      });
    } else {
      onSubmit({
        ...base,
        type: 'pressel',
        url,
      });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Scraper helpers ──────────────────────────────────────────────────
  const openScraper = async (ctx: 'style' | 'product', urlToScan: string) => {
    if (!urlToScan.trim()) { toast.warning('Informe a URL antes de escanear'); return; }
    setScraperContext(ctx);
    setScraperUrl(urlToScan);
    setScraperText('');
    setScraperImages([]);
    setScraperError(null);
    setScraperLoading(true);
    setScraperOpen(true);
    try {
      const result = await scrapePage(token!, urlToScan);
      setScraperText(result.data.text ?? '');
      setScraperImages(result.data.images ?? []);
    } catch (e: any) {
      setScraperError(e.message || 'Falha ao escanear a página');
    } finally {
      setScraperLoading(false);
    }
  };

  const handleScraperInsertCopy = (text: string) => {
    if (scraperContext === 'style') setStyleText(text);
    else setSourceText(text);
  };

  const handleScraperInsertImages = async (urls: string[]) => {
    const remaining = 20 - (images.length + scrapedImagesList.length);
    const toAdd = urls.slice(0, remaining);
    if (toAdd.length > 0) {
      setScrapedImagesList(prev => [...prev, ...toAdd]);
    }
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const remaining = 20 - (images.length + scrapedImagesList.length);
      setImages(prev => [...prev, ...newFiles.slice(0, remaining)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeScrapedImage = (index: number) => {
    setScrapedImagesList(prev => prev.filter((_, i) => i !== index));
  };

  const currentImage = previewTab === 'desktop' ? site?.desk_image : site?.mobile_image;

  const canProceedStep2 = !!domainId;
  const canProceedStep3 =
    siteType === 'pressel' ? !!url : !!sourceUrl;

  const totalSteps = 3;

  // ── EDIT MODE ──
  if (isEditing) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl bg-card border-border p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">

            {/* Left Side - Preview */}
            <div className="lg:w-2/5 bg-secondary/30 p-5 flex flex-col border-r border-border shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Preview do Site</h3>
                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'desktop' | 'mobile')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="desktop" className="h-7 px-2.5 gap-1.5 text-xs">
                      <Monitor size={14} /> Desktop
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="h-7 px-2.5 gap-1.5 text-xs">
                      <Smartphone size={14} /> Mobile
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className={cn(
                "flex-1 rounded-xl overflow-hidden bg-background/50 border border-border",
                previewTab === 'mobile' ? "max-w-[280px] mx-auto" : "overflow-y-auto"
              )}>
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={`${site.slug} - ${previewTab}`}
                    className={cn("w-full", previewTab === 'mobile' ? "h-full object-cover object-top" : "object-contain object-top")}
                    onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }}
                  />
                ) : null}
                <div className={cn("flex flex-col items-center justify-center gap-3 text-muted-foreground p-8 min-h-[200px]", currentImage && "hidden")}>
                  <ImageOff size={48} className="opacity-50" />
                  <p className="text-sm text-center">Imagem não disponível</p>
                </div>
              </div>
              {onCapture && (
                <Button type="button" variant="outline" className="mt-4 gap-2 w-full" onClick={() => onCapture(site)} disabled={isCapturing}>
                  <RefreshCw size={16} className={cn(isCapturing && "animate-spin")} />
                  {isCapturing ? 'Capturando...' : 'Recapturar Screenshot'}
                </Button>
              )}
            </div>

            {/* Right Side - Edit Form */}
            <div className="flex-1 flex flex-col min-h-0">
              <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Configurar Página
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">

                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-slug" className="text-sm font-medium">Slug</Label>
                    <Input
                      id="edit-slug"
                      placeholder="ex.: produto-x"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                      className="bg-background border-border h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Caminho da URL. Ex: seudominio.com/<strong>{slug || 'slug'}</strong>
                    </p>
                  </div>

                  {/* Domain */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-domain" className="text-sm font-medium">
                      Domínio Base <span className="text-primary">*</span>
                    </Label>
                    <Select value={domainId} onValueChange={setDomainId}>
                      <SelectTrigger id="edit-domain" className="bg-background border-border h-11">
                        <SelectValue placeholder="Selecione o domínio..." />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.id.toString()}>
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tracker */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-tracker" className="text-sm font-medium flex items-center gap-2">
                      <Crosshair size={14} className="text-muted-foreground" />
                      Tracker Vinculado
                    </Label>
                    <Select
                      value={trackerId || 'none'}
                      onValueChange={(v) => setTrackerId(v === 'none' ? '' : v)}
                    >
                      <SelectTrigger id="edit-tracker" className="bg-background border-border h-11">
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {trackers.map((tracker) => (
                          <SelectItem key={tracker.id} value={tracker.id.toString()}>
                            <DecryptedText value={tracker.name} fallbackText="🔒 Tracker Bloqueado" />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Affiliate Link – Pressel only */}
                  {siteType === 'pressel' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-aff-link" className="text-sm font-medium">Link de Afiliado</Label>
                      <Input
                        id="edit-aff-link"
                        type="url"
                        placeholder="https://checkout.com/ref=123"
                        value={affLink}
                        onChange={(e) => setAffLink(e.target.value)}
                        className="bg-background border-border h-11"
                      />
                    </div>
                  )}

                  {/* URL – Pressel only */}
                  {siteType === 'pressel' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-url" className="text-sm font-medium">
                        URL da Página de Destino <span className="text-primary">*</span>
                      </Label>
                      <Input
                        id="edit-url"
                        type="url"
                        placeholder="https://pagina-do-produtor.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="bg-background border-border h-11"
                      />
                      <p className="text-xs text-muted-foreground">A URL que será clonada/exibida como cookie page.</p>
                    </div>
                  )}

                  {/* Active */}
                  <div className="flex items-center space-x-3 p-4 rounded-xl bg-background border border-border">
                    <Checkbox
                      id="edit-active"
                      checked={active}
                      onCheckedChange={(checked) => setActive(checked === true)}
                    />
                    <div>
                      <Label htmlFor="edit-active" className="cursor-pointer font-medium">Página ativa</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Desative para ocultar temporariamente</p>
                    </div>
                  </div>

                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-border bg-secondary/20 shrink-0">
                  <Button type="button" variant="outline" onClick={handleClose}>Fechar</Button>
                  <Button type="submit" disabled={isLoading} className="min-w-[100px]">
                    {isLoading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    );
  }


  // ── CREATE MODE: Fullscreen Wizard ──
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 rounded-none border-0 bg-background flex flex-col [&>button]:hidden">
        {/* Top Bar */}
        <div className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Nova Página de Vendas</h2>
              <p className="text-xs text-muted-foreground">Passo {step} de {totalSteps}</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((ws, i) => {
              const isActive = step === ws.id;
              const isCompleted = step > ws.id;
              const StepIcon = ws.icon;
              return (
                <React.Fragment key={ws.id}>
                  {i > 0 && (
                    <div className={cn("w-8 h-px", isCompleted ? "bg-primary" : "bg-border")} />
                  )}
                  <button
                    onClick={() => { if (isCompleted) setStep(ws.id); }}
                    disabled={!isCompleted && !isActive}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      isActive && "bg-primary/15 text-primary ring-1 ring-primary/30",
                      isCompleted && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                      !isActive && !isCompleted && "text-muted-foreground/50"
                    )}
                  >
                    {isCompleted ? (
                      <Check size={14} className="text-primary" />
                    ) : (
                      <StepIcon size={14} />
                    )}
                    <span className="hidden sm:inline">{ws.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-muted-foreground"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Wizard Content */}
        <div className="flex-1 overflow-y-auto flex items-start justify-center p-8">
          <div className="w-full max-w-2xl">

            {/* ── STEP 1: Choose Type ── */}
            {step === 1 && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">Que tipo de página você quer criar?</h3>
                  <p className="text-muted-foreground">Escolha o método de criação da sua landing page</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Pre-Sell Card */}
                  <button
                    onClick={() => { setSiteType('pressel'); setStep(2); }}
                    className={cn(
                      "group relative p-6 rounded-2xl border-2 text-left transition-all duration-300",
                      "hover:border-primary/50 hover:shadow-[0_0_40px_-10px_hsl(235_89%_74%/0.2)]",
                      siteType === 'pressel'
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-card/80"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">Pre-Sell</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Clona e exibe uma URL externa como página de cookie/pre-sell. Ideal para usar páginas já prontas do produtor.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/70">
                      <ExternalLink size={12} />
                      <span>Clone de URL externa</span>
                    </div>
                  </button>

                  {/* AI Builder Card */}
                  <button
                    onClick={() => { setSiteType('ai_builder'); setStep(2); }}
                    className={cn(
                      "group relative p-6 rounded-2xl border-2 text-left transition-all duration-300",
                      "hover:border-primary/50 hover:shadow-[0_0_40px_-10px_hsl(235_89%_74%/0.2)]",
                      siteType === 'ai_builder'
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-card/80"
                    )}
                  >
                    {/* "Recomendado" badge */}
                    <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                      Recomendado
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">AI Builder</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Gera uma landing page personalizada com inteligência artificial. Edite visualmente depois com nosso editor.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/70">
                      <Sparkles size={12} />
                      <span>Criação automática com IA</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Configuration ── */}
            {step === 2 && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">Configure seu site</h3>
                  <p className="text-muted-foreground">Defina o domínio, rota e tracker da sua página</p>
                </div>

                <div className="space-y-6">
                  {renderConfigFields()}

                  {/* Active status is true by default and hidden from UI per user request */}
                </div>
              </div>
            )}

            {/* ── STEP 3: Type-Specific Details ── */}
            {step === 3 && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">
                    {siteType === 'pressel' ? 'URL da Página' : 'Configure a IA'}
                  </h3>
                  <p className="text-muted-foreground">
                    {siteType === 'pressel'
                      ? 'Informe a URL que será clonada para sua cookie page'
                      : 'Dê instruções para a IA gerar sua landing page'}
                  </p>
                </div>

                <div className="space-y-6">
                  {renderTypeSpecificFields()}

                  {/* Info Banner */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <Info size={18} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      {siteType === 'pressel'
                        ? 'O subdomínio será criado automaticamente na Cloudflare e o screenshot será capturado.'
                        : 'Após criar, a IA irá gerar a landing page em background. Acompanhe o status na listagem.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="h-20 border-t border-border flex items-center justify-between px-8 shrink-0 bg-card/50 backdrop-blur-sm">
          <Button
            variant="ghost"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Voltar
          </Button>

          {/* Step dots */}
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((ws) => (
              <div
                key={ws.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step === ws.id ? "bg-primary w-6" : step > ws.id ? "bg-primary/50" : "bg-border"
                )}
              />
            ))}
          </div>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 2 && !canProceedStep2}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              Próximo
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !canProceedStep3}
              className="gap-2 shadow-lg shadow-primary/20 min-w-[160px]"
            >
              {isLoading ? 'Criando...' : siteType === 'ai_builder' ? (
                <><Sparkles size={16} /> Gerar com IA</>
              ) : (
                <><Check size={16} /> Criar Página</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // ── Shared field renderers ──

  function renderConfigFields() {
    return (
      <>
        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug" className="text-sm font-medium">Slug</Label>
          <Input
            id="slug"
            placeholder="ex.: produto-x"
            value={slug}
            onChange={(e) => {
              const val = e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '');
              setSlug(val);
            }}
            className="bg-card border-border h-11"
          />
          <p className="text-xs text-muted-foreground">
            Caminho da URL (letras, números e hifens). Ex: seudominio.com/<strong>{slug || 'slug'}</strong>
          </p>
        </div>

        {/* Base Domain - Subdomain removed as per user request */}
        <div className="space-y-2">
          <Label htmlFor="domain" className="text-sm font-medium">Domínio Base <span className="text-primary">*</span></Label>
          <Select value={domainId} onValueChange={setDomainId} required>
            <SelectTrigger className="bg-card border-border h-11">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id.toString()}>
                  {domain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tracker */}
        <div className="space-y-2">
          <Label htmlFor="tracker" className="text-sm font-medium flex items-center gap-2">
            <Crosshair size={14} className="text-muted-foreground" />
            Tracker Vinculado
          </Label>
          <Select value={trackerId || 'none'} onValueChange={(v) => setTrackerId(v === 'none' ? '' : v)}>
            <SelectTrigger className="bg-card border-border h-11">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {trackers.map((tracker) => (
                <SelectItem key={tracker.id} value={tracker.id.toString()}>
                  <DecryptedText value={tracker.name} fallbackText="🔒 Tracker Bloqueado" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Affiliate Link - Only for Pre-sell */}
        {siteType === 'pressel' && (
          <div className="space-y-2">
            <Label htmlFor="aff_link" className="text-sm font-medium">Link de Afiliado</Label>
            <Input
              id="aff_link"
              type="url"
              placeholder="https://checkout.com/ref=123"
              value={affLink}
              onChange={(e) => setAffLink(e.target.value)}
              className="bg-card border-border h-11"
            />
          </div>
        )}
      </>
    );
  }

  // AI Builder
  function renderTypeSpecificFields() {
    if (siteType === 'pressel') {
      return (
        <div className="space-y-2">
          <Label htmlFor="url" className="text-sm font-medium">URL da Página de Destino <span className="text-primary">*</span></Label>
          <Input
            id="url"
            type="url"
            placeholder="https://pagina-do-produtor.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-card border-border h-11"
            required
          />
          <p className="text-xs text-muted-foreground">
            A URL que será clonada/exibida como cookie page.
          </p>
        </div>
      );
    }

    if (isEditing && siteType === 'ai_builder') return null;

    return (
      <div className="space-y-6">

        {/* Prompt Library */}
        <PromptLibraryPanel currentPrompt={prompt} onLoad={setPrompt} />

        {/* ── PASSO 1: Produto ── */}
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Sobre o Produto</h4>
              <p className="text-xs text-muted-foreground">Dê à IA as informações do produto que será promovido</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="source_url" className="text-sm font-medium">URL da Página do Produto <span className="text-primary">*</span></Label>
              <div className="flex gap-2">
                <Input
                  id="source_url"
                  type="url"
                  placeholder="https://site-do-produtor.com/produto"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="bg-background border-border h-10 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1.5 shrink-0"
                  onClick={() => openScraper('product', sourceUrl)}
                >
                  <ScanSearch size={14} />
                  Escanear
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole a URL e clique em <strong className="text-foreground">Escanear</strong> — a IA extrai texto, benefícios e imagens automaticamente.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source_text" className="text-sm font-medium">
                Descrição do Produto <span className="text-muted-foreground font-normal">(ou complemente aqui)</span>
              </Label>
              <Textarea
                id="source_text"
                placeholder="Ex.: Suplemento para queima de gordura, público alvo são mulheres de 30-45 anos, principal benefício é X..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="bg-background border-border min-h-[90px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── PASSO 2: Prompt ── */}
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Direcionamento da IA <span className="text-xs text-muted-foreground font-normal ml-1">(opcional)</span></h4>
              <p className="text-xs text-muted-foreground">Tom, estilo, urgência, storytelling — a IA vai seguir</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <Textarea
              id="prompt"
              placeholder="Ex.: Estilo VSL agressivo, fundo escuro, urgência, conte uma história de transformação, destaque os riscos de não agir agora..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-background border-border min-h-[110px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Sem direcionamento, a IA vai criar a melhor versão possível com base no produto.
            </p>

            <div className="flex items-center gap-3 pt-1 border-t border-border">
              <Languages size={14} className="text-muted-foreground shrink-0" />
              <Label className="text-sm font-medium shrink-0">Idioma:</Label>
              <Select value={acceptLanguage} onValueChange={setAcceptLanguage}>
                <SelectTrigger className="bg-background border-border h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.flag} {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── PASSO 3: Imagens ── */}
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground">Imagens do Site</h4>
              <p className="text-xs text-muted-foreground">A IA vai inserir essas imagens ao montar o layout</p>
            </div>
            {(images.length > 0 || scrapedImagesList.length > 0) && (
              <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">
                {images.length + scrapedImagesList.length}/20
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Arraste ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG · máx. 10MB · até 20 imagens</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
            </div>

            {(images.length > 0 || scrapedImagesList.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {scrapedImagesList.map((url, i) => (
                  <div key={`scraped-${i}`} className="relative group/img">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <button type="button" onClick={() => removeScrapedImage(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={12} /></button>
                  </div>
                ))}
                {images.map((file, i) => (
                  <div key={`file-${i}`} className="relative group/img">
                    <img src={URL.createObjectURL(file)} alt={file.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── EXTRAS: Referência de Estilo (collapsible) ── */}
        <details className="group rounded-xl border border-dashed border-border overflow-hidden">
          <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-secondary/30 transition-colors list-none select-none">
            <Sparkles size={15} className="text-purple-400 shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">Referência de Estilo</span>
              <span className="ml-2 text-xs text-muted-foreground font-normal bg-secondary px-2 py-0.5 rounded-full">Opcional</span>
            </div>
            <ChevronDown size={16} className="text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 pt-4 space-y-4 border-t border-dashed border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tem uma página que você admira o estilo? A IA vai usar a <strong className="text-foreground">estrutura de seções e estilo de copy</strong> dela como molde — o conteúdo será 100% do seu produto.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="style_url" className="text-sm font-medium">URL de Referência</Label>
              <div className="flex gap-2">
                <Input
                  id="style_url"
                  type="url"
                  placeholder="https://pagina-inspiracao.com"
                  value={styleUrl}
                  onChange={(e) => setStyleUrl(e.target.value)}
                  className="bg-background border-border h-10 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1.5 shrink-0 border-purple-500/40 text-purple-400 hover:text-purple-300 hover:border-purple-400"
                  onClick={() => openScraper('style', styleUrl)}
                >
                  <ScanSearch size={14} />
                  Escanear
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="style_text" className="text-sm font-medium">Copy de Referência</Label>
              <Textarea
                id="style_text"
                placeholder="Cole aqui a copy da página referência (preenchido automaticamente ao Escanear)..."
                value={styleText}
                onChange={(e) => setStyleText(e.target.value)}
                className="bg-background border-border min-h-[80px] resize-none"
              />
            </div>
          </div>
        </details>

        {/* Scraper Modal */}
        <ScraperModal
          isOpen={scraperOpen}
          onClose={() => setScraperOpen(false)}
          url={scraperUrl}
          context={scraperContext}
          scrapedText={scraperText}
          scrapedImages={scraperImages}
          isLoading={scraperLoading}
          error={scraperError}
          currentImageCount={images.length + scrapedImagesList.length}
          onInsertCopy={handleScraperInsertCopy}
          onInsertImages={handleScraperInsertImages}
        />
      </div>
    );
  }
};

export default SiteModal;
