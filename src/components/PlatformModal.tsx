import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Platform } from '@/types/platform';
import { Eye, EyeOff } from 'lucide-react';

interface PlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: Platform | null;
  onSubmit: (data: { platform_id: number; name: string; api_key?: string }) => void;
  isLoading?: boolean;
}

const PlatformModal: React.FC<PlatformModalProps> = ({
  isOpen,
  onClose,
  platform,
  onSubmit,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform) return;
    
    onSubmit({
      platform_id: platform.id,
      name,
      api_key: apiKey || undefined,
    });
  };

  const handleClose = () => {
    setName('');
    setApiKey('');
    setShowApiKey(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {platform?.logo && (
              <img 
                src={platform.logo} 
                alt={platform.name} 
                className="w-8 h-8 object-contain"
              />
            )}
            Vincular {platform?.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da conta na plataforma</Label>
            <Input
              id="name"
              placeholder="Ex: Conta Principal, Loja X, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-secondary/50 border-border"
            />
            <p className="text-xs text-muted-foreground">
              Esse nome é só para sua organização interna.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">API Key (opcional)</Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="Cole aqui sua chave de integração (se houver)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-secondary/50 border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Vinculando...' : 'Confirmar vínculo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlatformModal;
