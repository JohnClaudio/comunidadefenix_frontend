import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPlatforms, createPlatform, updatePlatform } from '@/services/api';
import { Platform } from '@/types/tracker';
import { useToast } from '@/hooks/use-toast';
import { Globe, Plus, Edit2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const PlatformAdmin: React.FC = () => {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

  interface PlatformFormData {
    name: string;
    logo: string;
    logoFile: File | null;
    active: boolean;
  }

  const [formData, setFormData] = useState<PlatformFormData>({
    name: '',
    logo: '',
    logoFile: null,
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPlatforms();
  }, [token]);

  const loadPlatforms = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchPlatforms(token);
      setPlatforms(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as plataformas.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (platform?: Platform) => {
    if (platform) {
      setEditingPlatform(platform);
      setFormData({
        name: platform.name,
        logo: platform.logo || '',
        logoFile: null,
        active: platform.active,
      });
    } else {
      setEditingPlatform(null);
      setFormData({ name: '', logo: '', logoFile: null, active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome é obrigatório.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('active', formData.active ? '1' : '0');
      
      if (formData.logoFile) {
        payload.append('logo', formData.logoFile);
      } else if (formData.logo) {
        payload.append('logo', formData.logo);
      }

      if (editingPlatform) {
        await updatePlatform(token, editingPlatform.id, payload);
        toast({ title: 'Sucesso', description: 'Plataforma atualizada com sucesso!' });
      } else {
        await createPlatform(token, payload);
        toast({ title: 'Sucesso', description: 'Plataforma criada com sucesso!' });
      }
      setIsModalOpen(false);
      loadPlatforms();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Erro ao salvar plataforma.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="w-8 h-8 text-primary" />
            Gestão de Plataformas
          </h1>
          <p className="text-muted-foreground">
            Gerencie as plataformas disponíveis no sistema.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nova Plataforma
        </Button>
      </div>

      <div className="sf-card-glass p-0 overflow-hidden rounded-xl border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">Carregando plataformas...</td>
                </tr>
              ) : platforms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">Nenhuma plataforma cadastrada.</td>
                </tr>
              ) : (
                platforms.map(p => (
                  <tr key={p.id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="px-6 py-4 w-16">
                      {p.logo ? (
                        <img src={p.logo} alt={p.name} className="w-8 h-8 object-contain rounded" />
                      ) : (
                        <div className="w-8 h-8 bg-secondary/80 rounded flex items-center justify-center">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">{p.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${p.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(p)} className="text-muted-foreground hover:text-primary">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border">
          <DialogHeader>
            <DialogTitle>{editingPlatform ? 'Editar Plataforma' : 'Nova Plataforma'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Plataforma</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Hotmart, Monetizze..."
              />
            </div>
            <div className="space-y-2">
              <Label>Logo da Plataforma</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setFormData({ ...formData, logoFile: e.target.files[0], logo: '' });
                  }
                }}
              />
              {!formData.logoFile && formData.logo && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <img src={formData.logo} alt="Logo atual" className="w-6 h-6 object-contain rounded bg-secondary" />
                  <span>Logo atual salva</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={e => setFormData({ ...formData, active: e.target.checked })}
                className="rounded border-border bg-transparent text-primary focus:ring-primary h-4 w-4"
              />
              <Label htmlFor="active" className="cursor-pointer">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Plataforma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformAdmin;
