import React, { useState, useEffect, useMemo } from 'react';
import { Search, Unlink, Loader2, Share2, Layers, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Platform, UserPlatform } from '@/types/platform';
import {
  fetchPlatforms,
  fetchUserPlatforms,
  createUserPlatform,
  deleteUserPlatform
} from '@/services/api';
import PlatformCard from '@/components/PlatformCard';
import PlatformModal from '@/components/PlatformModal';
import { MasterDetailLayout } from '@/components/layout/MasterDetailLayout';
import { cn } from '@/lib/utils';

const Postbacks: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [userPlatforms, setUserPlatforms] = useState<UserPlatform[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [isLoadingUserPlatforms, setIsLoadingUserPlatforms] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'my_integrations' | 'discover'>('my_integrations');

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserPlatform | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    setIsLoadingPlatforms(true);
    setIsLoadingUserPlatforms(true);

    try {
      const [platformsData, userPlatformsData] = await Promise.all([
        fetchPlatforms(token),
        fetchUserPlatforms(token),
      ]);

      setPlatforms(platformsData);
      setUserPlatforms(userPlatformsData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados das plataformas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPlatforms(false);
      setIsLoadingUserPlatforms(false);
    }
  };

  const handleConnect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setIsModalOpen(true);
  };

  const handleSubmitConnection = async (data: { platform_id: number; name: string; api_key?: string }) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      await createUserPlatform(token, data);
      toast({
        title: 'Sucesso',
        description: 'Plataforma vinculada com sucesso!',
      });
      setIsModalOpen(false);
      setSelectedPlatform(null);
      setActiveTab('my_integrations');

      // Reload user platforms
      const userPlatformsData = await fetchUserPlatforms(token);
      setUserPlatforms(userPlatformsData.data || []);
    } catch (error) {
      console.error('Error creating connection:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao vincular plataforma.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteUserPlatform(token, deleteTarget.id);
      toast({
        title: 'Sucesso',
        description: 'Integração removida com sucesso!',
      });
      setDeleteTarget(null);

      // Reload user platforms
      const userPlatformsData = await fetchUserPlatforms(token);
      setUserPlatforms(userPlatformsData.data || []);
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover integração.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPlatforms = useMemo(() => platforms.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [platforms, searchTerm]);

  const filteredUserPlatforms = useMemo(() => userPlatforms.filter(up =>
    up.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    up.platform.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [userPlatforms, searchTerm]);

  const FilterItem = ({ label, count, active, onClick, icon: Icon, colorClass }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group mb-0.5",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className={cn("w-4 h-4", active ? colorClass || "text-primary" : "text-muted-foreground group-hover:text-foreground/70")} />}
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
        )}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <MasterDetailLayout>
      <MasterDetailLayout.Sidebar title="Postbacks & Integrações">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar integrações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/20 h-9"
          />
        </div>

        <div className="space-y-0.5">
          <FilterItem
            label="Minhas Integrações"
            count={userPlatforms.length}
            active={activeTab === 'my_integrations'}
            onClick={() => setActiveTab('my_integrations')}
            icon={Layers}
          />
          <FilterItem
            label="Descobrir/Conectar"
            count={platforms.length}
            active={activeTab === 'discover'}
            onClick={() => setActiveTab('discover')}
            icon={Share2}
            colorClass="text-purple-400"
          />
        </div>

        <div className="mt-8 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Google Ads</h3>
            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1.5 border-dashed bg-background/50 hover:bg-muted">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 5v14M5 12h14"/></svg>
               Connect Ads
            </Button>
          </div>
          <div className="border border-border/60 rounded-lg overflow-hidden bg-background/30 max-h-[200px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
               <thead className="bg-muted/30 border-b border-border/50 sticky top-0 backdrop-blur-sm">
                 <tr>
                   <th className="px-2.5 py-1.5 font-medium text-muted-foreground/70">Conta Conectada</th>
                   <th className="px-2.5 py-1.5 font-medium text-muted-foreground/70 text-right">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border/40">
                 <tr className="hover:bg-muted/20 transition-colors group cursor-pointer">
                   <td className="px-2.5 py-2">
                     <div className="font-medium text-foreground/90 group-hover:text-foreground">MCC Global Ads</div>
                     <div className="text-[10px] text-muted-foreground/70 tracking-tight font-mono mt-0.5">123-456-7890</div>
                   </td>
                   <td className="px-2.5 py-2 text-right align-middle">
                     <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">Vinculado</span>
                   </td>
                 </tr>
                 <tr className="hover:bg-muted/20 transition-colors group cursor-pointer">
                   <td className="px-2.5 py-2">
                     <div className="font-medium text-foreground/90 group-hover:text-foreground">Lançamento Alpha</div>
                     <div className="text-[10px] text-muted-foreground/70 tracking-tight font-mono mt-0.5">987-654-3210</div>
                   </td>
                   <td className="px-2.5 py-2 text-right align-middle">
                     <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">Vinculado</span>
                   </td>
                 </tr>
               </tbody>
            </table>
          </div>
        </div>
      </MasterDetailLayout.Sidebar>

      <MasterDetailLayout.Content>
        <MasterDetailLayout.Header
          title={activeTab === 'my_integrations' ? "Suas Integrações" : "Plataformas Disponíveis"}
          description={activeTab === 'my_integrations' ? "Gerencie as contas já vinculadas" : "Vincule suas plataformas favoritas para receber via webhook"}
        />

        <MasterDetailLayout.Body>
          {activeTab === 'discover' ? (
            // Platform Cards
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 stagger-fade-in">
              {isLoadingPlatforms ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-52 bg-card border border-border rounded-lg animate-pulse" />
                ))
              ) : filteredPlatforms.length === 0 ? (
                <div className="col-span-full py-16 text-center text-muted-foreground">
                  Nenhuma plataforma encontrada.
                </div>
              ) : (
                filteredPlatforms.map((platform) => (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    onConnect={handleConnect}
                  />
                ))
              )}
            </div>
          ) : (
            // My Integrations Table
            <div className="bg-card border border-border rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent bg-muted/30">
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Nome da Integração</TableHead>
                    <TableHead>Postback UUID (Webhook)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUserPlatforms ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground/50" />
                      </TableCell>
                    </TableRow>
                  ) : filteredUserPlatforms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                        <div className="flex flex-col items-center gap-4">
                          <Unlink className="w-10 h-10 text-muted-foreground/30" />
                          <div>
                            <p className="font-medium text-foreground">Você ainda não tem integrações configuradas.</p>
                            <p className="text-sm mt-1">Conecte uma plataforma da aba "Descobrir" para começar a receber eventos.</p>
                          </div>
                          <Button variant="outline" onClick={() => setActiveTab('discover')} className="mt-2">
                            Explorar Plataformas
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUserPlatforms.map((userPlatform) => {
                      const platformData = platforms.find(p => p.id === userPlatform.platform.id);

                      return (
                        <TableRow key={userPlatform.id} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {platformData?.logo ? (
                                <img
                                  src={platformData.logo}
                                  alt={userPlatform.platform.name}
                                  className="w-8 h-8 object-contain rounded-md border border-border/50 bg-background"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-secondary rounded-md border border-border flex items-center justify-center">
                                  <span className="text-xs font-bold">
                                    {userPlatform.platform.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <span className="font-medium">{userPlatform.platform.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{userPlatform.name}</TableCell>
                          <TableCell>
                            <code className="text-xs text-primary bg-primary/10 px-2 py-1 rounded select-all cursor-pointer hover:bg-primary/20 transition-colors tooltip" data-tip="Copiar">
                              {userPlatform.uuid}
                            </code>
                          </TableCell>
                          <TableCell>
                            {userPlatform.active ? (
                              <div className="flex items-center gap-1.5 text-emerald-500">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-medium">Ativo</span>
                              </div>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(userPlatform)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                            >
                              <Unlink size={14} className="mr-1.5" />
                              Desvincular
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </MasterDetailLayout.Body>
      </MasterDetailLayout.Content>

      <PlatformModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlatform(null);
        }}
        platform={selectedPlatform}
        onSubmit={handleSubmitConnection}
        isLoading={isSubmitting}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular integração</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular "{deleteTarget?.name}"?
              Você parará de receber postbacks deste webhook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Removendo...' : 'Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MasterDetailLayout>
  );
};

export default Postbacks;
