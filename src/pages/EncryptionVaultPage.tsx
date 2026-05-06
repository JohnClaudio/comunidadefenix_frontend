import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEncryption } from '@/contexts/EncryptionContext';
import { unlockPrivateKey } from '@/services/crypto';
import {
  Shield, KeyRound, Lock, Unlock, AlertTriangle, Eye, EyeOff,
  CheckCircle2, ShieldAlert, Database, Loader2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sonhosfuncionando.com.br/api/v1';

const EncryptionVaultPage: React.FC = () => {
  const { token } = useAuth();
  const { isUnlocked, unlockVault, lockVault } = useEncryption();
  const { toast } = useToast();

  const [hasKeys, setHasKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Setup safety
  const [acceptedRisk, setAcceptedRisk] = useState(false);

  // Retroactive migration
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [migrateConfirmText, setMigrateConfirmText] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (token) checkKeyStatus();
  }, [token]);

  const checkKeyStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/encryption/keys/status`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setHasKeys(data.has_active_key);
      }
    } catch (e) {
      console.error('[Vault] Status check failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Setup (first-time) ─────────────────────────────────
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Atenção', description: 'A senha deve ter pelo menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Atenção', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    if (!acceptedRisk) {
      toast({ title: 'Atenção', description: 'Você precisa aceitar os termos para continuar.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const setupRes = await fetch(`${API_BASE_URL}/encryption/keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ passphrase: password, passphrase_confirmation: password })
      });

      const setupData = await setupRes.json();
      if (!setupRes.ok) throw new Error(setupData.message || 'Falha ao gerar chaves');

      const keysRes = await fetch(`${API_BASE_URL}/encryption/keys/current`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const keysData = await keysRes.json();

      const privateKeyPem = await unlockPrivateKey(
        keysData.encrypted_private_key, keysData.salt, keysData.iv, password
      );

      await unlockVault(privateKeyPem);
      setHasKeys(true);
      setPassword('');
      setConfirmPassword('');
      setAcceptedRisk(false);
      toast({ title: '🔐 Criptografia Ativada!', description: 'Seus dados agora estão protegidos com criptografia de ponta a ponta.' });

    } catch (e: any) {
      console.error('[Vault] Setup error:', e);
      toast({ title: 'Erro', description: e.message || 'Erro ao configurar criptografia', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Unlock ─────────────────────────────────────────────
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsProcessing(true);
    try {
      const validateRes = await fetch(`${API_BASE_URL}/encryption/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ passphrase: password })
      });

      const validateData = await validateRes.json();
      if (!validateRes.ok) throw new Error(validateData.message || 'Senha incorreta');

      const keysRes = await fetch(`${API_BASE_URL}/encryption/keys/current`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      const keysData = await keysRes.json();

      const privateKeyPem = await unlockPrivateKey(
        keysData.encrypted_private_key, keysData.salt, keysData.iv, password
      );

      await unlockVault(privateKeyPem);
      setPassword('');
      toast({ title: '🔓 Desbloqueado', description: 'Seus dados criptografados estão visíveis nesta sessão.' });

    } catch (e: any) {
      console.error('[Vault] Unlock error:', e);
      toast({ title: 'Acesso Negado', description: e.message || 'Senha incorreta.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Retroactive Migration ──────────────────────────────
  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/encryption/migrate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Falha na migração');

      toast({ title: '✅ Migração Concluída', description: 'Todos os dados existentes foram criptografados com sucesso.' });
      setShowMigrateDialog(false);
      setMigrateConfirmText('');
    } catch (e: any) {
      console.error('[Vault] Migration error:', e);
      toast({ title: 'Erro na Migração', description: e.message, variant: 'destructive' });
    } finally {
      setIsMigrating(false);
    }
  };

  // ── Loading ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <Shield className="h-6 w-6 text-primary" />
          Criptografia
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Criptografia de ponta a ponta para dados sensíveis. Somente você pode visualizá-los com sua senha.
        </p>
      </div>

      {/* ╔═══════════════════════════════════════════════════╗
         ║  STATE 1:  No keys → First-time setup             ║
         ╚═══════════════════════════════════════════════════╝ */}
      {!hasKeys && (
        <div className="space-y-5">
          <div className="sf-card p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Ativar Criptografia de Dados</h3>
                <p className="text-sm text-muted-foreground">
                  Crie uma senha para proteger seus dados. Esta senha será necessária para visualizar informações criptografadas.
                </p>
              </div>
            </div>

            {/* ── Setup Cards ── */}
            <div className="space-y-3">
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 relative overflow-hidden group hover:border-red-500/40 transition-colors flex items-start gap-4">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-colors pointer-events-none" />
                <ShieldAlert className="w-6 h-6 text-red-500 relative z-10 shrink-0 mt-0.5" />
                <div className="relative z-10 flex-1">
                  <h4 className="font-semibold text-red-500 text-sm md:text-base mb-1">Sem Recuperação</h4>
                  <p className="text-sm text-red-500/80 leading-relaxed">
                    Nós não armazenamos a sua senha. <strong className="text-red-500">Se você esquecê-la, os dados estarão permanentemente perdidos.</strong>
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-colors flex items-start gap-4">
                 <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
                <AlertTriangle className="w-6 h-6 text-amber-500 relative z-10 shrink-0 mt-0.5" />
                <div className="relative z-10 flex-1">
                  <h4 className="font-semibold text-amber-500 text-sm md:text-base mb-1">Anote em Segurança</h4>
                  <p className="text-sm text-amber-500/80 leading-relaxed">
                    Esta é a sua única chave de acesso. Guarde em um gerenciador de senhas antes de prosseguir.
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 relative overflow-hidden group hover:border-blue-500/40 transition-colors flex items-start gap-4">
                 <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors pointer-events-none" />
                <Info className="w-6 h-6 text-blue-500 relative z-10 shrink-0 mt-0.5" />
                <div className="relative z-10 flex-1">
                  <h4 className="font-semibold text-blue-500 text-sm md:text-base mb-1">Métricas Seguras</h4>
                  <p className="text-sm text-blue-500/80 leading-relaxed">
                    Apenas nomes de campanhas e integrações são ocultos. Lucros e ROAS continuam sempre visíveis.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha de Criptografia</label>
                <div className="relative flex items-center">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    disabled={isProcessing}
                    className="pr-10 bg-background"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirme a Senha</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a mesma senha"
                  disabled={isProcessing}
                  className="bg-background"
                />
              </div>

              {/* ── Mandatory Checkbox ── */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <Checkbox
                  id="accept-risk"
                  checked={acceptedRisk}
                  onCheckedChange={(checked) => setAcceptedRisk(checked === true)}
                  className="mt-0.5 border-destructive data-[state=checked]:bg-destructive"
                />
                <label htmlFor="accept-risk" className="text-sm text-destructive cursor-pointer leading-relaxed">
                  <strong>Eu entendo e aceito</strong> que se eu perder minha senha de criptografia, os dados protegidos serão <strong>permanentemente inacessíveis</strong> e não poderão ser recuperados por nenhum meio.
                </label>
              </div>

              <Button
                type="submit"
                disabled={isProcessing || !password || !confirmPassword || !acceptedRisk || password.length < 8}
                className="w-full"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando Chaves RSA-2048...</>
                ) : (
                  <><KeyRound className="w-4 h-4 mr-2" />Ativar Criptografia</>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════╗
         ║  STATE 2:  Has keys + Unlocked                    ║
         ╚═══════════════════════════════════════════════════╝ */}
      {hasKeys && isUnlocked && (
        <div className="space-y-5">
          {/* Status Card */}
          <div className="sf-card p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <Unlock className="w-40 h-40 text-green-500" />
            </div>

            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-500">Criptografia Ativa</h3>
                  <p className="text-sm text-emerald-500/70">
                    Dados criptografados estão sendo descriptografados em tempo real nesta sessão. A chave privada existe apenas na memória do navegador.
                  </p>
                </div>
              </div>

              <Button variant="secondary" onClick={lockVault} className="w-full md:w-auto">
                <Lock className="w-4 h-4 mr-2" />
                Trancar
              </Button>
            </div>
          </div>

          {/* Retroactive Migration Card */}
          <div className="sf-card p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
                <Database className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Criptografar Dados Retroativos</h3>
                <p className="text-sm text-muted-foreground">
                  Dados criados <strong>antes</strong> da ativação da criptografia ainda estão em texto plano no banco de dados. Use esta função para criptografá-los.
                </p>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex gap-3 text-sm">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-500 mb-1">Processo Inteligente</p>
                <p className="text-blue-500/80 leading-relaxed">
                  Dados que já estão criptografados (com prefixo <code className="bg-blue-500/10 px-1 rounded mx-1">ENC::</code>) serão ignorados. Não existe risco de corromper dados com dupla criptografia. Nomes de contas, campanhas, trackers e dados de postbacks serão convertidos.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowMigrateDialog(true)}
              className="w-full md:w-auto border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500"
            >
              <Database className="w-4 h-4 mr-2" />
              Criptografar Dados Existentes
            </Button>
          </div>
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════╗
         ║  STATE 3:  Has keys + Locked                      ║
         ╚═══════════════════════════════════════════════════╝ */}
      {hasKeys && !isUnlocked && (
        <div className="sf-card max-w-sm mx-auto mt-12 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Insira sua senha de segurança para descriptografar os nomes das campanhas e ler todas as informações sensíveis da sessão atual.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <div className="relative flex items-center">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: MinhaSenhaSecreta"
                disabled={isProcessing}
                className="pr-10 bg-background text-center py-6 focus-visible:ring-primary/50"
                autoFocus
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button type="submit" disabled={isProcessing || !password} className="w-full py-6 font-semibold shadow-md">
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 mr-3 animate-spin" />Descriptografando...</>
              ) : (
                <><Unlock className="w-5 h-5 mr-3" />Autenticar Acesso</>
              )}
            </Button>
          </form>
        </div>
      )}


      {/* ╔═══════════════════════════════════════════════════╗
         ║  DIALOG:  Confirm Retroactive Migration           ║
         ╚═══════════════════════════════════════════════════╝ */}
      <Dialog open={showMigrateDialog} onOpenChange={setShowMigrateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Criptografia Retroativa
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <span className="block">
                Esta ação irá criptografar todos os dados existentes (campanhas, contas, trackers, postbacks) que ainda estejam em texto plano.
              </span>
              <span className="block font-medium text-foreground">
                Dados já criptografados serão automaticamente ignorados.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <label className="text-sm font-medium">
              Digite <strong className="text-amber-500">CRIPTOGRAFAR</strong> para confirmar:
            </label>
            <Input
              value={migrateConfirmText}
              onChange={(e) => setMigrateConfirmText(e.target.value)}
              placeholder="CRIPTOGRAFAR"
              className="bg-background font-mono"
              disabled={isMigrating}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowMigrateDialog(false); setMigrateConfirmText(''); }} disabled={isMigrating}>
              Cancelar
            </Button>
            <Button
              onClick={handleMigrate}
              disabled={migrateConfirmText !== 'CRIPTOGRAFAR' || isMigrating}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isMigrating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criptografando...</>
              ) : (
                <><Database className="w-4 h-4 mr-2" />Confirmar Criptografia</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EncryptionVaultPage;
