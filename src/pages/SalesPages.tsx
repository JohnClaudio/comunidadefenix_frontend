import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchSites,
  createSite,
  updateSite,
  deleteSite,
  captureSite,
  fetchDomains,
  fetchTrackers
} from '@/services/api';
import { Site, SiteFormData, SiteUpdateData } from '@/types/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, FileImage, LayoutGrid, FileText, Globe } from 'lucide-react';
import { toast } from 'sonner';
import SiteCard from '@/components/SiteCard';
import SiteModal from '@/components/SiteModal';
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
import { useEffect } from 'react';
import { createEcho } from '@/lib/echo';

const SalesPages = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ai_builder' | 'pressel'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [capturingId, setCapturingId] = useState<number | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>('all');

  // Define the Site Data Query
  const { data: sitesData, isLoading, refetch } = useQuery({
    queryKey: ['sites', currentPage, searchTerm],
    queryFn: () => fetchSites(token!, currentPage, searchTerm),
    enabled: !!token,
  });

  // Fetch domains for modal and filter
  const { data: domainsData } = useQuery({
    queryKey: ['domains-all'],
    queryFn: async () => {
      const result = await fetchDomains(token!, 1);
      return result.data;
    },
    enabled: !!token,
  });

  // Fetch trackers for modal
  const { data: trackersData } = useQuery({
    queryKey: ['trackers-all'],
    queryFn: async () => {
      const result = await fetchTrackers(token!);
      return result.data.data;
    },
    enabled: !!token,
  });

  // Create site mutation
  const createMutation = useMutation({
    mutationFn: (data: SiteFormData) => createSite(token!, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success(response.message || 'Site criado com sucesso!');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar site');
    },
  });

  // Update site mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SiteUpdateData }) =>
      updateSite(token!, id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success(response.message || 'Página atualizada com sucesso!');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar página');
    },
  });

  // Delete site mutation
  const deleteMutation = useMutation({
    mutationFn: (siteId: number) => deleteSite(token!, siteId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success(response.message || 'Site removido com sucesso!');
      setSiteToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir site');
      setSiteToDelete(null);
    },
  });

  // Capture screenshot mutation
  const captureMutation = useMutation({
    mutationFn: (siteId: number) => captureSite(token!, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Screenshot capturado com sucesso!');
      setCapturingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao capturar screenshot');
      setCapturingId(null);
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSite(null);
  };

  const handleSubmit = (data: SiteFormData) => {
    if (selectedSite) {
      // Update uses flat fields
      const updateData: SiteUpdateData = {
        name: data.name,
        domain_id: data.domain_id,
        subdomain: data.subdomain,
        slug: data.slug,
        tracker_id: data.tracker_id,
        aff_link: data.aff_link,
        url: data.type === 'pressel' ? (data as any).url : undefined,
        accept_language: data.type === 'ai_builder' ? (data as any).accept_language : undefined,
      };
      updateMutation.mutate({ id: selectedSite.id, data: updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleView = (site: Site) => {
    const url = site.slug ? `https://${site.host}/${site.slug}` : `https://${site.host}`;
    window.open(url, '_blank');
  };

  const handleEdit = (site: Site) => {
    if (site.type === 'ai_builder') {
      navigate(`/dashboard/sales-pages/${site.id}/editor`);
      return;
    }
    setSelectedSite(site);
    setIsModalOpen(true);
  };

  const handleDelete = (site: Site) => {
    setSiteToDelete(site);
  };

  const handleConfig = (site: Site) => {
    setSelectedSite(site);
    setIsModalOpen(true);
  };

  const handleCapture = (site: Site) => {
    setCapturingId(site.id);
    captureMutation.mutate(site.id);
  };

  const confirmDelete = () => {
    if (siteToDelete) {
      deleteMutation.mutate(siteToDelete.id);
    }
  };

  const rawSites = sitesData?.data.data || [];
  const totalPages = sitesData?.data.last_page || 1;

  const sites = useMemo(() => {
    return rawSites.filter((site: Site) => {
      if (typeFilter !== 'all' && site.type !== typeFilter) return false;
      if (domainFilter !== 'all' && site.domain_id?.toString() !== domainFilter) return false;
      return true;
    });
  }, [rawSites, typeFilter, domainFilter]);

  const allCount = rawSites.length;
  const builderCount = rawSites.filter((s: Site) => s.type === 'ai_builder').length;
  const presellCount = rawSites.filter((s: Site) => s.type === 'pressel').length;

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
      <MasterDetailLayout.Sidebar title="Páginas (LPs)">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar páginas..."
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
            label="Todas as Páginas"
            count={allCount}
            active={typeFilter === 'all'}
            onClick={() => setTypeFilter('all')}
            icon={LayoutGrid}
          />
          <FilterItem
            label="Geradas por IA"
            count={builderCount}
            active={typeFilter === 'ai_builder'}
            onClick={() => setTypeFilter('ai_builder')}
            icon={FileText}
            colorClass="text-purple-400"
          />
          <FilterItem
            label="Clonadas (Presell)"
            count={presellCount}
            active={typeFilter === 'pressel'}
            onClick={() => setTypeFilter('pressel')}
            icon={Globe}
            colorClass="text-blue-400"
          />
        </div>

        <div className="mt-6 border-t border-border/40 pt-6">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-3">
            Domínios
          </h3>
          <div className="space-y-0.5 max-h-[300px] overflow-y-auto no-scrollbar pb-4">
            <FilterItem
              label="Todos os Domínios"
              active={domainFilter === 'all'}
              onClick={() => setDomainFilter('all')}
              icon={LayoutGrid}
            />
            {domainsData?.map((d: any) => {
              const count = rawSites.filter((s: Site) => s.domain_id === d.id).length;
              return (
                <button
                  key={d.id}
                  onClick={() => setDomainFilter(d.id.toString())}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group mb-0.5",
                    domainFilter === d.id.toString()
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <Globe className={cn(
                      "w-4 h-4 flex-shrink-0",
                      domainFilter === d.id.toString() ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground/70"
                    )} />
                    <span className="truncate">{d.name}</span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium ml-2 shrink-0",
                    domainFilter === d.id.toString() ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </MasterDetailLayout.Sidebar>

      <MasterDetailLayout.Content>
        <MasterDetailLayout.Header
          title="Sites & Landing Pages"
          description="Gerencie seus sites, presells e landing pages."
        >
          <Button variant="outline" onClick={() => refetch()} className="gap-2 h-9 hidden sm:flex">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Atualizar
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20 h-9">
            <Plus className="w-4 h-4" />
            Novo Site
          </Button>
        </MasterDetailLayout.Header>

        <MasterDetailLayout.Body>
          {searchTerm && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6 bg-card/50 px-4 py-2 rounded-lg border border-border/50 inline-flex">
              <Search className="w-4 h-4" />
              <span>{sites.length} resultado(s) para "{searchTerm}"</span>
              <button
                onClick={() => setSearchTerm('')}
                className="text-primary hover:underline text-xs ml-2 font-medium"
              >
                Limpar
              </button>
            </div>
          )}

          {/* Sites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 stagger-fade-in">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-card border border-border rounded-xl animate-pulse" />
              ))
            ) : sites.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center sf-card border-dashed">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileImage className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm ? 'Nenhum site encontrado' : 'Nenhum site cadastrado'}
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-6">
                  {searchTerm
                    ? 'Tente buscar com outros termos ou remova os filtros.'
                    : 'Adicione seu primeiro site clonado ou crie um do zero com Inteligência Artificial.'
                  }
                </p>
                {!searchTerm && typeFilter === 'all' && (
                  <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                    <Plus size={16} />
                    Adicionar Site
                  </Button>
                )}
              </div>
            ) : (
              sites.map((site: Site) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  onView={handleView}
                  onEdit={handleEdit}
                  onConfig={handleConfig}
                  onDelete={handleDelete}
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
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
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

      {/* Modals */}
      <SiteModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        site={selectedSite}
        domains={domainsData || []}
        trackers={trackersData || []}
        onSubmit={handleSubmit}
        onCapture={handleCapture}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isCapturing={capturingId === selectedSite?.id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!siteToDelete} onOpenChange={() => setSiteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir site?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o site <span className="font-semibold text-foreground">{siteToDelete?.slug}</span>?
              Esta ação também removerá o subdomínio na Cloudflare e não pode ser desfeita.
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
  );
};

export default SalesPages;
