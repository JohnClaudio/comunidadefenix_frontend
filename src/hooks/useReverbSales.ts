import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Pusher from 'pusher-js';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook que conecta ao Laravel Reverb via Pusher protocol
 * e escuta eventos de venda no canal privado do usuário.
 *
 * Quando uma nova venda chega:
 * 1. Invalida o cache do dashboard (TanStack Query refetch automático)
 * 2. Chama o onSale callback com os dados da venda
 */
export interface SaleEvent {
  sale: {
    id: number;
    amount: number;
    currency: string;
    conversion_value: number;
    platform: string;
    type: string;
    order_id: string;
    created_at: string;
  };
}

interface UseReverbSalesOptions {
  /** Callback quando uma nova venda chega */
  onSale?: (data: SaleEvent) => void;
  /** Se false, desabilita a conexão (ex: loading) */
  enabled?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';

export function useReverbSales(options: UseReverbSalesOptions = {}) {
  const { onSale, enabled = true } = options;
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const pusherRef = useRef<Pusher | null>(null);

  // Guardar referência estável do callback
  const onSaleRef = useRef(onSale);
  onSaleRef.current = onSale;

  const connect = useCallback(() => {
    if (!user?.id || !token || !enabled) return;

    // Evitar conexão duplicada
    if (pusherRef.current) {
      pusherRef.current.disconnect();
    }

    const reverbKey = import.meta.env.VITE_REVERB_APP_KEY || 'sf_reverb_key_2026';
    const reverbHost = import.meta.env.VITE_REVERB_HOST || 'localhost';
    const reverbPort = parseInt(import.meta.env.VITE_REVERB_PORT || '8080');
    const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';

    const pusher = new Pusher(reverbKey, {
      wsHost: reverbHost,
      wsPort: reverbPort,
      wssPort: reverbPort,
      forceTLS: reverbScheme === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
      cluster: '', // Reverb não usa cluster
      authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    // Inscrever no canal privado de vendas do usuário
    const channel = pusher.subscribe(`private-sales.${user.id}`);

    channel.bind('.SaleCreated', (data: SaleEvent) => {
      console.log('[Reverb] Nova venda recebida:', data);

      // 1. Invalida queries do dashboard → refetch automático
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] });

      // 2. Chama callback externo (toast, som, etc)
      onSaleRef.current?.(data);
    });

    pusherRef.current = pusher;
  }, [user?.id, token, enabled, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, [connect]);

  return {
    /** Reconectar manualmente */
    reconnect: connect,
    /** Status da conexão */
    isConnected: !!pusherRef.current,
  };
}
