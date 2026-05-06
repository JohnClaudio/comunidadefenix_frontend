import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BrainCircuit, Loader2, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import ReactMarkdown from 'react-markdown';

interface AIAdvisorResponse {
  success: boolean;
  advice: string;
}

interface AIAdvisorCardProps {
  dateRange: {
    from: string | null;
    to: string | null;
  };
  trackerId: number | null;
}

const AIAdvisorCard: React.FC<AIAdvisorCardProps> = ({ dateRange, trackerId }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-advisor', dateRange, trackerId],
    queryFn: async () => {
      const resp = await api.post<AIAdvisorResponse>('/workspace/dashboard/ai-advice', {
        from: dateRange.from,
        to: dateRange.to,
        tracker_id: trackerId,
      });
      return resp.data;
    },
    enabled: isOpen, // Only fetch when user expands the card
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-[24px] shadow-xl border border-indigo-500/30 overflow-hidden relative group">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />

      <div 
        className="p-6 md:p-8 cursor-pointer relative z-10 flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Conselheiro IA <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
            </h3>
            <p className="text-indigo-200/70 text-sm font-medium">Diagnóstico de funil e leilão em tempo real</p>
          </div>
        </div>
        
        <button className="text-sm font-bold bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors">
          {isOpen ? 'Fechar Análise' : 'Gerar Análise'}
        </button>
      </div>

      {isOpen && (
        <div className="px-6 md:px-8 pb-8 relative z-10 border-t border-white/5 pt-6 mt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-indigo-300">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-400" />
              <p className="animate-pulse font-medium">Cruzando dados de tráfego com o leilão do Google...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">Ocorreu um erro ao gerar a análise. Tente novamente.</p>
            </div>
          ) : data?.advice ? (
            <div className="prose prose-invert prose-indigo max-w-none text-slate-300
              prose-headings:text-white prose-headings:font-bold
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:mb-4
              prose-li:marker:text-indigo-400
              prose-strong:text-indigo-300
            ">
              <ReactMarkdown>{data.advice}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export { AIAdvisorCard };
