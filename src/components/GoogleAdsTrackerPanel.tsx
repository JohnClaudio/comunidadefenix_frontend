import React, { useState, useEffect, useCallback } from 'react';
import { Tracker } from '@/types/tracker';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Zap,
  Building2,
  Check,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  fetchGoogleAccounts,
  fetchAdAccounts,
  linkTrackerToGoogleAds,
  unlinkTrackerFromGoogleAds,
  ensureTrackerPixel,
} from '@/services/api';
import { cn } from '@/lib/utils';

interface Props {
  tracker: Tracker | null;
  onTrackerUpdated: (updatedTracker: Tracker) => void;
}

const GoogleAdsTrackerPanel: React.FC<Props> = ({ tracker, onTrackerUpdated }) => {
  const { token } = useAuth();
  const { toast } = useToast();

  const connections = tracker?.google_ads_connections || [];

  // Form toggles
  const [showAddForm, setShowAddForm] = useState(false);

  // Google accounts (OAuth connected)
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Ad accounts (customers under a google account)
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(false);

  // Selected accounts for batch linking
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());

  // Form state
  const [selectedGoogleAccountId, setSelectedGoogleAccountId] = useState<number | null>(null);

  // Actions state
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlinkingId, setIsUnlinkingId] = useState<number | null>(null);
  const [isCreatingPixelId, setIsCreatingPixelId] = useState<number | null>(null);

  // ── Load google accounts on mount ───────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoadingAccounts(true);
    fetchGoogleAccounts(token)
      .then(setGoogleAccounts)
      .catch(() => setGoogleAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, [token]);

  // ── Load ad accounts when google account is picked ───────────────────────
  const loadAdAccounts = useCallback(async (accountId: number) => {
    if (!token || !accountId) return;
    setLoadingAdAccounts(true);
    setAdAccounts([]);
    setSelectedAccounts(new Set());
    try {
      const data = await fetchAdAccounts(token, accountId);
      setAdAccounts(data || []);
    } catch (err: any) {
      const msg = err?.message || '';
      const needsReconnect = msg.toLowerCase().includes('reconect') || msg.toLowerCase().includes('token');
      toast({
        variant: 'destructive',
        title: needsReconnect ? 'Token expirado' : 'Erro ao buscar contas',
        description: needsReconnect
          ? 'Sua sessão Google expirou. Por favor, reconecte sua conta em "Contas Google Ads".'
          : (msg || 'Não foi possível buscar as contas de anúncios.'),
      });
    } finally {
      setLoadingAdAccounts(false);
    }
  }, [token, toast]);

  const handleSelectGoogleAccount = (accountId: string) => {
    const id = parseInt(accountId);
    setSelectedGoogleAccountId(id);
    loadAdAccounts(id);
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // Check if an account is already connected
  const isAlreadyConnected = (accountId: string) => {
    const cleanId = accountId.replace(/[-\s]/g, '');
    return connections.some(c => c.google_ads_customer_id?.replace(/[-\s]/g, '') === cleanId);
  };

  // ── Save / link batch of accounts ────────────────────────────────────────
  const handleSaveBatch = async () => {
    if (!token || !tracker || !selectedGoogleAccountId || selectedAccounts.size === 0) return;
    setIsSaving(true);

    let successCount = 0;
    let failCount = 0;

    for (const accountId of Array.from(selectedAccounts)) {
      const adAccount = adAccounts.find(a => a.id.toString() === accountId);
      const isMcc = adAccount?.is_manager ?? false;

      try {
        const res = await linkTrackerToGoogleAds(token, tracker.id, {
          google_account_id: selectedGoogleAccountId,
          google_ads_customer_id: accountId,
          is_mcc: isMcc,
        });
        // Update tracker with latest data
        if (res.data) {
          onTrackerUpdated(res.data);
        }
        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(`Failed to link account ${accountId}:`, err);
      }
    }

    if (successCount > 0) {
      toast({
        title: '🎉 Contas conectadas!',
        description: `${successCount} conta(s) vinculada(s) com sucesso.${failCount > 0 ? ` ${failCount} falharam.` : ''}`,
      });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nenhuma conta foi vinculada.' });
    }

    setShowAddForm(false);
    setSelectedAccounts(new Set());
    setIsSaving(false);
  };

  // ── Unlink ──────────────────────────────────────────────────────────────
  const handleUnlink = async (connectionId: number) => {
    if (!token || !tracker) return;
    setIsUnlinkingId(connectionId);
    try {
      await unlinkTrackerFromGoogleAds(token, tracker.id, connectionId);
      const updatedConnections = connections.filter(c => c.id !== connectionId);
      onTrackerUpdated({ ...tracker, google_ads_connections: updatedConnections });
      toast({ title: 'Desvinculado', description: 'A conta foi removida deste tracker.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsUnlinkingId(null);
    }
  };

  // ────── RENDER ──────────

  if (!tracker) return null;

  const googleAccountsEmpty = !loadingAccounts && googleAccounts.length === 0;

  const hasSuspended = connections.some(c => c.status === 'SUSPENDED');
  const activeAccounts = adAccounts.filter(a => a.status !== 'SUSPENDED' && a.status !== 'CANCELED');
  const inactiveAccounts = adAccounts.filter(a => a.status === 'SUSPENDED' || a.status === 'CANCELED');

  return (
    <div className="space-y-6">
      {/* ── Status de Saúde do Rastreamento ── */}
      <div className={cn(
        "rounded-2xl p-6 border flex items-center justify-between",
        connections.length === 0 ? "bg-secondary/20 border-border" :
        hasSuspended ? "bg-red-500/10 border-red-500/30 text-red-500" :
        "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg",
            connections.length === 0 ? "bg-secondary text-muted-foreground" :
            hasSuspended ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
          )}>
            {connections.length === 0 ? <Zap className="w-6 h-6" /> :
             hasSuspended ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              {connections.length === 0 ? "Google Ads Desconectado" :
               hasSuspended ? "Atenção: Monitoramento em Risco!" : "Vínculo Ativo"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {connections.length === 0 ? "Conecte uma conta para monitorar suas campanhas." :
               hasSuspended ? "Detectamos contas suspensas que podem afetar seus dados." : 
               `Este agrupador está monitorando ${connections.length} conta(s) do Google.`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Lista de Contas Conectadas ── */}
      <div className="space-y-3">
        {connections.map((conn: any) => (
          <div 
            key={conn.id} 
            className={cn(
              "group relative flex items-center justify-between p-4 rounded-xl border transition-all",
              conn.status === 'SUSPENDED' 
                ? "border-red-500/50 bg-red-500/5" 
                : "border-border bg-card"
            )}
          >
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center overflow-hidden">
                 {conn.google_account?.avatar ? <img src={conn.google_account.avatar} className="w-full h-full object-cover" /> : <Zap className="w-4 h-4 text-muted-foreground" />}
               </div>
               <div>
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="text-sm font-semibold font-mono">{conn.google_ads_customer_id?.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3')}</span>
                    <span className="text-[10px] text-muted-foreground">• {conn.google_account?.google_email}</span>
                    {conn.is_mcc && (
                      <Badge variant="outline" className="text-[9px] h-4 uppercase px-1.5 border-blue-500/30 text-blue-500 bg-blue-500/5">MCC</Badge>
                    )}
                    {conn.status === 'SUSPENDED' && (
                      <Badge variant="destructive" className="text-[9px] h-4 uppercase px-1.5">Suspensa</Badge>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2">
               {conn.status === 'SUSPENDED' ? (
                 <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-8 text-[11px] gap-1.5 font-bold shadow-sm"
                    onClick={() => handleUnlink(conn.id)}
                    disabled={isUnlinkingId === conn.id}
                 >
                   {isUnlinkingId === conn.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                   REMOVER CONTA MORTA
                 </Button>
               ) : (
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleUnlink(conn.id)}
                    disabled={isUnlinkingId === conn.id}
                 >
                   {isUnlinkingId === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                 </Button>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Trigger para Adicionar ── */}
      {!showAddForm ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          {connections.length === 0 && (
             <Button onClick={() => setShowAddForm(true)} className="gap-2 h-11 px-8 shadow-xl">
               <Plus className="w-4 h-4" />
               Conectar conta Google ADS
             </Button>
          )}
          {connections.length > 0 && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="text-[11px] font-medium text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
            >
              Adicionar outra conta (Contingência)
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-blue-500/20 bg-card p-6 shadow-xl relative overflow-hidden">
           <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold">Conectar Contas Google Ads</h4>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowAddForm(false); setSelectedAccounts(new Set()); }}>Cancelar</Button>
           </div>
           
           {/* Step 1: Select Google OAuth Account */}
           <div className="space-y-2">
             <Label className="text-xs font-semibold uppercase text-muted-foreground">1. Sua Conta Google</Label>
             {googleAccountsEmpty ? (
                <div className="p-3 border-2 border-dashed border-red-500/20 rounded-xl bg-red-500/5 text-center">
                  <p className="text-[10px] text-red-500 font-medium">Reconecte seu Google</p>
                </div>
             ) : (
               <Select value={selectedGoogleAccountId?.toString() || ''} onValueChange={handleSelectGoogleAccount}>
                 <SelectTrigger className="h-10 text-xs">
                   <SelectValue placeholder="Selecione..." />
                 </SelectTrigger>
                 <SelectContent>
                   {googleAccounts.map((acc: any) => (
                     <SelectItem key={acc.id} value={acc.id.toString()}>
                       <div className="flex items-center gap-2">
                         {acc.avatar && <img src={acc.avatar} className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />}
                         {acc.google_email}
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             )}
           </div>

           {/* Step 2: Show available accounts as selectable list */}
           {selectedGoogleAccountId && (
             <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
               <Label className="text-xs font-semibold uppercase text-muted-foreground">2. Selecione as contas que deseja rastrear</Label>
               
               {loadingAdAccounts ? (
                 <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/30 rounded-xl border border-border">
                   <Loader2 className="w-4 h-4 animate-spin text-primary" />
                   Buscando contas no Google Ads...
                 </div>
               ) : adAccounts.length === 0 ? (
                 <div className="p-4 border-2 border-dashed border-amber-500/20 rounded-xl bg-amber-500/5 text-center">
                   <p className="text-xs text-amber-500">Nenhuma conta encontrada neste perfil Google.</p>
                 </div>
               ) : (
                 <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                   {/* Active accounts first */}
                   {activeAccounts.map((acc) => {
                     const alreadyLinked = isAlreadyConnected(acc.id);
                     const isSelected = selectedAccounts.has(acc.id.toString());

                     return (
                       <button
                         key={acc.id}
                         onClick={() => !alreadyLinked && toggleAccountSelection(acc.id.toString())}
                         disabled={alreadyLinked}
                         className={cn(
                           "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                           alreadyLinked 
                             ? "border-emerald-500/20 bg-emerald-500/5 opacity-70 cursor-not-allowed"
                             : isSelected 
                               ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm" 
                               : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                         )}
                       >
                         <div className="flex items-center gap-3">
                           <div className={cn(
                             "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                             alreadyLinked ? "border-emerald-500 bg-emerald-500" :
                             isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                           )}>
                             {(alreadyLinked || isSelected) && <Check className="w-3 h-3 text-white" />}
                           </div>
                           <div>
                             <div className="flex items-center gap-2">
                               <span className="text-sm font-medium">{acc.name}</span>
                               {acc.is_manager && (
                                 <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-blue-500/30 text-blue-500 bg-blue-500/5 uppercase">
                                   <Building2 className="w-2.5 h-2.5 mr-0.5" /> MCC
                                 </Badge>
                               )}
                             </div>
                             <span className="text-[11px] font-mono text-muted-foreground">{acc.formatted_id}</span>
                           </div>
                         </div>
                         {alreadyLinked && (
                           <span className="text-[9px] font-bold text-emerald-500 uppercase">Já conectada</span>
                         )}
                       </button>
                     );
                   })}
                   
                   {/* Inactive accounts */}
                   {inactiveAccounts.length > 0 && (
                     <>
                       <div className="border-t border-border pt-2 mt-2">
                         <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Contas inativas</p>
                       </div>
                       {inactiveAccounts.map((acc) => (
                         <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 opacity-50 cursor-not-allowed">
                           <div className="w-5 h-5 rounded-md border-2 border-muted-foreground/20" />
                           <div>
                             <div className="flex items-center gap-2">
                               <span className="text-sm font-medium line-through">{acc.name}</span>
                               <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase text-muted-foreground">
                                 {acc.status === 'SUSPENDED' ? 'Suspensa' : 'Cancelada'}
                               </Badge>
                             </div>
                             <span className="text-[11px] font-mono text-muted-foreground">{acc.formatted_id}</span>
                           </div>
                         </div>
                       ))}
                     </>
                   )}
                 </div>
               )}
             </div>
           )}

           {/* Action button */}
           {selectedAccounts.size > 0 && (
             <div className="pt-4 border-t border-border animate-in fade-in zoom-in-95 space-y-4">
                <Button 
                   onClick={handleSaveBatch} 
                   disabled={isSaving}
                   className="w-full gap-2 h-11 bg-primary text-primary-foreground font-bold shadow-lg"
                >
                   {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                   Conectar {selectedAccounts.size} conta{selectedAccounts.size > 1 ? 's' : ''}
                </Button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default GoogleAdsTrackerPanel;
