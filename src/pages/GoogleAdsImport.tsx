import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, PlayCircle, Plus, CheckCircle2, Globe2, RefreshCw, Trash2, Clock, Zap, ChevronRight, Mail, Power, PowerOff, ShieldCheck, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleAccounts, fetchAdAccounts } from '@/services/api';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { toggleGoogleAdsSync } from '@/services/googleAdsApi';
import { DecryptedText } from '@/components/DecryptedText';
import Logo from '@/components/Logo';

type TabKey = 'import' | 'synced';

const GoogleAdsImport: React.FC = () => {
  const { token, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('synced');

  // ── Import Tab State ──
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [adAccountsByEmail, setAdAccountsByEmail] = useState<Record<string, any[]>>({});
  const [isLoadingAdAccounts, setIsLoadingAdAccounts] = useState<Record<string, boolean>>({});
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, { selected: boolean, name: string }>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Synced Tab State ──
  const [syncedAccounts, setSyncedAccounts] = useState<any[]>([]);
  const [isLoadingSynced, setIsLoadingSynced] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    if (token) {
      loadGoogleAccounts();
      loadSyncedAccounts();
    }
  }, [token]);

  // ── Logic ──
  const loadGoogleAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const data = await fetchGoogleAccounts(token!);
      setGoogleAccounts(data || []);
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar as contas Google.', variant: 'destructive' });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleSelectEmail = async (email: string, googleAccountId: number) => {
    setSelectedEmail(email);
    if (!adAccountsByEmail[email]) {
      loadAdAccounts(googleAccountId, email);
    }
  };

  const loadAdAccounts = async (googleAccountId: number, email: string) => {
    setIsLoadingAdAccounts(prev => ({ ...prev, [email]: true }));
    try {
      const data = await fetchAdAccounts(token!, googleAccountId);
      setAdAccountsByEmail(prev => ({ ...prev, [email]: data || [] }));
    } catch {
      setAdAccountsByEmail(prev => ({ ...prev, [email]: [] }));
    } finally {
      setIsLoadingAdAccounts(prev => ({ ...prev, [email]: false }));
    }
  };

  const toggleSelect = (googleAccountId: number, customerId: string, name: string) => {
    const key = `${googleAccountId}_${customerId}`;
    setSelectedAccounts(prev => {
      const current = prev[key];
      if (current) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: { selected: true, name } };
    });
  };

  const isSelected = (googleAccountId: number, customerId: string) => {
    return !!selectedAccounts[`${googleAccountId}_${customerId}`];
  };

  const getSelectedArray = () => {
    const arr: any[] = [];
    Object.keys(selectedAccounts).forEach(key => {
      const item = selectedAccounts[key] as any;
      if (item && item.selected) {
        const [gaId, custId] = key.split('_');
        arr.push({ google_account_id: parseInt(gaId), customer_id: custId, name: item.name });
      }
    });
    return arr;
  };

  const handleSync = async () => {
    const toSync = getSelectedArray();
    if (toSync.length === 0) return;
    setIsSyncing(true);
    try {
      const res = await api.post('/workspace/google-ads/import-sync', { accounts: toSync });
      if (res.data.success) {
        toast({ 
          title: 'Importação Iniciada!', 
          description: 'As contas foram adicionadas com sucesso. Os dados iniciais podem levar até 15 minutos para aparecerem no painel.',
          variant: 'default'
        });
        setSelectedAccounts({});
        loadSyncedAccounts();
        setActiveTab('synced');
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Falha ao iniciar sincronização', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadSyncedAccounts = async () => {
    setIsLoadingSynced(true);
    try {
      const res = await api.get('/workspace/google-ads/synced-accounts');
      setSyncedAccounts(res.data.data || []);
    } catch {
      setSyncedAccounts([]);
    } finally {
      setIsLoadingSynced(false);
    }
  };

  const handleToggleSync = async (accountId: number) => {
    setTogglingId(accountId);
    try {
      const res = await toggleGoogleAdsSync(token!, accountId);
      toast({ title: res.message });
      loadSyncedAccounts();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao alterar status.', variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleRemoveSync = async (accountId: number) => {
    if (!confirm('Deseja realmente remover esta conta da lista de sincronização?')) return;
    setRemovingId(accountId);
    try {
      await api.delete(`/workspace/google-ads/synced-accounts/${accountId}`);
      toast({ title: 'Removido', description: 'Conta removida com sucesso.' });
      loadSyncedAccounts();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao remover.', variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  const handleConnect = () => {
    if (user?.id) {
       const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8081';
       window.location.href = `${API_BASE_URL}/auth/google/ads?user_id=${user.id}`;
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca sincronizado';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}m atrás`;
    if (diffMin < 1440) return `${Math.round(diffMin/60)}h atrás`;
    return `${Math.round(diffMin/1440)}d atrás`;
  };

  const formatCustomerId = (id: string | number) => {
    const s = String(id).replace(/\D/g, '');
    if (s.length !== 10) return s;
    return `${s.substring(0, 3)}-${s.substring(3, 6)}-${s.substring(6)}`;
  };

  const sortedAds = (ads: any[]) => {
    return [...ads].sort((a, b) => {
      const aS = a.status === 'SUSPENDED' || a.status === 'CANCELED' ? 1 : 0;
      const bS = b.status === 'SUSPENDED' || b.status === 'CANCELED' ? 1 : 0;
      return aS - bS;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe2 className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Google Ads Data</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl ml-1">
            Conecte suas contas do Google Ads e acompanhe métricas de conversão e performance em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleConnect}
            variant="outline"
            className="rounded-xl h-12 px-6 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-95 group font-bold"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform duration-300" /> Nova Conexão
          </Button>
          {activeTab === 'import' && selectedEmail && getSelectedArray().length > 0 && (
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="rounded-xl h-12 px-8 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-bold group"
            >
              {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle size={18} className="mr-2 group-hover:scale-110" />}
              Importar Selecionados ({getSelectedArray().length})
            </Button>
          )}
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-2xl w-fit border border-border/40">
        <button
          onClick={() => setActiveTab('synced')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
            activeTab === 'synced' ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity size={16} /> Contas Importadas
          {syncedAccounts.length > 0 && (
            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{syncedAccounts.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
            activeTab === 'import' ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus size={16} /> Nova Importação
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TAB: IMPORTADOS (SYNCED)                                    */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'synced' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="sf-card-glass bg-emerald-500/5 border-emerald-500/10 flex items-start gap-4 p-5">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Sincronização Ativa</h3>
                 <p className="text-xs text-emerald-600/80 dark:text-emerald-500/70 mt-1">
                   As contas abaixo são atualizadas automaticamente a cada 30 minutos.
                 </p>
              </div>
            </div>

            <div className="sf-card-glass bg-blue-500/5 border-blue-500/10 flex items-start gap-4 p-5">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                 <Clock className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">Processamento Inicial</h3>
                 <p className="text-xs text-blue-600/80 dark:text-blue-500/70 mt-1">
                   Para novas contas, a primeira carga de dados pode levar até <strong>15 minutos</strong> para ser processada e exibida nos relatórios.
                 </p>
              </div>
            </div>
          </div>

          {isLoadingSynced ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground animate-pulse">Carregando contas monitoradas...</p>
            </div>
          ) : syncedAccounts.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5">
                <Globe2 className="w-16 h-16 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">Nenhuma conta importada</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-8">Comece a monitorar dados clicando na aba de Nova Importação.</p>
                <Button onClick={() => setActiveTab('import')} variant="outline" className="rounded-xl font-bold">Importar Primeira Conta</Button>
            </div>
          ) : (
            <div className="sf-card-glass p-0 overflow-hidden border-border/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Conta</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground">ID do Cliente</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Status do Sync</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Última Sincronização</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {syncedAccounts.map((acc) => {
                      const isSuspended = acc.status === 'SUSPENSA';
                      const isPaused = !acc.sync_enabled;
                      const isToggling = togglingId === acc.id;
                      const isRemoving = removingId === acc.id;

                      return (
                        <tr 
                          key={acc.id} 
                          className={cn(
                            "group hover:bg-primary/[0.02] transition-colors",
                            isPaused && "opacity-75"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center border transition-all overflow-hidden",
                                isPaused ? "bg-muted/50 border-border grayscale opacity-50" : isSuspended ? "bg-red-500/10 border-red-500/20" : "bg-primary/5 border-primary/20"
                              )}>
                                <Logo variant="icon" className="!h-6 w-auto" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-extrabold text-foreground">
                                  <DecryptedText value={acc.name} fallbackText="Conta Protegida" />
                                </span>
                                {isSuspended && <span className="text-[9px] font-black text-red-500 uppercase">Suspensa pelo Google</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border/40">
                              {formatCustomerId(acc.external_id)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                isPaused ? "bg-muted" : isSuspended ? "bg-red-500" : "bg-emerald-500 shadow-[0_0_8px_hsl(var(--sf-green))]"
                              )} />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                isPaused ? "text-muted-foreground" : isSuspended ? "text-red-500" : "text-emerald-500"
                              )}>
                                {isPaused ? 'Pausado' : 'Ativo'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock size={12} className="opacity-50" />
                              <span className="text-xs font-bold">{formatLastSync(acc.last_synced_at)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleSync(acc.id)}
                                disabled={isToggling || isSuspended}
                                className={cn(
                                  "h-8 w-8 p-0 rounded-lg transition-all",
                                  isPaused ? "text-emerald-500 hover:bg-emerald-500/10" : "text-orange-500 hover:bg-orange-500/10"
                                )}
                                title={isPaused ? "Ativar Sincronização" : "Pausar Sincronização"}
                              >
                                 {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : isPaused ? <Power size={14} /> : <PowerOff size={14} />}
                              </Button>
                              <Button
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveSync(acc.id)}
                                disabled={isRemoving}
                                className="h-8 w-8 p-0 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
                                title="Remover Conta"
                              >
                                 {isRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 size={14} />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TAB: IMPORTAR (MANUAL)                                      */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'import' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
          {!selectedEmail ? (
            <div className="space-y-6">
              <div className="flex flex-col space-y-1">
                 <h2 className="text-xl font-extrabold flex items-center gap-2">
                    <Mail className="text-primary w-5 h-5" /> Selecione uma Conexão
                 </h2>
                 <p className="text-sm text-muted-foreground">Escolha o e-mail Google para listar as contas do Ads disponíveis.</p>
              </div>

              {isLoadingAccounts ? (
                <div className="py-20 flex flex-col items-center gap-4">
                   <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                   <p className="text-sm text-muted-foreground animate-shimmer text-center">Buscando contas autorizadas...</p>
                </div>
              ) : googleAccounts.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-border/60 rounded-3xl flex flex-col items-center justify-center space-y-4 bg-card/40">
                   <Zap className="w-12 h-12 text-blue-500/30" />
                   <p className="text-base font-bold text-muted-foreground">Nenhuma conta Google vinculada.</p>
                   <Button onClick={handleConnect} className="rounded-xl shadow-lg">Conectar Novo E-mail</Button>
                </div>
              ) : (
                <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {googleAccounts.map(gAcc => (
                    <div 
                      key={gAcc.id}
                      onClick={() => handleSelectEmail(gAcc.google_email, gAcc.id)}
                      className="sf-card group hover:scale-[1.02] cursor-pointer border-border/60 hover:border-primary/50 flex items-center gap-4 p-5 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="relative shrink-0">
                        {gAcc.avatar ? (
                          <img src={gAcc.avatar} alt="" className="w-12 h-12 rounded-2xl border shadow-sm object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm border border-primary/20">
                            {gAcc.google_email.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 relative">
                        <p className="text-sm font-extrabold text-foreground truncate">{gAcc.google_email}</p>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground/60 mt-0.5 flex items-center gap-1 group-hover:text-primary transition-colors">
                           Ver contas <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Back & Active Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedEmail(null)} 
                    className="h-10 w-10 p-0 rounded-full hover:bg-muted"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </Button>
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground">{selectedEmail}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> Conexão Segura
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 px-4 py-2 bg-amber-500/5 border border-amber-500/10 rounded-2xl max-w-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold leading-tight">
                    DICA MCC: Importe as sub-contas individualmente para garantir a visualização das métricas de campanha.
                  </p>
                </div>
              </div>

              {isLoadingAdAccounts[selectedEmail] ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
                  <p className="text-sm text-muted-foreground">Listando contas do Ads API...</p>
                </div>
              ) : (
                <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-xl shadow-foreground/5">
                  <div className="divide-y divide-border/30">
                    {sortedAds(adAccountsByEmail[selectedEmail] || []).map(ad => {
                      const isSuspended = ad.status === 'SUSPENDED' || ad.status === 'CANCELED';
                      const gAccId = googleAccounts.find(g => g.google_email === selectedEmail)?.id;
                      const selected = isSelected(gAccId, ad.id);
                      
                      // Check if already imported
                      const alreadyImported = syncedAccounts.some(sync => String(sync.external_id) === String(ad.id));

                      return (
                        <div
                          key={ad.id}
                          onClick={() => !alreadyImported && toggleSelect(gAccId, ad.id, ad.name)}
                          className={cn(
                            "group flex items-center justify-between p-5 transition-all duration-300",
                            alreadyImported ? "bg-muted/30 cursor-not-allowed" : "hover:bg-primary/[0.02] cursor-pointer",
                            selected && !alreadyImported && "bg-primary/[0.04]"
                          )}
                        >
                          <div className="flex items-center gap-5">
                            <Checkbox
                              checked={selected || alreadyImported}
                              disabled={alreadyImported}
                              onCheckedChange={() => !alreadyImported && toggleSelect(gAccId, ad.id, ad.name)}
                              className={cn(
                                "w-6 h-6 rounded-lg transition-all",
                                alreadyImported ? "bg-muted border-muted" : selected ? "bg-primary border-primary" : "border-border/60 hover:border-primary/50"
                              )}
                            />
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className={cn("text-sm font-extrabold transition-colors", alreadyImported ? "text-muted-foreground" : selected ? "text-primary" : "text-foreground")}>
                                    {ad.name}
                                  </p>
                                  {ad.is_manager && (
                                    <span className="text-[9px] font-black bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border/50">MANAGER (MCC)</span>
                                  )}
                                  {alreadyImported && (
                                    <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                      <CheckCircle2 size={10} /> Já Importado
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-mono font-bold text-muted-foreground/60 tracking-wider transition-colors group-hover:text-foreground/40">{ad.formatted_id}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                              isSuspended ? "bg-red-500/5 text-red-500 border-red-500/20" : "bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                            )}>
                              {isSuspended ? 'Suspensa' : 'Ativa'}
                            </div>
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
      )}
    </div>
  );
};

export default GoogleAdsImport;
