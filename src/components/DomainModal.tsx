import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, AlertCircle, Loader2 } from 'lucide-react';
import { DomainFormData } from '@/types/domain';

interface DomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DomainFormData) => Promise<void>;
  isLoading?: boolean;
}

const DomainModal: React.FC<DomainModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim().toLowerCase();

    // Basic validation
    if (!trimmedName) {
      setError('Por favor, insira um domínio.');
      return;
    }

    // Domain format validation
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(trimmedName)) {
      setError('Formato de domínio inválido. Exemplo: meusite.com');
      return;
    }

    try {
      await onSubmit({ name: trimmedName });
      setName('');
      onClose();
    } catch (err) {
      setError('Erro ao adicionar domínio. Tente novamente.');
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Domínio</DialogTitle>
          <DialogDescription>
            A zona será provisionada automaticamente na Cloudflare.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="domain-name">
              Domínio <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Link2 size={16} />
              </div>
              <Input
                id="domain-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="ex.: exemplo.com"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use apenas o domínio raiz (sem www). Exemplo: <span className="font-medium text-foreground">meusite.com</span>
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Info Alert */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-primary/5 border border-primary/20 px-4 py-3 rounded-lg">
            <AlertCircle size={16} className="text-primary mt-0.5 shrink-0" />
            <span>
              Após salvar, DNS poderá demorar até 24h para propagar adequadamente.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 size={16} className="animate-spin mr-2" />}
              Salvar Domínio
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DomainModal;
