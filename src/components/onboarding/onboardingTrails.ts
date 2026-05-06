// ── Onboarding Trail & Step Definitions ──
// Each trail represents a feature area the user wants to explore.
// Steps within a trail are shown sequentially with spotlight + tooltip.

export interface TrailStep {
    id: string;
    title: string;
    description: string;
    benefits?: string[];
    spotlightSelector?: string | null; // null = no spotlight, full overlay
    tooltipPosition: 'top' | 'bottom' | 'left' | 'right' | 'center';
    navigateTo?: string;
    icon: string; // lucide icon name
}

export interface Trail {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string; // tailwind color class
    steps: TrailStep[];
}

export const ONBOARDING_TRAILS: Trail[] = [
    {
        id: 'tracking',
        name: 'Rastreamento',
        description: 'Crie links inteligentes, instale o pixel e configure postbacks para rastrear cada venda automaticamente.',
        icon: 'Crosshair',
        color: 'from-violet-500 to-purple-600',
        steps: [
            {
                id: 'tracking-intro',
                title: 'O que é um Tracker?',
                description: 'Um Tracker é um link inteligente que rastreia cada visitante do seu funil. Com ele, você sabe EXATAMENTE de onde veio cada clique, em qual dispositivo, em qual horário.',
                benefits: [
                    'Saiba de onde vem cada visitante',
                    'Rastreie cliques, visitas e vendas em tempo real',
                    'Dados que o Google Ads sozinho NÃO mostra',
                ],
                spotlightSelector: '[data-onboarding="trackers"]',
                tooltipPosition: 'right',
                navigateTo: '/dashboard',
                icon: 'Crosshair',
            },
            {
                id: 'tracking-create',
                title: 'Crie seu Primeiro Tracker',
                description: 'Dê um nome ao seu tracker, escolha a URL de destino e pronto. Cada tracker gera uma URL única que captura dados automaticamente a cada clique.',
                spotlightSelector: '[data-onboarding="trackers"]',
                tooltipPosition: 'right',
                navigateTo: '/dashboard/trackers',
                icon: 'Plus',
            },
            {
                id: 'tracking-pixel',
                title: 'Instale o Pixel SF no seu Site',
                description: 'O Pixel SF é um pequeno script que você cola no <head> do seu site. Ele captura automaticamente: visitas, cliques em botões, checkouts e vendas. Sem ele, o rastreamento não funciona.',
                benefits: [
                    'Instalação em 2 minutos',
                    'Rastreia toda a jornada do visitante',
                    'Funciona com qualquer plataforma (WordPress, Shopify, etc)',
                ],
                spotlightSelector: null,
                tooltipPosition: 'center',
                icon: 'Code',
            },

            {
                id: 'tracking-flow',
                title: 'Como Tudo Funciona Junto',
                description: 'O fluxo completo é simples:\n\n1️⃣ Visitante clica no seu Tracker\n2️⃣ Visita o site (Pixel captura)\n3️⃣ Faz checkout (Pixel rastreia)\n4️⃣ Compra (Postback avisa o SF ADS)\n5️⃣ Você vê a venda em tempo real 🎉\n\nTodos os dados ficam conectados: da primeira impressão até a venda.',
                spotlightSelector: null,
                tooltipPosition: 'center',
                icon: 'Workflow',
            },
        ],
    },
    {
        id: 'campaigns',
        name: 'Campanhas Google Ads',
        description: 'Importe dados do Google Ads e vincule campanhas aos seus trackers para ver métricas REAIS.',
        icon: 'BarChart3',
        color: 'from-blue-500 to-cyan-500',
        steps: [
            {
                id: 'campaigns-why',
                title: 'Por que importar dados?',
                description: 'O Google Ads mostra dados estimados de conversão. Aqui no SF ADS, você cruza esses dados com as vendas REAIS do seu site — resultado? O verdadeiro ROAS e CPA que você precisa pra tomar decisões.',
                benefits: [
                    'Dados diários detalhados (impressões, cliques, custo)',
                    'Orçamento e CPA acompanhados dia a dia',
                    'Histórico completo dentro do SF ADS',
                ],
                spotlightSelector: '[data-onboarding="campanhas"]',
                tooltipPosition: 'right',
                navigateTo: '/dashboard',
                icon: 'BarChart3',
            },
            {
                id: 'campaigns-import',
                title: 'Como Importar do Google Ads',
                description: 'O processo é simples:\n\n1️⃣ Copie o script de importação (disponível na área de campanhas)\n2️⃣ Acesse o Google Ads → Ferramentas → Scripts\n3️⃣ Cole o script e agende execução diária\n4️⃣ Os dados chegam automaticamente ao SF ADS\n\nUma vez configurado, funciona sozinho para sempre.',
                spotlightSelector: null,
                tooltipPosition: 'center',
                navigateTo: '/dashboard/campanhas',
                icon: 'Download',
            },
            {
                id: 'campaigns-link',
                title: 'Vincule Campanha ao Tracker',
                description: 'Essa é a MÁGICA do SF ADS! ✨\n\nVincular uma campanha Google Ads a um Tracker conecta os dados de custo com as vendas reais. O resultado:',
                benefits: [
                    'ROAS REAL (não o estimado do Google)',
                    'CPA Real por campanha',
                    'Funil completo: Impressão → Clique → Visita → Checkout → Venda',
                    'Decisões de escala baseadas em dados concretos',
                ],
                spotlightSelector: null,
                tooltipPosition: 'center',
                navigateTo: '/dashboard/campanhas',
                icon: 'Link2',
            },
            {
                id: 'campaigns-analysis',
                title: 'Analise suas Campanhas',
                description: 'Clique em qualquer campanha para ver:\n\n📊 Métricas diárias detalhadas\n💰 Mudanças de orçamento ao longo do tempo\n🎯 CPA desejado vs CPA real por dia\n👥 Insights por dispositivo, gênero, idade\n🔍 Termos de pesquisa que mais convertem',
                spotlightSelector: null,
                tooltipPosition: 'center',
                icon: 'TrendingUp',
            },
        ],
    },

    {
        id: 'analytics',
        name: 'Análise de Tráfego',
        description: 'Acompanhe visitantes, logs e métricas em tempo real no dashboard completo.',
        icon: 'Activity',
        color: 'from-emerald-500 to-green-500',
        steps: [
            {
                id: 'analytics-dashboard',
                title: 'Seu Dashboard',
                description: 'Visão geral de tudo em um só lugar: visitantes ativos, conversões, receita, top países, dispositivos. Tudo atualizado em tempo real.',
                spotlightSelector: '[data-onboarding="dashboard"]',
                tooltipPosition: 'right',
                navigateTo: '/dashboard',
                icon: 'LayoutDashboard',
            },
            {
                id: 'analytics-logs',
                title: 'Logs de Tráfego',
                description: 'Veja CADA visitante individualmente: de onde veio, por onde navegou, quanto tempo ficou, se converteu ou não. Como ter câmeras de segurança no seu funil.',
                spotlightSelector: '[data-onboarding="logs"]',
                tooltipPosition: 'right',
                navigateTo: '/dashboard',
                icon: 'FileText',
            },
            {
                id: 'analytics-metrics',
                title: 'Métricas Avançadas',
                description: 'Descubra padrões e otimize seu tráfego:\n\n🌍 Top países e regiões\n📱 Dispositivos mais usados\n⏱️ Tempo médio na página\n📉 Taxa de rejeição\n🔄 Taxa de retorno',
                spotlightSelector: null,
                tooltipPosition: 'center',
                icon: 'PieChart',
            },
        ],
    },
];
