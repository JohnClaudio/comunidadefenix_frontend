import React, { useState, useEffect } from 'react';
import { Tracker, TrackerFormData } from '@/types/tracker';
import { 
  X, Loader2, Package, ArrowLeft, ArrowRight, Check, AlertTriangle, 
  Crosshair, AlertCircle, Sparkles, RefreshCw, ExternalLink, 
  ChevronsUpDown, Zap, Globe, Settings, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlatform } from '@/types/platform';
import { 
  fetchUserPlatforms, 
} from '@/services/api';
import { fetchGoogleAdsAccounts, linkCampaignTracker } from '@/services/googleAdsApi';
import { format, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DecryptedText } from '@/components/DecryptedText';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ConversionAction } from '@/types/tracker';
import GoogleAdsTrackerPanel from './GoogleAdsTrackerPanel';

const WIZARD_STEPS = [
  { id: 1, label: 'Informações', icon: Settings },
  { id: 2, label: 'Conexão Google', icon: Globe },
];

interface TrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TrackerFormData) => Promise<any>;
  onSuccess: () => void;
  tracker?: Tracker | null;
  isLoading?: boolean;
}


const TrackerModal: React.FC<TrackerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSuccess,
  tracker,
  isLoading = false,
}) => {
  const { token } = useAuth();
  const { toast } = useToast();

  // ── States ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'config' | 'google_ads'>('config');
  const [adAccountPopoverOpen, setAdAccountPopoverOpen] = useState(false);

  // Platforms
  const [platforms, setPlatforms] = useState<UserPlatform[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);

  // General Fields
  const [formData, setFormData] = useState<TrackerFormData>({
    name: '',
    pixel: '',
    pixel_checkout: '',
    checkout_type: 'standard',
    checkout_url_match: '',
    script_type: 'full_tracker',
    platform_id: undefined,
  });

  // Google Ads States (Wizard)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<number[]>([]);
  const [searchCampaign, setSearchCampaign] = useState('');

  const { data: accountsData, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['googleAdsAccountsList_TrackerModal', token],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
    }),
    enabled: !!token && isOpen && !tracker,
  });

  const availableCampaigns = React.useMemo(() => {
    if (!accountsData?.data) return [];
    return accountsData.data.flatMap(acc => 
      acc.campaigns.map(camp => ({ 
        ...camp, 
        accountName: acc.name,
      }))
    ).filter(c => c.tracker_id === null);
  }, [accountsData]);

  const filteredCampaigns = React.useMemo(() => {
    if (!searchCampaign.trim()) return availableCampaigns;
    const q = searchCampaign.toLowerCase();
    return availableCampaigns.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.accountName.toLowerCase().includes(q)
    );
  }, [availableCampaigns, searchCampaign]);
  
  // Editing logic
  const [liveTracker, setLiveTracker] = useState<Tracker | null>(null);
  const [isSavingFlow, setIsSavingFlow] = useState(false);

  const isEditing = !!tracker;
  const isLinked = !!(liveTracker?.google_ads_connections && liveTracker.google_ads_connections.length > 0);

  // ── Effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !isOpen) return;

    // Load platforms
    const loadPlatforms = async () => {
      setIsLoadingPlatforms(true);
      try {
        const response = await fetchUserPlatforms(token);
        setPlatforms(response.data);
      } catch (err) {
        console.error('Failed to load platforms', err);
      } finally {
        setIsLoadingPlatforms(false);
      }
    };
    loadPlatforms();

    // Wizard accounts will be fetched by useQuery
  }, [token, isOpen, tracker]);

  useEffect(() => {
    if (tracker) {
      setFormData({
        name: tracker.name,
        pixel: tracker.pixel || '',
        pixel_checkout: tracker.pixel_checkout || '',
        checkout_type: tracker.checkout_type || 'standard',
        checkout_url_match: tracker.checkout_url_match || '',
        script_type: tracker.script_type || 'full_tracker',
        platform_id: tracker.platform_id || undefined,
      });
      setLiveTracker(tracker);
      setActiveTab('google_ads');
    } else {
      setFormData({
        name: '',
        pixel: '',
        pixel_checkout: '',
        checkout_type: 'standard',
        checkout_url_match: '',
        script_type: 'full_tracker',
        platform_id: undefined,
      });
      setLiveTracker(null);
      setStep(1);
      setSelectedCampaignIds([]);
    }
  }, [tracker, isOpen]);

  // ── Callbacks ───────────────────────────────────────────────────────

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    setIsSavingFlow(true);
    try {
      const createdTracker = await onSave(formData);
      
      if (!isEditing && createdTracker && createdTracker.id && selectedCampaignIds.length > 0) {
        try {
          await Promise.all(
            selectedCampaignIds.map(campId => 
              linkCampaignTracker(token, campId, createdTracker.id)
            )
          );
          toast({ 
            title: '✅ Agrupador criado e Campanhas vinculadas!', 
            description: 'As campanhas selecionadas foram integradas com sucesso.' 
          });
        } catch (linkErr: any) {
          toast({ 
            variant: 'destructive', 
            title: 'Agrupador Criado, mas erro na Integração', 
            description: linkErr.message || 'Houve um erro ao vincular as campanhas.' 
          });
        }
      } else if (!isEditing) {
         toast({ title: '✅ Agrupador criado!' });
      }
      
      onSuccess();
      onClose();
    } catch (err) {
    } finally {
      setIsSavingFlow(false);
    }
  };

  const handleClose = () => {
    if (!isSavingFlow && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  if (isEditing) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl bg-card border-border p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
            <div className="min-w-0 pr-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground truncate">
                <Crosshair className="w-5 h-5 text-primary shrink-0" />
                <span className="shrink-0">Editando</span>
                <span className="truncate text-primary/80"><DecryptedText value={tracker?.name || "Tracker"} /></span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ajuste os detalhes de identificação e plataforma do agrupador.
              </p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6">
              <form id="edit-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    maxLength={70}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma (Opcional)</Label>
                  <Select value={formData.platform_id?.toString() || 'none'} onValueChange={(val) => setFormData({ ...formData, platform_id: val === 'none' ? undefined : parseInt(val) })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingPlatforms ? 'Carregando...' : 'Selecione uma plataforma...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todas as Plataformas (Geral)</SelectItem>
                      {platforms.map((up) => (
                        <SelectItem key={up.id} value={up.id.toString()}>
                          {up.name} ({up.platform.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </form>
          </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-secondary/20 shrink-0">
               <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading || isSavingFlow}>Cancelar</Button>
               <Button type="submit" form="edit-form" disabled={isLoading || isSavingFlow || !formData.name.trim()} className="min-w-[120px]">
                 {(isLoading || isSavingFlow) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
               </Button>
            </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canProceedStep1 = !!formData.name.trim();
  const totalSteps = 2;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 rounded-none border-0 bg-background flex flex-col [&>button]:hidden">
        <div className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Novo Tracker Inteligente</h2>
              <p className="text-xs text-muted-foreground">Passo {step} de {totalSteps}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((ws, i) => {
              const isActive = step === ws.id;
              const isCompleted = step > ws.id;
              const StepIcon = ws.icon;
              return (
                <React.Fragment key={ws.id}>
                  {i > 0 && <div className={cn("w-8 h-px", isCompleted ? "bg-primary" : "bg-border")} />}
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
                    {isCompleted ? <Check size={14} className="text-primary" /> : <StepIcon size={14} />}
                    <span className="hidden sm:inline">{ws.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto flex items-start justify-center p-8">
          <div className="w-full max-w-2xl">
            
            {step === 1 && (
               <div className="space-y-8 animate-fade-in">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">Identificação do Agrupador</h3>
                    <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
                      Dê um nome para este agrupamento de campanhas e selecione a plataforma de vendas.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="wiz-name" className="text-sm font-medium">Nome do Agrupador <span className="text-primary">*</span></Label>
                      <Input
                        id="wiz-name"
                        placeholder="Ex: [Escala] Produto X - Google Ads"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 bg-card border-border"
                        maxLength={70}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wiz-platform" className="text-sm font-medium">Plataforma Base (Opcional)</Label>
                      <Select value={formData.platform_id?.toString() || 'none'} onValueChange={(val) => setFormData({ ...formData, platform_id: val === 'none' ? undefined : parseInt(val) })}>
                        <SelectTrigger className="h-12 bg-card border-border text-base">
                          <SelectValue placeholder={isLoadingPlatforms ? 'Carregando...' : 'De onde vêm as vendas?'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Todas as Plataformas (Geral)</SelectItem>
                          {platforms.map((up) => (
                            <SelectItem key={up.id} value={up.id.toString()}>
                              {up.name} ({up.platform.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
               </div>
            )}
            {step === 2 && (
               <div className="space-y-8 animate-fade-in">
                 <div className="text-center space-y-2">
                   <h3 className="text-2xl font-bold text-foreground">Seleção de Campanhas</h3>
                   <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
                     Selecione as campanhas que farão parte deste Agrupador. Apenas campanhas sem agrupador vinculado são exibidas.
                   </p>
                 </div>

                 {isLoadingCampaigns ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                      <p>Buscando campanhas disponíveis...</p>
                    </div>
                 ) : availableCampaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-2xl text-center space-y-4">
                      <Package className="w-12 h-12 text-muted-foreground" />
                      <h4 className="text-lg font-semibold text-foreground">Nenhuma campanha disponível</h4>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Todas as suas campanhas do Google Ads já possuem um Agrupador vinculado, ou você não possui campanhas ativas nos últimos 30 dias.
                      </p>
                    </div>
                 ) : (
                    <div className="space-y-4">
                      <Input
                        placeholder="Pesquisar campanha ou conta..."
                        value={searchCampaign}
                        onChange={(e) => setSearchCampaign(e.target.value)}
                        className="h-12 bg-card"
                      />
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                        {filteredCampaigns.map((camp) => {
                          const isSelected = selectedCampaignIds.includes(camp.id);
                          return (
                            <div 
                              key={camp.id}
                              onClick={() => {
                                setSelectedCampaignIds(prev => 
                                  prev.includes(camp.id) ? prev.filter(id => id !== camp.id) : [...prev, camp.id]
                                );
                              }}
                              className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                                isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded flex items-center justify-center border shrink-0",
                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                              )}>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{camp.name}</h4>
                                <p className="text-xs text-muted-foreground truncate">{camp.accountName}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                 )}
               </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="h-20 border-t border-border flex items-center justify-between px-8 shrink-0 bg-card/50 backdrop-blur-sm">
          <Button
            variant="ghost"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1 || isSavingFlow || isLoading}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> Voltar
          </Button>

          {/* Dots */}
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
               disabled={!canProceedStep1}
               className="gap-2 shadow-lg shadow-primary/20"
             >
               Próximo <ArrowRight size={16} />
             </Button>
          ) : (
             <Button
               onClick={handleSubmit}
               disabled={isLoading || isSavingFlow || !formData.name.trim()}
               className="gap-2 shadow-lg shadow-primary/20 min-w-[180px]"
             >
               {isLoading || isSavingFlow ? (
                 <><Loader2 size={16} className="animate-spin" /> Salvando...</>
               ) : (
                 <><Check size={16} /> Criar Agrupador</>
               )}
             </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Shared Tab Button ──────────────────────────────────────────────────
const TabButton = ({
  active,
  onClick,
  children,
  badge,
  badgeColor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center text-sm px-3 py-2.5 border-b-2 transition-colors font-medium',
      active
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    )}
  >
    {children}
    {badge && (
      <span className={cn('ml-1.5 text-[10px]', badgeColor)}>{badge}</span>
    )}
  </button>
);

export default TrackerModal;
