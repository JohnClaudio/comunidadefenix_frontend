import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, Settings, ChevronDown, Sun, Moon, HelpCircle, RefreshCw, Eye, EyeOff, Flame } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { SplashScreen } from '@/components/SplashScreen';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import OnboardingOverlay from '@/components/onboarding/OnboardingOverlay';
import { usePrivacy } from '@/contexts/PrivacyContext';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="sf-ai-orb">
          <div className="absolute inset-[6px] rounded-full bg-background z-10" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <OnboardingProvider>
      <SplashScreen />
      <OnboardingOverlay />
      <div className="min-h-screen flex bg-background">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Fixed Top Header — Medieval styled */}
          <header className="h-14 border-b border-amber-900/20 flex items-center justify-between px-4 lg:px-6 bg-card/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <Menu size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Last Google Ads Sync Badge */}
              {user?.last_google_ads_import_completed_at && (
                <div
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/20 shadow-sm ml-2"
                  title="Última sincronização de conversões com o Google Ads"
                >
                  <RefreshCw size={12} className="opacity-70" />
                  <span>
                    Google Ads sinc. em {format(parseISO(user.last_google_ads_import_completed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun size={18} className="text-amber-400/60" />
                ) : (
                  <Moon size={18} className="text-muted-foreground" />
                )}
              </button>

              {/* Privacy Mode Toggle */}
              <button
                onClick={togglePrivacyMode}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isPrivacyMode ? "bg-amber-500/10 text-amber-400" : "hover:bg-secondary text-muted-foreground"
                )}
                title={isPrivacyMode ? "Desativar Modo Privacidade" : "Ativar Modo Privacidade (Ocultar dados sensíveis)"}
              >
                {isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-500/20 flex-shrink-0">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-600/60 to-amber-800/30 flex items-center justify-center">
                      <span className="text-amber-100 font-semibold text-xs">
                        {user?.name?.charAt(0) || 'G'}
                      </span>
                    </div>
                  )}
                </div>
                <span className="hidden lg:block text-sm font-medium text-foreground">
                  {user?.name?.split(' ')[0] || 'Usuário'}
                </span>
                <ChevronDown size={14} className="hidden lg:block text-muted-foreground" />
              </button>

            </div>
          </header>

          {/* Page content */}
          <main className="relative flex-1 overflow-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </OnboardingProvider>
  );
};

export default DashboardLayout;
