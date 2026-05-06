import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import LoadingDots from '@/components/LoadingDots';
import { useToast } from '@/hooks/use-toast';
import { Turnstile } from '@marsidev/react-turnstile';
import medievalBg from '@/assets/medieval-bg.png';

const Auth: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos.',
      });
      return;
    }

    if (!turnstileToken) {
      toast({
        variant: 'destructive',
        title: 'Verificação pendente',
        description: 'Por favor, complete a verificação de segurança (CAPTCHA).',
      });
      return;
    }

    setIsSubmitting(true);

    const result = await login(email, password, turnstileToken);

    if (result.success) {
      toast({
        title: 'Bem-vindo!',
        description: 'Acesso concedido com sucesso.',
      });
      navigate('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: result.error,
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={medievalBg}
          alt=""
          className="w-full h-full object-cover"
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a07] via-[#0d0a07]/70 to-[#0d0a07]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0a07]/80 via-transparent to-[#0d0a07]/80" />
      </div>

      {/* Floating Embers */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-orange-400/80"
            style={{
              left: `${10 + Math.random() * 80}%`,
              bottom: `${-5 + Math.random() * 20}%`,
              animation: `ember-rise ${3 + Math.random() * 4}s ease-out ${Math.random() * 3}s infinite`,
            }}
          />
        ))}
      </div>

      {showSplash ? (
        // Splash Screen — Medieval
        <div className="flex flex-col items-center gap-10 fade-in w-full max-w-lg relative z-10">
          <div className="w-[360px]">
            <Logo className="max-h-none w-full h-auto drop-shadow-2xl" />
          </div>

          <p className="text-center text-amber-200/70 max-w-md leading-relaxed text-lg font-light" style={{ fontFamily: "'Cinzel', serif" }}>
            "Das cinzas, a Fênix renasce mais forte."
          </p>

          <div className="mt-2">
            <LoadingDots />
          </div>
        </div>
      ) : (
        // Login Form — Medieval Portal
        <div className="w-full max-w-md slide-up relative z-10 px-6">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <Logo variant="icon" className="!h-20 w-auto mb-4 drop-shadow-[0_0_30px_rgba(255,140,0,0.4)]" />
            <h1
              className="text-2xl font-bold text-amber-100 tracking-wider text-center"
              style={{ fontFamily: "'Cinzel Decorative', cursive" }}
            >
              Comunidade Fênix
            </h1>
            <p className="text-amber-500/60 text-xs mt-2 tracking-widest uppercase" style={{ fontFamily: "'Cinzel', serif" }}>
              Plataforma de Gestão
            </p>
          </div>

          {/* Form Card — Stone-like */}
          <div className="relative rounded-2xl border border-amber-900/30 bg-[#1a1410]/90 backdrop-blur-xl p-8 shadow-2xl shadow-black/50 mx-auto w-fit">
            {/* Subtle fire glow on top */}
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-1/2 h-16 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <form onSubmit={handleSubmit} className="space-y-5 w-[300px]">
              {/* Google Login */}
              <button
                type="button"
                onClick={() => {
                  const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8081';
                  window.location.href = `${API_BASE_URL}/auth/google/login`;
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 text-base text-amber-100 rounded-xl border border-amber-900/30 bg-[#2a2018]/60 hover:bg-[#2a2018] hover:border-amber-700/40 transition-all duration-300"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Entrar com Google
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-amber-900/30"></div>
                <span className="flex-shrink-0 mx-4 text-amber-600/50 text-xs uppercase tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>
                  ou
                </span>
                <div className="flex-grow border-t border-amber-900/30"></div>
              </div>

              {/* Email Input */}
              <div>
                <label className="text-xs font-medium text-amber-400/60 mb-2 block uppercase tracking-wider" style={{ fontFamily: "'Cinzel', serif" }}>
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/40">
                    <User size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="contato@fenix.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#15120e] border border-amber-900/25 text-amber-100 placeholder:text-amber-900/40 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all outline-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="text-xs font-medium text-amber-400/60 mb-2 block uppercase tracking-wider" style={{ fontFamily: "'Cinzel', serif" }}>
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/40">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#15120e] border border-amber-900/25 text-amber-100 placeholder:text-amber-900/40 rounded-xl pl-12 pr-12 py-3.5 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all outline-none"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-600/40 hover:text-amber-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="w-full mt-4">
                <Turnstile
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken('')}
                  onExpire={() => setTurnstileToken('')}
                  options={{ theme: 'dark', size: 'normal' }}
                />
              </div>

              {/* Submit Button — Fire styled */}
              <button
                type="submit"
                disabled={isSubmitting || !turnstileToken}
                className="w-full relative overflow-hidden rounded-xl py-4 text-base font-bold text-white
                           bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700
                           hover:from-amber-600 hover:via-orange-500 hover:to-amber-600
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-300 shadow-lg shadow-orange-900/30
                           flex items-center justify-center gap-2 mt-6
                           border border-amber-600/30"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {/* Fire glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 opacity-0 hover:opacity-100 transition-opacity" />

                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-amber-300/30 border-t-amber-200 rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <Flame size={18} className="text-amber-300" />
                    Acessar Dashboard
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-amber-700/40 mt-8" style={{ fontFamily: "'Cinzel', serif" }}>
            © 2026 Comunidade Afiliado Fênix · Todos os direitos reservados
          </p>
        </div>
      )}
    </div>
  );
};

export default Auth;
