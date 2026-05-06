import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDomains, createDomain, verifyDomain, deleteDomain } from '@/services/api';
import { Domain, DomainFormData } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Globe, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import DomainCard from '@/components/DomainCard';
import DomainModal from '@/components/DomainModal';
import { MasterDetailLayout } from '@/components/layout/MasterDetailLayout';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { TooltipProvider } from '@/components/ui/tooltip';

const Domains = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);
  const [verifyingDomainId, setVerifyingDomainId] = useState<number | null>(null);

  // Fetch domains
  const { data: domainsData, isLoading, refetch } = useQuery({
    queryKey: ['domains', currentPage],
    queryFn: () => fetchDomains(token!, currentPage),
    enabled: !!token,
  });

  // Create domain mutation
  const createMutation = useMutation({
    mutationFn: (data: DomainFormData) => createDomain(token!, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast.success(response.message || 'Domínio adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar domínio');
    },
  });

  // Verify domain mutation
  const verifyMutation = useMutation({
    mutationFn: (domainId: number) => verifyDomain(token!, domainId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast.success(response.message || 'Status atualizado!');
      setVerifyingDomainId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao verificar domínio');
      setVerifyingDomainId(null);
    },
  });

  // Delete domain mutation
  const deleteMutation = useMutation({
    mutationFn: (domainId: number) => deleteDomain(token!, domainId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast.success(response.message || 'Domínio removido com sucesso!');
      setDomainToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir domínio');
      setDomainToDelete(null);
    },
  });

  const handleCreateDomain = async (data: DomainFormData) => {
    await createMutation.mutateAsync(data);
    setIsModalOpen(false);
  };

  const handleVerifyDomain = (domain: Domain) => {
    setVerifyingDomainId(domain.id);
    verifyMutation.mutate(domain.id);
  };

  const handleDeleteDomain = (domain: Domain) => {
    setDomainToDelete(domain);
  };

  const confirmDelete = () => {
    if (domainToDelete) {
      deleteMutation.mutate(domainToDelete.id);
    }
  };

  const rawDomains = domainsData?.data || [];
  const totalPages = domainsData?.last_page || 1;

  // Filter domains based on search and status
  const domains = useMemo(() => {
    return rawDomains.filter((domain: Domain) => {
      const matchesSearch = domain.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === 'verified' && domain.status !== 'active') return false;
      if (statusFilter === 'pending' && domain.status === 'active') return false;

      return true;
    });
  }, [rawDomains, searchTerm, statusFilter]);

  const verifiedCount = rawDomains.filter((d: Domain) => d.status === 'active').length;
  const pendingCount = rawDomains.filter((d: Domain) => d.status !== 'active').length;

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
    <TooltipProvider>
      <MasterDetailLayout>
        <MasterDetailLayout.Sidebar title="Domínios">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar domínio..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/20 h-9"
            />
          </div>

          <div className="space-y-0.5">
            <FilterItem
              label="Todos os Domínios"
              count={rawDomains.length}
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              icon={Globe}
            />
            <FilterItem
              label="Verificados"
              count={verifiedCount}
              active={statusFilter === 'verified'}
              onClick={() => setStatusFilter('verified')}
              icon={CheckCircle2}
              colorClass="text-emerald-400"
            />
            <FilterItem
              label="Pendentes"
              count={pendingCount}
              active={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
              icon={Clock}
              colorClass="text-warning"
            />
          </div>
        </MasterDetailLayout.Sidebar>

        <MasterDetailLayout.Content>
          <MasterDetailLayout.Header
            title="Domínios e Zonas DNS"
            description="Gerencie seus domínios e sincronização via Cloudflare API."
          >
            <Button variant="outline" onClick={() => refetch()} className="gap-2 h-9 hidden sm:flex">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Atualizar
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20 h-9">
              <Plus className="w-4 h-4" />
              Novo Domínio
            </Button>
          </MasterDetailLayout.Header>

          <MasterDetailLayout.Body>
            {searchTerm && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6 bg-card/50 px-4 py-2 rounded-lg border border-border/50 inline-flex">
                <Search className="w-4 h-4" />
                <span>{domains.length} resultado(s) para "{searchTerm}"</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-primary hover:underline text-xs ml-2 font-medium"
                >
                  Limpar
                </button>
              </div>
            )}

            {/* Domain Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 stagger-fade-in">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 bg-card border border-border rounded-lg animate-pulse" />
                ))
              ) : domains.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center sf-card border-dashed">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm ? 'Nenhum domínio encontrado' : 'Nenhum domínio cadastrado'}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm mb-6">
                    {searchTerm
                      ? 'Tente buscar com outros termos ou limpe os filtros'
                      : 'Adicione seu primeiro domínio conectando automaticamente com sua conta Cloudflare.'
                    }
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                      <Plus size={16} />
                      Conectar Domínio
                    </Button>
                  )}
                </div>
              ) : (
                domains.map((domain: Domain) => (
                  <DomainCard
                    key={domain.id}
                    domain={domain}
                    onVerify={handleVerifyDomain}
                    onDelete={handleDeleteDomain}
                    isVerifying={verifyingDomainId === domain.id}
                    isDeleting={deleteMutation.isPending && domainToDelete?.id === domain.id}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-8 pb-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => setCurrentPage(i + 1)}
                          isActive={currentPage === i + 1}
                          className="cursor-pointer"
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </MasterDetailLayout.Body>
        </MasterDetailLayout.Content>

        {/* Modals outside flow */}
        <DomainModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateDomain}
          isLoading={createMutation.isPending}
        />

        <AlertDialog open={!!domainToDelete} onOpenChange={() => setDomainToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir domínio?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o domínio <span className="font-semibold text-foreground">{domainToDelete?.name}</span>?
                Esta ação também removerá a zona na Cloudflare e não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MasterDetailLayout>
    </TooltipProvider>
  );
};

export default Domains;
