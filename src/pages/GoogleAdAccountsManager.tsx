import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cloud, Loader2, RefreshCw, AlertCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGoogleAdsAccounts, updateGoogleAdsAccountStatus } from '@/services/googleAdsApi';
import { DecryptedText } from '@/components/DecryptedText';
import { cn } from '@/lib/utils';
import { subDays, format } from 'date-fns';

const GoogleAdAccountsManager: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Basic date filter (can be improved if user wants calendar dropdown)
  const [dateRange] = useState({
    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['google-ads-accounts-list', dateRange],
    queryFn: () => fetchGoogleAdsAccounts(token!, dateRange),
    enabled: !!token,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (params: { accountId: number; status: 'ATIVA' | 'SUSPENSA' }) =>
      updateGoogleAdsAccountStatus(token!, params.accountId, params.status),
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['google-ads-accounts-list'] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Falha ao atualizar o status.', variant: 'destructive' });
    },
  });

  const handleToggleStatus = (accountId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ATIVA' ? 'SUSPENSA' : 'ATIVA';
    updateStatusMutation.mutate({ accountId, status: newStatus });
  };

  const accounts = data?.data || [];

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas de Anúncio Google</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie as contas que já foram importadas. Você pode pausar a importação de novas métricas alterando o status para Suspensa.
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 bg-muted hover:bg-muted/80 text-foreground shadow-sm rounded-xl px-5 h-10 transition-all active:scale-95"
          variant="outline"
        >
          <RefreshCw size={16} className={cn(isFetching && "animate-spin")} />
          Atualizar Tabela
        </Button>
      </div>

      <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <h2 className="font-medium text-sm">Todas as Contas Importadas</h2>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent bg-muted/10">
              <TableHead className="w-[300px]">Conta de Anúncios</TableHead>
              <TableHead>Customer ID</TableHead>
              <TableHead>Total Campanhas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ativar / Suspender</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                  <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Cloud className="w-8 h-8 text-blue-500/50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">Nenhuma conta importada</p>
                      <p className="text-sm text-muted-foreground">Suas contas do Google Ads aparecerão aqui após conectar e realizar a importação inicial de campanhas.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account: any) => {
                const isActive = account.status === 'ATIVA' || !account.status;
                const badgesClass = isActive 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20';

                return (
                  <TableRow key={account.id} className="group border-border/50 hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                          <Cloud className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground leading-none">
                            <DecryptedText value={account.name} />
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 tracking-wider uppercase">Conta Importada</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/30 inline-block font-mono">
                        {account.external_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground inline-flex ml-2">
                        {account.campaigns?.length || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full", badgesClass)}>
                        {isActive ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                        <span className="text-xs font-semibold">{isActive ? 'Ativa' : 'Suspensa'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end pr-2">
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => handleToggleStatus(account.id, account.status || 'ATIVA')}
                          disabled={updateStatusMutation.isPending}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GoogleAdAccountsManager;
