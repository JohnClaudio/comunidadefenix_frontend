import React, { useState, useEffect } from 'react';
import { Unlink, Loader2, Plus, CheckCircle2, Eye, HardDrive, Clock, Zap, ShieldCheck, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleAccounts, unlinkGoogleAccount, fetchAdAccounts, fetchGoogleIntegrationLogs } from '@/services/api';
import { GoogleIntegrationLog } from '@/types/tracker';
import { cn } from '@/lib/utils';

// ── Event type config ────────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  oauth_connected: { label: 'Conectado',       icon: ShieldCheck,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  conversion_sent: { label: 'Conversão',       icon: TrendingUp,   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'    },
  pixel_created:   { label: 'Pixel Criado',    icon: Zap,          color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20'},
  pixel_found:     { label: 'Pixel Encontrado',icon: CheckCircle2, color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20'   },
  error:           { label: 'Erro',            icon: AlertCircle,  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20'     },
};

const GoogleAdsConnections: React.FC = () => {
  const { token, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'accounts' | 'history'>('accounts');

  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [viewAccountsTarget, setViewAccountsTarget] = useState<any | null>(null);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Integration history
  const [integrationLogs, setIntegrationLogs] = useState<GoogleIntegrationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'history' && integrationLogs.length === 0) {
      loadLogs();
    }
  }, [activeTab, token]);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await fetchGoogleAccounts(token);
      setGoogleAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar as contas do Google.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!token) return;
    setIsLoadingLogs(true);
    try {
      const res = await fetchGoogleIntegrationLogs(token);
      setIntegrationLogs(res.data?.data || []);
    } catch {
      setIntegrationLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await unlinkGoogleAccount(token, deleteTarget.id);
      toast({ title: 'Sucesso', description: 'Conta desvinculada com sucesso!' });
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao desvincular conta.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewAccounts = async (account: any) => {
    setViewAccountsTarget(account);
    setIsLoadingAccounts(true);
    try {
      const data = await fetchAdAccounts(token!, account.id);
      setAdAccounts(data || []);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao buscar as contas de anúncios.', variant: 'destructive' });
      setAdAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleConnect = () => {
    if (user?.id) {
      const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8081';
      window.location.href = `${API_BASE_URL}/auth/google/ads?user_id=${user.id}`;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Google Ads Connect</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie suas contas do Google Ads para importar métricas e enviar conversões automaticamente.
          </p>
        </div>
        <Button
          onClick={handleConnect}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 rounded-xl px-5 h-10 transition-all active:scale-95"
        >
          <Plus size={16} />
          Conectar Nova Conta
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        <PageTab active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')}>
          Contas Vinculadas
          <span className={cn('ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-medium', activeTab === 'accounts' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
            {googleAccounts.length}
          </span>
        </PageTab>
        <PageTab active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          Histórico de Integrações
        </PageTab>
      </div>

      {/* ── TAB: ACCOUNTS ─────────────────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <h2 className="font-medium text-sm">Suas Contas Vinculadas</h2>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent bg-muted/10">
                <TableHead className="w-[300px]">Conta Google</TableHead>
                <TableHead>Email Principal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : googleAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Unlink className="w-8 h-8 text-blue-500/50" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">Ainda não há contas vinculadas</p>
                        <p className="text-sm text-muted-foreground">Conecte sua conta do Google Ads para liberar insights avançados e controle total de tráfego.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                googleAccounts.map((account) => (
                  <TableRow key={account.id} className="group border-border/50 hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {account.avatar ? (
                          <img
                            src={account.avatar}
                            alt={account.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full ring-2 ring-background border border-border/50 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/20 text-white flex items-center justify-center font-semibold text-sm shadow-sm ring-2 ring-background">
                            {account.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground leading-none">{account.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 tracking-wider uppercase">ID: {account.google_id?.slice(0, 10)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/30 inline-block font-mono">
                        {account.google_email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">Ativo e Vinculado</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewAccounts(account)}
                        className="text-primary hover:bg-primary/10 h-9 px-3 mr-2 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Eye size={15} className="mr-2" />
                        Ver Contas
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(account)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-9 px-3 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Unlink size={15} className="mr-2" />
                        Desvincular
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── TAB: HISTORY ──────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
            <h2 className="font-medium text-sm">Histórico de Integrações</h2>
            <Button variant="ghost" size="sm" onClick={loadLogs} disabled={isLoadingLogs} className="h-8 gap-2 text-xs">
              <RefreshCw className={cn('w-3.5 h-3.5', isLoadingLogs && 'animate-spin')} />
              Atualizar
            </Button>
          </div>

          {isLoadingLogs ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Carregando histórico...</p>
            </div>
          ) : integrationLogs.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center">
                <Clock className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Nenhum evento registrado</p>
                <p className="text-sm text-muted-foreground mt-1">O histórico aparecerá aqui conforme as integrações ocorrerem.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {integrationLogs.map((log) => {
                const config = EVENT_CONFIG[log.event_type] || { label: log.event_type, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' };
                const Icon = config.icon;
                return (
                  <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors group">
                    {/* Icon */}
                    <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', config.bg, config.color)}>
                          {config.label}
                        </span>
                        {log.tracker && (
                          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/40">
                            🎯 {log.tracker.name}
                          </span>
                        )}
                        {log.google_account && (
                          <span className="text-xs text-muted-foreground">
                            {log.google_account.google_email}
                          </span>
                        )}
                      </div>
                      {log.description && (
                        <p className="text-sm text-foreground mt-1">{log.description}</p>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {Object.entries(log.metadata).map(([key, val]) => (
                            <span
                              key={key}
                              className="text-[10px] font-mono bg-muted/50 text-muted-foreground px-2 py-0.5 rounded border border-border/30"
                            >
                              {key}: {String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-[11px] text-muted-foreground flex-shrink-0 mt-0.5">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Desvincular Conta Google</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground pt-2">
              Você está prestes a desvincular o e-mail <span className="text-foreground font-medium bg-muted px-1 rounded">{deleteTarget?.google_email}</span>.
              Dados previamente integrados podem ser retidos, mas a sincronização contínua será interrompida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-lg h-10 px-4">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg h-10 px-6 font-medium tracking-wide transition-colors"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Remoção'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewAccountsTarget} onOpenChange={(open) => !open && setViewAccountsTarget(null)}>
        <DialogContent className="max-w-2xl bg-card border-border sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Contas de Anúncio Vinculadas
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground pt-1">
              Visualizando contas disponíveis para o e-mail Google: <strong className="text-foreground">{viewAccountsTarget?.google_email}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 border border-border/50 rounded-lg overflow-hidden">
            {isLoadingAccounts ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Buscando contas no Google Ads API...</p>
              </div>
            ) : adAccounts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center bg-muted/10">
                <p className="text-sm font-medium text-foreground">Nenhuma conta encontrada.</p>
                <p className="text-xs text-muted-foreground">Este e-mail pode não ter acesso administrador a nenhuma conta.</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm">
                    <TableRow className="border-border/50">
                      <TableHead>Conta Google Ads</TableHead>
                      <TableHead className="text-right">Customer ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adAccounts.map((adAcc) => (
                      <TableRow key={adAcc.id} className="hover:bg-muted/10 border-border/30">
                        <TableCell className="font-medium">{adAcc.name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground text-right">{adAcc.formatted_id}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Page tab helper ──────────────────────────────────────────────────────
const PageTab = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center text-sm px-4 py-2.5 border-b-2 transition-colors font-medium',
      active
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    )}
  >
    {children}
  </button>
);

export default GoogleAdsConnections;
