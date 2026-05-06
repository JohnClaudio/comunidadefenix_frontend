import { Handle, Position, NodeProps } from '@xyflow/react';
import { PieChart, Loader2, Unplug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentRow } from '@/types/googleAdsSegments';

const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

const AUDIENCE_TRANSLATIONS: Record<string, string> = {
    'Home Improvement': 'Melhorias Residenciais',
    'Home & Garden Services': 'Serviços de Casa e Jardim',
    'Home & Garden': 'Casa e Jardim',
    'Tools': 'Ferramentas',
    'Roofing Services': 'Serviços de Telhado',
    'Door & Window Installation': 'Instalação de Portas/Janelas',
    'General Contracting & Remodeling': 'Empreitadas e Remodelação',
    'Flooring Services': 'Serviços de Pisos/Revestimento',
    'CUSTOM_INTENT': 'Intenção Personalizada',
    'CUSTOM_AFFINITY': 'Afinidade Personalizada',
    'IN_MARKET': 'No Mercado (In-Market)',
    'AFFINITY': 'Afinidade',
    'USER_INTEREST': 'Interesse do Usuário',
    'Apparel & Accessories': 'Vestuário e Acessórios',
    'Beauty & Personal Care': 'Beleza e Cuidados Pessoais',
    'Business Services': 'Serviços Financeiros/Comerciais',
    'Computers & Electronics': 'Computadores e Eletrônicos',
    'Education': 'Educação',
    'Employment': 'Emprego',
    'Financial Services': 'Serviços Financeiros',
    'Gifts & Occasions': 'Presentes e Ocasiões',
    'Real Estate': 'Imóveis',
    'Software': 'Software',
    'Travel': 'Viagem',
    'Vehicles & Transportation': 'Veículos e Transporte',
    'Sports & Fitness': 'Esportes e Fitness'
};

const translateAudience = (text: string): string => {
    if (AUDIENCE_TRANSLATIONS[text]) return AUDIENCE_TRANSLATIONS[text];
    
    // Quick fallback replacements
    let t = text;
    t = t.replace('CUSTOM_INTENT', 'Intenção Personalizada');
    t = t.replace('CUSTOM_AFFINITY', 'Afinidade Personalizada');
    t = t.replace('USER_INTEREST', 'Interesse do Usuário');
    t = t.replace('IN_MARKET', 'No Mercado (In-Market)');
    return t;
};

export const SegmentsNode = ({ data, selected }: NodeProps) => {
    const isConnected = data.isConnected as boolean;
    const isLoading = data.isLoading as boolean;

    const segmentData = data.segmentData as Record<string, any> | undefined;
    const audiences = (segmentData?.audience || []) as SegmentRow[];

    // Sort by impressions, descending
    const sortedAudiences = [...audiences].sort((a, b) => b.impressions - a.impressions).slice(0, 100);

    return (
        <div className={cn(
            "bg-background border rounded-xl shadow-lg min-w-[450px] max-w-[500px] transition-all flex flex-col max-h-[400px]",
            selected ? "border-indigo-500 shadow-indigo-500/20" : "border-border"
        )}>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-background" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-t-xl shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <PieChart className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Segmentos (Públicos)</h3>
                        <p className="text-[10px] text-muted-foreground">Desempenho por audiências do Google</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-0 overflow-hidden flex-1 flex flex-col">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <Unplug className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-xs">Conecte a uma fonte</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="overflow-auto nowheel flex-1 custom-scrollbar pb-2">
                        <table className="w-full text-left text-[11px]">
                            <thead className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 shadow-sm">
                                <tr>
                                    <th className="font-medium text-muted-foreground py-2 px-3">Público / Audiência</th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right">Imp.</th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right">Clicks</th>
                                    <th className="font-medium text-muted-foreground py-2 px-2 text-right">Custo</th>
                                    <th className="font-medium text-muted-foreground py-2 px-3 text-right">Conv.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {sortedAudiences.length > 0 ? sortedAudiences.map((row, i) => {
                                    // Extract text depending on segment type
                                    const text = row.segment_data?.name
                                        || row.segment_data?.user_list?.name
                                        || row.segment_data?.type
                                        || row.segment_data?.resolved_type
                                        || 'Público Desconhecido';

                                    const translatedText = translateAudience(text);

                                    return (
                                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-2 px-3 text-foreground font-medium max-w-[150px] truncate" title={translatedText}>
                                                {translatedText}
                                            </td>
                                            <td className="py-2 px-2 text-right text-muted-foreground">{fmtNum(row.impressions)}</td>
                                            <td className="py-2 px-2 text-right text-muted-foreground">{fmtNum(row.clicks)}</td>
                                            <td className="py-2 px-2 text-right text-red-400">{fmtCur(row.cost)}</td>
                                            <td className="py-2 px-3 text-right text-emerald-400 font-bold">{fmtNum(row.conversions)}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                                            Nenhum público alvo coletado
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
