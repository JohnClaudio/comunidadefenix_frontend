import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGoogleAdsAccounts, linkCampaignTracker } from '@/services/googleAdsApi';
import { createTracker, fetchTrackers } from '@/services/api';
import { GoogleAdsCampaign, GoogleAdsAccount } from '@/types/googleAds';
import { Tracker } from '@/types/tracker';
import { format, subDays } from 'date-fns';
import {
  Sparkles, Package, Link2, ChevronDown, ChevronRight,
  Check, CheckCheck, Loader2, Search, AlertTriangle,
  Wand2, Zap, FolderPlus, X, Eye, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DecryptedText } from '@/components/DecryptedText';
import { useEncryption } from '@/contexts/EncryptionContext';
import { decryptEnvelope, isEncryptedValue } from '@/services/crypto';

// ── Intelligent name grouping engine ──────────────────────────────────────

interface CampaignWithAccount extends GoogleAdsCampaign {
  accountName: string;
  accountId: number;
}

interface ProductSuggestion {
  suggestedName: string;
  campaigns: CampaignWithAccount[];
  confidence: 'high' | 'medium' | 'low';
  totalCost: number;
  totalConversions: number;
  totalConversionValue: number;
}

/**
 * Extracts the core product name from a campaign name by aggressively
 * stripping all Google Ads naming conventions: brackets, parentheses,
 * hashtags, campaign types, strategies, etc.
 */
