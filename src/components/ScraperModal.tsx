import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScanSearch, FileText, ImageIcon, CheckSquare, Square, Loader2, AlertTriangle, ClipboardCopy, Images } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  /** Label shown as the modal title context ('style' or 'product') */
  context: 'style' | 'product';
  scrapedText: string;
  scrapedImages: string[];
  isLoading: boolean;
  error: string | null;
  currentImageCount: number; // how many images are already selected
  onInsertCopy: (text: string) => void;
  onInsertImages: (urls: string[]) => void;
}

const MAX_IMAGES = 20;

const ScraperModal: React.FC<ScraperModalProps> = ({
  isOpen,
  onClose,
  url,
  context,
  scrapedText,
  scrapedImages,
  isLoading,
  error,
  currentImageCount,
  onInsertCopy,
  onInsertImages,
}) => {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [editedText, setEditedText] = useState(scrapedText);

  // Sync text if new scrape
  React.useEffect(() => {
    setEditedText(scrapedText);
    setSelectedImages(new Set());
  }, [scrapedText, scrapedImages]);

  const toggleImage = (url: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        const totalIfAdded = currentImageCount + next.size + 1;
        if (totalIfAdded > MAX_IMAGES) {
          toast.warning(`Limite de ${MAX_IMAGES} imagens atingido`);
          return prev;
        }
        next.add(url);
      }
      return next;
    });
  };

  const handleInsertCopy = () => {
    onInsertCopy(editedText);
    toast.success('Copy inserida!');
    onClose();
  };

  const handleInsertImages = () => {
    if (selectedImages.size === 0) { toast.warning('Selecione ao menos uma imagem'); return; }
    onInsertImages(Array.from(selectedImages));
    toast.success(`${selectedImages.size} imagem(ns) adicionada(s)!`);
    onClose();
  };

  const contextLabel = context === 'style' ? 'Referência de Estilo' : 'Produto';
  const remainingSlots = MAX_IMAGES - currentImageCount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-card border-border p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanSearch size={18} className="text-primary" />
            Resultado do Scan — {contextLabel}
            <span className="ml-2 text-xs font-normal text-muted-foreground truncate max-w-xs">{url}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 p-16 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm">Escaneando a página, aguarde...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-destructive">
              <AlertTriangle size={40} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <Tabs defaultValue="copy" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-4 shrink-0 w-fit">
                <TabsTrigger value="copy" className="gap-2 text-sm">
                  <FileText size={14} /> Copy
                </TabsTrigger>
                <TabsTrigger value="images" className="gap-2 text-sm">
                  <ImageIcon size={14} /> Imagens
                  {scrapedImages.length > 0 && (
                    <span className="ml-1 bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                      {scrapedImages.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Copy Tab */}
              <TabsContent value="copy" className="flex-1 flex flex-col min-h-0 m-0 px-6 pb-6 pt-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Revise ou edite o texto extraído antes de inserir no campo correspondente.
                </p>
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="flex-1 min-h-[200px] resize-none text-sm font-mono bg-background border-border/60"
                />
                <div className="flex justify-end gap-2 mt-4 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={onClose}>Fechar</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    onClick={handleInsertCopy}
                    disabled={!editedText.trim()}
                  >
                    <ClipboardCopy size={14} />
                    Inserir Copy
                  </Button>
                </div>
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="flex-1 flex flex-col min-h-0 m-0 px-6 pb-6 pt-4">
                {scrapedImages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Images size={40} className="opacity-40" />
                    <p className="text-sm">Nenhuma imagem encontrada nessa página.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {selectedImages.size} selecionada(s) · {remainingSlots} slot(s) disponíveis
                      </p>
                      {selectedImages.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedImages(new Set())}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Limpar seleção
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-2">
                        {scrapedImages.map((imgUrl, i) => {
                          const isSelected = selectedImages.has(imgUrl);
                          const isDisabled = !isSelected && (currentImageCount + selectedImages.size) >= MAX_IMAGES;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => !isDisabled && toggleImage(imgUrl)}
                              className={cn(
                                'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group',
                                isSelected
                                  ? 'border-primary shadow-lg shadow-primary/20'
                                  : isDisabled
                                  ? 'border-transparent opacity-40 cursor-not-allowed'
                                  : 'border-transparent hover:border-border cursor-pointer'
                              )}
                            >
                              <img
                                src={imgUrl}
                                alt={`Imagem ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                }}
                              />
                              {/* Overlay */}
                              <div className={cn(
                                'absolute inset-0 flex items-center justify-center transition-all',
                                isSelected
                                  ? 'bg-primary/30'
                                  : 'bg-black/0 group-hover:bg-black/20'
                              )}>
                                {isSelected ? (
                                  <CheckSquare size={22} className="text-white drop-shadow" />
                                ) : (
                                  <Square size={18} className="text-white/0 group-hover:text-white/80 drop-shadow transition-all" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 shrink-0">
                      <Button type="button" variant="outline" size="sm" onClick={onClose}>Fechar</Button>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        onClick={handleInsertImages}
                        disabled={selectedImages.size === 0}
                      >
                        <Images size={14} />
                        Adicionar {selectedImages.size > 0 ? `${selectedImages.size} ` : ''}Selecionada(s)
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScraperModal;
