import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserPrompts, createUserPrompt, deleteUserPrompt, UserPrompt } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookMarked, Save, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PromptLibraryPanelProps {
  currentPrompt: string;
  onLoad: (content: string) => void;
}

const PromptLibraryPanel: React.FC<PromptLibraryPanelProps> = ({ currentPrompt, onLoad }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');

  const { data: promptsData, isLoading } = useQuery({
    queryKey: ['user-prompts'],
    queryFn: () => fetchUserPrompts(token!),
    enabled: !!token,
  });

  const prompts: UserPrompt[] = promptsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: { name: string; content: string }) => createUserPrompt(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-prompts'] });
      toast.success('Prompt salvo com sucesso!');
      setSaveName('');
      setIsSaving(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUserPrompt(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-prompts'] });
      toast.success('Prompt excluído.');
      setSelectedId('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleLoad = () => {
    const found = prompts.find((p) => p.id.toString() === selectedId);
    if (found) {
      onLoad(found.content);
      toast.success(`"${found.name}" carregado`);
    }
  };

  const handleSave = () => {
    if (!saveName.trim()) { toast.error('Informe um nome para o prompt'); return; }
    if (!currentPrompt.trim()) { toast.error('O campo de instruções está vazio'); return; }
    createMutation.mutate({ name: saveName.trim(), content: currentPrompt });
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const found = prompts.find((p) => p.id.toString() === selectedId);
    if (found && window.confirm(`Excluir o prompt "${found.name}"?`)) {
      deleteMutation.mutate(found.id);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border/60 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <BookMarked size={15} className="text-primary" />
        Biblioteca de Prompts
      </div>

      {/* Load row */}
      <div className="flex gap-2">
        <Select
          value={selectedId}
          onValueChange={setSelectedId}
          disabled={isLoading || prompts.length === 0}
        >
          <SelectTrigger className="flex-1 h-9 bg-background border-border/60 text-sm">
            <SelectValue placeholder={
              isLoading ? 'Carregando...' :
              prompts.length === 0 ? 'Nenhum prompt salvo ainda' :
              'Selecionar prompt salvo...'
            } />
          </SelectTrigger>
          <SelectContent>
            {prompts.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 shrink-0"
          disabled={!selectedId}
          onClick={handleLoad}
        >
          Carregar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-9 px-2 shrink-0 text-destructive hover:text-destructive', !selectedId && 'opacity-40')}
          disabled={!selectedId || deleteMutation.isPending}
          onClick={handleDelete}
        >
          <Trash2 size={15} />
        </Button>
      </div>

      {/* Save row */}
      {isSaving ? (
        <div className="flex gap-2">
          <Input
            placeholder="Nome do prompt (ex: VSL Agressivo)"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="flex-1 h-9 bg-background border-border/60 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
            autoFocus
          />
          <Button type="button" size="sm" className="h-9 shrink-0" onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2 shrink-0" onClick={() => setIsSaving(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsSaving(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus size={13} />
          <Save size={13} />
          Salvar prompt atual
        </button>
      )}
    </div>
  );
};

export default PromptLibraryPanel;