function extractProductKey(campaignName: string | null | undefined): string {
  let name = (campaignName || '').toLowerCase();

  // 1. Remove all content within brackets and parentheses
  name = name.replace(/\[.*?\]/g, ' ');
  name = name.replace(/\(.*?\)/g, ' ');

  // 2. Remove anything after a '#' symbol
  name = name.split('#')[0];

  // 3. Remove common Google Ads keywords/noise (case-insensitive)
  const noiseWords = [
    'pmax', 'performance', 'max', 'search', 'display', 'video', 'shopping',
    'discovery', 'demand', 'gen', 'app', 'remarketing', 'dsa', 'rlsa', 'brand',
    'broad', 'exact', 'phrase', 'cpa', 'roas', 'maximize', 'maximizar', 'maxmizar',
    'otimizado', 'teste', 'test', 'duplicada', 'duplicado', 'copia', 'copy',
    'review', 'topo', 'meio', 'fundo', 'tof', 'mof', 'bof', 'lookalike',
    'lal', 'retargeting', 'br', 'us', 'pt', 'en', 'es', 'v1', 'v2', 'v3', 'v4', 'v5',
    'campanha', 'campaign', 'oficial', 'gringa', 'brasil', 'brazil', 'leads', 'lead',
    'vendas', 'conversao', 'conversoes', 'conversões', 'conversão', 'trafego'
  ];
  
  // Build a regex to match these words as whole words
  const noiseRegex = new RegExp(`\\b(${noiseWords.join('|')})\\b`, 'gi');
  name = name.replace(noiseRegex, ' ');

  // 4. Remove standalone numbers and currency symbols
  name = name.replace(/\br\$\b/gi, ' ');
  name = name.replace(/\b\d+\b/g, ' ');

  // 5. Clean up remaining special characters and multiple spaces
  name = name.replace(/[^a-z0-9]/gi, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  // If the resulting name is too short or empty, fallback to the first valid word
  if (name.length < 3) {
    const firstWordMatch = (campaignName || '').match(/[a-zA-Z]{2,}/);
    if (firstWordMatch) {
      name = firstWordMatch[0].toLowerCase();
    } else {
      name = (campaignName || '').toLowerCase();
    }
  }

  return name;
}

/**
 * Groups campaigns by similarity using extracted product keys and
 * fuzzy matching via token overlap.
 */
function groupCampaignsBySuggestion(campaigns: CampaignWithAccount[]): ProductSuggestion[] {
  const keyMap = new Map<string, CampaignWithAccount[]>();

  campaigns.forEach(campaign => {
    const key = extractProductKey(campaign.name);
    const existing = keyMap.get(key);
    if (existing) {
      existing.push(campaign);
    } else {
      keyMap.set(key, [campaign]);
    }
  });

  // Merge similar keys (fuzzy token overlap)
  const keys = Array.from(keyMap.keys());
  const mergedKeys = new Map<string, string[]>(); // canonical -> aliases

  keys.forEach(key => {
    let merged = false;
    for (const [canonical, aliases] of mergedKeys.entries()) {
      if (isSimilar(key, canonical, 0.4)) { // Lowered threshold to group more aggressively
        aliases.push(key);
        merged = true;
        break;
      }
    }
    if (!merged) {
      mergedKeys.set(key, [key]);
    }
  });

  const suggestions: ProductSuggestion[] = [];

  for (const [, aliases] of mergedKeys.entries()) {
    const groupCampaigns: CampaignWithAccount[] = [];
    const addedIds = new Set<number>();
    
    aliases.forEach(alias => {
      const group = keyMap.get(alias);
      if (group) {
        group.forEach(c => {
          if (!addedIds.has(c.id)) {
            groupCampaigns.push(c);
            addedIds.add(c.id);
          }
        });
      }
    });

    if (groupCampaigns.length === 0) continue;

    const suggestedName = findBestProductName(groupCampaigns);

    const totalCost = groupCampaigns.reduce((acc, c) => acc + (parseFloat(c.snapshots_sum_cost as any) || 0), 0);
    const totalConversions = groupCampaigns.reduce((acc, c) => acc + (Number(c.snapshots_sum_conversions) || 0), 0);
    const totalConversionValue = groupCampaigns.reduce((acc, c) => acc + (parseFloat(c.snapshots_sum_conversion_value as any) || 0), 0);

    const confidence: 'high' | 'medium' | 'low' = 
      groupCampaigns.length >= 3 ? 'high' : groupCampaigns.length >= 2 ? 'medium' : 'low';

    suggestions.push({
      suggestedName,
      campaigns: groupCampaigns,
      confidence,
      totalCost,
      totalConversions,
      totalConversionValue,
    });
  }

  return suggestions.sort((a, b) => b.totalCost - a.totalCost);
}

function isSimilar(a: string, b: string, threshold: number): boolean {
  if (a === b) return true;
  
  // Check if one starts with the other (e.g., "wifi profts" contains "wifi")
  if (a.startsWith(b) || b.startsWith(a)) return true;
  
  // Token overlap
  const tokensA = new Set(a.split(/\s+/).filter(t => t.length > 2));
  const tokensB = new Set(b.split(/\s+/).filter(t => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return false;
  
  let overlap = 0;
  tokensA.forEach(t => {
    if (tokensB.has(t)) overlap++;
  });
  
  const similarity = overlap / Math.min(tokensA.size, tokensB.size);
  return similarity >= threshold;
}

function findBestProductName(campaigns: CampaignWithAccount[]): string {
  const originalNames = campaigns.map(c => c.name);
  const keys = campaigns.map(c => extractProductKey(c.name));
  
  const freq = new Map<string, number>();
  keys.forEach(k => {
    freq.set(k, (freq.get(k) || 0) + 1);
  });

  // Pick the most frequent extracted name
  let best = '';
  let bestCount = 0;
  freq.forEach((count, key) => {
    if (count > bestCount || (count === bestCount && key.length < best.length)) {
      bestCount = count;
      best = key;
    }
  });

  // Use the extracted key, but capitalize the first letter of each word to make it look like a product name
  return best.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// ── Component ─────────────────────────────────────────────────────────────

interface SmartProductSuggestionsProps {
  dateRange: { from: Date; to: Date };
  onProductCreated?: () => void;
}

const SmartProductSuggestions: React.FC<SmartProductSuggestionsProps> = ({
  dateRange,
  onProductCreated,
}) => {
  const { token } = useAuth();
  const { isPrivacyMode } = usePrivacy();
  const { privateKey } = useEncryption();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [processingGroups, setProcessingGroups] = useState<Set<string>>(new Set());
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});

  // Fetch campaigns
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['googleAdsAccountsSuggestions', format(dateRange.from, 'yyyy-MM-dd'), format(dateRange.to, 'yyyy-MM-dd')],
    queryFn: () => fetchGoogleAdsAccounts(token!, {
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
    }),
    enabled: !!token,
  });

  // Fetch existing trackers
  const { data: trackersData } = useQuery({
    queryKey: ['trackersSuggestions'],
    queryFn: () => fetchTrackers(token!),
    enabled: !!token,
  });

  const trackers: Tracker[] = useMemo(() => {
    if (!trackersData) return [];
    return Array.isArray(trackersData?.data)
      ? trackersData.data as any
      : (trackersData?.data as any)?.data || [];
  }, [trackersData]);

  // Batch decryption of names
  React.useEffect(() => {
    if (!privateKey || !accountsData?.data) return;

    const namesToDecrypt = new Set<string>();
    accountsData.data.forEach((acc: GoogleAdsAccount) => {
      if (acc.name && isEncryptedValue(acc.name)) namesToDecrypt.add(acc.name);
      acc.campaigns?.forEach(camp => {
        if (camp.name && isEncryptedValue(camp.name)) namesToDecrypt.add(camp.name);
      });
    });

    const pending = Array.from(namesToDecrypt).filter(n => !decryptedMap[n]);
    if (pending.length === 0) return;

    let mounted = true;
    const decryptAll = async () => {
      const newDecrypted: Record<string, string> = {};
      for (const enc of pending) {
        try {
          const plain = await decryptEnvelope(enc, privateKey);
          newDecrypted[enc] = plain;
        } catch (e) {
          console.error('Failed to decrypt:', e);
        }
      }
      if (mounted) {
        setDecryptedMap(prev => ({ ...prev, ...newDecrypted }));
      }
    };
    decryptAll();
    return () => { mounted = false; };
  }, [accountsData, privateKey, decryptedMap]);

  // Get only unlinked campaigns
  const unlinkedCampaigns: CampaignWithAccount[] = useMemo(() => {
    if (!accountsData?.data) return [];
    const result: CampaignWithAccount[] = [];
    accountsData.data.forEach((account: GoogleAdsAccount) => {
      account.campaigns.forEach(campaign => {
        if (!campaign.tracker_id) {
          const campName = campaign.name ? (decryptedMap[campaign.name] || campaign.name) : '';
          const accName = account.name ? (decryptedMap[account.name] || account.name) : '';
          
          result.push({
            ...campaign,
            name: campName,
            accountName: accName,
            accountId: account.id,
          });
        }
      });
    });
    return result;
  }, [accountsData, decryptedMap]);

  // Generate smart suggestions
  const suggestions = useMemo(() => {
    const grouped = groupCampaignsBySuggestion(unlinkedCampaigns.filter(c => c.name));
    if (!searchQuery.trim()) return grouped;

    const q = searchQuery.toLowerCase();
    return grouped.filter(s =>
      s.suggestedName.toLowerCase().includes(q) ||
      s.campaigns.some(c => c.name.toLowerCase().includes(q))
    );
  }, [unlinkedCampaigns, searchQuery]);

  // Check if a suggestion name already matches an existing tracker
  const findMatchingTracker = useCallback((name: string): Tracker | undefined => {
    const lower = name.toLowerCase();
    return trackers.find(t => t.name.toLowerCase() === lower);
  }, [trackers]);

  // Create product & link all campaigns
  const handleCreateAndLink = async (suggestion: ProductSuggestion) => {
    if (!token) return;

    const productName = editingNames[suggestion.suggestedName] || suggestion.suggestedName;
    const groupKey = suggestion.suggestedName;

    setProcessingGroups(prev => new Set([...prev, groupKey]));

    try {
      // Check if product with this name already exists
      let trackerId: number;
      const existingTracker = findMatchingTracker(productName);

      if (existingTracker) {
        trackerId = existingTracker.id;
        toast({
          title: 'Produto existente encontrado',
          description: `Vinculando campanhas ao produto "${productName}" já existente.`,
        });
      } else {
        // Create the tracker/product
        const result = await createTracker(token, { name: productName });
        trackerId = result.data.id;
        toast({
          title: 'Produto criado!',
          description: `"${productName}" criado com sucesso.`,
        });
      }

      // Link all campaigns
      let linked = 0;
      for (const campaign of suggestion.campaigns) {
        try {
          await linkCampaignTracker(token, campaign.id, trackerId);
          linked++;
        } catch (err) {
          console.error(`Failed to link campaign ${campaign.id}:`, err);
        }
      }

      toast({
        title: 'Vinculação concluída!',
        description: `${linked}/${suggestion.campaigns.length} campanhas vinculadas ao produto "${productName}".`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['googleAdsAccountsSuggestions'] });
      queryClient.invalidateQueries({ queryKey: ['trackersSuggestions'] });
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
      queryClient.invalidateQueries({ queryKey: ['googleAds'] });
      onProductCreated?.();

    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Falha ao criar produto e vincular campanhas.',
      });
    } finally {
      setProcessingGroups(prev => {
        const next = new Set(prev);
        next.delete(groupKey);
        return next;
      });
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);

  const confidenceConfig = {
    high: { label: 'Alta', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    medium: { label: 'Média', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    low: { label: 'Baixa', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="sf-ai-orb" style={{ width: 48, height: 48 }}>
          <div className="absolute inset-[3px] rounded-full bg-background z-10" />
        </div>
        <p className="text-sm text-muted-foreground">Analisando campanhas...</p>
      </div>
    );
  }

  if (unlinkedCampaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 rounded-2xl bg-emerald-500/5 mb-4">
          <CheckCheck className="w-10 h-10 text-emerald-500/50" strokeWidth={1.5} />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Todas as campanhas estão vinculadas!</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Nenhuma campanha sem vínculo encontrada no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 lg:px-10">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {suggestions.length} agrupamento(s) sugerido(s)
            </h3>
            <p className="text-xs text-muted-foreground">
              {unlinkedCampaigns.length} campanhas sem vínculo detectadas
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar sugestões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background/50 border-border/50"
          />
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3 px-6 lg:px-10 stagger-fade-in">
        {suggestions.map((suggestion) => {
          const isExpanded = expandedGroup === suggestion.suggestedName;
          const isProcessing = processingGroups.has(suggestion.suggestedName);
          const existingTracker = findMatchingTracker(
            editingNames[suggestion.suggestedName] || suggestion.suggestedName
          );
          const conf = confidenceConfig[suggestion.confidence];
          const roi = suggestion.totalCost > 0
            ? (((suggestion.totalConversionValue - suggestion.totalCost) / suggestion.totalCost) * 100).toFixed(2)
            : '0.00';

          return (
            <div
              key={suggestion.suggestedName}
              className={cn(
                "sf-card-glass border transition-all duration-300 overflow-hidden",
                isExpanded ? "border-amber-500/30 shadow-lg shadow-amber-500/5" : "border-border/40 hover:border-border/60"
              )}
            >
              {/* Header Row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setExpandedGroup(isExpanded ? null : suggestion.suggestedName)}
              >
                <button className="shrink-0">
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-amber-400 transition-transform" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className={cn(
                        "font-bold text-sm text-foreground truncate",
                        isPrivacyMode && "blur-md select-none"
                      )}>
                        {editingNames[suggestion.suggestedName] || suggestion.suggestedName}
                      </span>
                    <Badge variant="outline" className={cn("text-[9px] h-5 shrink-0 border", conf.bg, conf.color)}>
                      {conf.label}
                    </Badge>
                    {existingTracker && (
                      <Badge variant="outline" className="text-[9px] h-5 shrink-0 border-amber-500/30 text-amber-400 bg-amber-500/10">
                        Produto já existe
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span>{suggestion.campaigns.length} campanha(s)</span>
                    <span className="text-rose-400 font-medium">{formatCurrency(suggestion.totalCost)}</span>
                    <span>{formatNumber(suggestion.totalConversions)} conv.</span>
                    <span className={cn(
                      "font-medium", 
                      parseFloat(roi) >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>{roi}% ROI</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={isProcessing}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateAndLink(suggestion);
                  }}
                  className={cn(
                    "gap-2 shrink-0 h-9 px-4 shadow-lg transition-all",
                    existingTracker
                      ? "bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20"
                      : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-black shadow-amber-500/20"
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : existingTracker ? (
                    <>
                      <Link2 className="w-4 h-4" />
                      Vincular
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Criar & Vincular
                    </>
                  )}
                </Button>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-border/30 bg-background/30">
                  {/* Editable name */}
                  <div className="p-4 border-b border-border/20 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">Nome do produto:</span>
                    <Input
                      value={editingNames[suggestion.suggestedName] ?? suggestion.suggestedName}
                      onChange={(e) => setEditingNames(prev => ({
                        ...prev,
                        [suggestion.suggestedName]: e.target.value,
                      }))}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 bg-background/50 border-border/50 text-sm font-medium max-w-sm"
                    />
                    {editingNames[suggestion.suggestedName] && editingNames[suggestion.suggestedName] !== suggestion.suggestedName && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNames(prev => {
                            const next = { ...prev };
                            delete next[suggestion.suggestedName];
                            return next;
                          });
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Campaign list */}
                  <div className="divide-y divide-border/20">
                    {suggestion.campaigns.map((campaign) => {
                      const cost = parseFloat(campaign.snapshots_sum_cost as any) || 0;
                      const conversions = Number(campaign.snapshots_sum_conversions) || 0;
                      const convValue = parseFloat(campaign.snapshots_sum_conversion_value as any) || 0;

                      return (
                        <div
                          key={campaign.id}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/10 transition-colors"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "text-sm font-medium text-foreground truncate",
                              isPrivacyMode && "blur-md select-none"
                            )}>
                              <DecryptedText value={campaign.name} />
                            </div>
                            <div className={cn(
                              "text-[10px] text-muted-foreground truncate",
                              isPrivacyMode && "blur-sm select-none"
                            )}>
                              Conta: {campaign.accountName}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 text-[11px]">
                            <span className="text-rose-400 font-mono">{formatCurrency(cost)}</span>
                            <span className="text-muted-foreground font-mono">{formatNumber(conversions)} conv.</span>
                            <span className="text-emerald-400 font-mono">{formatCurrency(convValue)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {suggestions.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Nenhuma sugestão encontrada</h3>
            <p className="text-sm text-muted-foreground">
              Tente buscar por outro termo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartProductSuggestions;
