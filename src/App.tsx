import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Auth from "./pages/Auth";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import TrafficLogs from "./pages/TrafficLogs";
import Trackers from "./pages/Trackers";
import GoogleAdsCampaigns from "./pages/GoogleAdsCampaigns";
import CampaignDetail from "./pages/CampaignDetail";
import CampaignHealthView from "./pages/CampaignHealthView";
import StoryboardCanvas from "./pages/StoryboardCanvas";
import Profile from "./pages/Profile";
import GoogleAdsMetrics from "./pages/GoogleAdsMetrics";
import GoogleAdsDashboard from "./pages/GoogleAdsDashboard";
import AdminSettings from "./pages/AdminSettings";
import PlatformAdmin from "./pages/PlatformAdmin";
import NotFound from "./pages/NotFound";
import { EncryptionVaultProvider } from "./contexts/EncryptionContext";
import { PrivacyProvider } from "./contexts/PrivacyContext";
import EncryptionVaultPage from "./pages/EncryptionVaultPage";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";

import GoogleAdsConnections from "./pages/GoogleAdsConnections";
import GoogleAdsImport from "./pages/GoogleAdsImport";
import GoogleAdAccountsManager from "./pages/GoogleAdAccountsManager";

import FinancialAffiliate from "./pages/FinancialAffiliate";
import FinancialCompany from "./pages/FinancialCompany";
import FinancialEntries from "./pages/FinancialEntries";
import FinancialViability from "./pages/FinancialViability";
import FinancialMining from "./pages/FinancialMining";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="sf-webapp-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PrivacyProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Auth />} />
                <Route path="/auth/callback" element={<GoogleAuthCallback />} />
                <Route path="/dashboard" element={<EncryptionVaultProvider><DashboardLayout /></EncryptionVaultProvider>}>
                  <Route index element={<GoogleAdsDashboard />} />
                  <Route path="vault" element={<EncryptionVaultPage />} />
                  <Route path="logs" element={<TrafficLogs />} />
                  <Route path="metrics" element={<DashboardHome />} />
                  <Route path="trackers" element={<Trackers />} />
                  <Route path="campanhas" element={<GoogleAdsCampaigns />} />
                  <Route path="google-ads-connections" element={<GoogleAdsConnections />} />
                  <Route path="google-ads-accounts" element={<GoogleAdAccountsManager />} />
                  <Route path="google-ads-import" element={<GoogleAdsImport />} />
                  <Route path="google-ads-dashboard" element={<GoogleAdsDashboard />} />
                  <Route path="google-ads-metrics" element={<GoogleAdsMetrics />} />
                  <Route path="campanhas-saude" element={<CampaignHealthView />} />
                  <Route path="campanhas/:id" element={<CampaignDetail />} />
                  <Route path="canvas" element={<StoryboardCanvas />} />
                  <Route path="financeiro" element={<Navigate to="/dashboard/financeiro/afiliado" replace />} />
                  <Route path="financeiro/afiliado" element={<FinancialAffiliate />} />
                  <Route path="financeiro/empresa" element={<FinancialCompany />} />
                  <Route path="financeiro/lancamentos" element={<FinancialEntries />} />
                  <Route path="financeiro/viabilidade" element={<FinancialViability />} />
                  <Route path="financeiro/garimpagem" element={<FinancialMining />} />
                  <Route path="support" element={<DashboardHome />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="platforms" element={<PlatformAdmin />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </PrivacyProvider>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
