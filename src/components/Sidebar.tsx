import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Link,
  Globe,
  Crosshair,
  FileText,
  LifeBuoy,
  Target,
  HeartPulse,
  Settings,
  ShieldCheck,
  LogOut,
  Cloud,
  Workflow,
  TrendingUp,
  TrendingDown,
  Package,
  Sword,
  Flame,
  Shield,
  ScrollText,
  Castle,
  Crown,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchUnlinkedCampaignsCount } from '@/services/api';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
  badgeVariant?: 'default' | 'beta' | 'new';
  onboardingKey?: string;
}

interface MenuSection {
  section: string;
  items: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { logout, user, token } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const { data: unlinkedCountData } = useQuery({
    queryKey: ['unlinkedCampaignsCount'],
    queryFn: () => fetchUnlinkedCampaignsCount(token!),
    enabled: !!token,
    refetchInterval: 30000, // Refresh every 30s
  });

  const pendingCount = unlinkedCountData?.count || 0;

  const menuItems: MenuSection[] = [
    {
      section: 'GERAL',
      items: [
        { icon: LayoutDashboard, label: 'Painel Principal', path: '/dashboard', onboardingKey: 'dashboard' },
      ]
    },
    /*
    {
      section: 'TRÁFEGO',
      items: [
        { icon: Activity, label: 'Log em Real', path: '/dashboard/logs', badge: 'Live', badgeVariant: 'default', onboardingKey: 'logs' },
        { icon: BarChart3, label: 'Painel de Métricas', path: '/dashboard/metrics', onboardingKey: 'metrics' },
      ]
    },
    */
    /*
    {
      section: 'CAMPANHAS',
      items: [
        { icon: Target, label: 'Campanhas', path: '/dashboard/campanhas', onboardingKey: 'campanhas' },
        // { icon: HeartPulse, label: 'Saúde das Campanhas', path: '/dashboard/campanhas-saude' },
      ]
    },
    */
    {
      section: 'PRODUTOS',
      items: [
        { 
          icon: Package, 
          label: 'Gestão de Produtos', 
          path: '/dashboard/trackers', 
          onboardingKey: 'trackers',
          badge: pendingCount > 0 ? pendingCount.toString() : undefined,
          badgeVariant: pendingCount > 0 ? 'new' : undefined
        },
      ]
    },
    {
      section: 'INTEGRAÇÕES',
      items: [
        { icon: Cloud, label: 'Conexões', path: '/dashboard/google-ads-import' },
        { icon: BarChart3, label: 'Métricas de Campanhas', path: '/dashboard/google-ads-metrics' },
      ]
    },
    {
      section: 'FINANCEIRO',
      items: [
        { icon: BarChart3, label: 'Resultados Afiliado', path: '/dashboard/financeiro/afiliado' },
        { icon: Castle, label: 'Resultados Empresa', path: '/dashboard/financeiro/empresa' },
        { icon: ScrollText, label: 'Receitas e Despesas', path: '/dashboard/financeiro/lancamentos' },
        { icon: Crown, label: 'Calculadora', path: '/dashboard/financeiro/viabilidade' },
        { icon: Sword, label: 'Garimpagem', path: '/dashboard/financeiro/garimpagem' },
      ]
    },
    /*
    {
      section: 'SISTEMA',
      items: [
        { icon: ShieldCheck, label: 'Criptografia', path: '/dashboard/vault' },
      ]
    },
    */
    /*
    {
      section: 'LABORATÓRIO',
      items: [
        { icon: Workflow, label: 'Storyboard', path: '/dashboard/canvas', badge: 'Beta', badgeVariant: 'beta' },
      ]
    },
    */
    /*
    {
      section: 'SUPORTE',
      items: [
        { icon: LifeBuoy, label: 'Central de Ajuda', path: '/dashboard/support' },
      ]
    },
    */
  ];

  // Dynamically add Admin section if user is admin
  if (user?.role === 'admin') {
    menuItems.push({
      section: 'ADMINISTRAÇÃO',
      items: [
        { icon: Globe, label: 'Plataformas', path: '/dashboard/platforms' },
        { icon: Settings, label: 'Config. do Sistema', path: '/dashboard/settings' },
        { icon: ShieldCheck, label: 'Criptografia', path: '/dashboard/vault' },
      ]
    });
  }

  const getBadgeClass = (variant?: string) => {
    switch (variant) {
      case 'beta':
        return 'text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-violet-500/20 text-violet-400 uppercase tracking-widest';
      case 'new':
        return 'text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-400 uppercase tracking-widest';
      default:
        return 'text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-widest animate-pulse';
    }
  };

  return (
    <div className="dark">
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-60 border-r border-amber-900/20
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
        style={{
          background: 'linear-gradient(180deg, #141010 0%, #0d0a07 100%)',
        }}
      >
        {/* Fixed Logo Header */}
        <div className="h-16 flex items-center justify-center border-b border-amber-900/20 shrink-0 overflow-hidden w-full px-3">
          <div className="flex items-center gap-2">
            <Logo variant="icon" className="!h-9 w-auto drop-shadow-[0_0_12px_rgba(255,140,0,0.3)]" />
            <span
              className="text-amber-200/80 text-sm font-bold tracking-wide"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Comunidade Fênix
            </span>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {menuItems.map((section, sectionIndex) => (
            <React.Fragment key={section.section}>
              {/* Visual divider between groups */}
              {sectionIndex > 0 && (
                <div className="my-2 mx-2 border-t border-amber-900/15" />
              )}

              <div className="mb-1">
                {/* Section Label */}
                <p
                  className="text-[10px] font-semibold text-amber-500/60 uppercase tracking-[0.2em] px-3 py-1.5"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {section.section}
                </p>

                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/dashboard'}
                        data-onboarding={item.onboardingKey || undefined}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm
                          transition-all duration-200 cursor-pointer
                          ${isActive
                            ? 'bg-amber-500/10 text-amber-400 font-medium shadow-[inset_3px_0_0_hsl(30,95%,55%)]'
                            : 'text-amber-200/70 hover:bg-amber-500/5 hover:text-amber-100'
                          }
                        `}
                        onClick={() => window.innerWidth < 1024 && onToggle()}
                      >
                        <item.icon size={16} strokeWidth={1.7} className="shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full',
                              item.badgeVariant === 'new'
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                : item.badgeVariant === 'beta'
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-destructive/20 text-destructive border border-destructive/30'
                            )}
                          >
                            {item.badgeVariant === 'new' ? `${item.badge}` : item.badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </React.Fragment>
          ))}
        </nav>

        {/* User section — always at bottom */}
        <div className="p-3 border-t border-amber-900/20 shrink-0">
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors
              ${isActive ? 'bg-amber-500/10' : 'hover:bg-amber-500/5'}
            `}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-500/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600/60 to-amber-800/20 flex items-center justify-center ring-2 ring-amber-500/20 shrink-0">
                <span className="text-amber-100 font-semibold text-xs">
                  {user?.name?.charAt(0) || 'G'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-100/80 truncate">
                {user?.name || 'Usuário'}
              </p>
              <p className="text-[11px] text-amber-600/40 truncate">
                {user?.role_name || (user?.role === 'admin' ? 'Administrador' : 'Membro')}
              </p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 cursor-pointer text-sm"
          >
            <LogOut size={16} strokeWidth={1.7} />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Spacer to push main content right on desktop */}
      <div className="hidden lg:block w-60 shrink-0" />
    </div>
  );
};

export default Sidebar;
