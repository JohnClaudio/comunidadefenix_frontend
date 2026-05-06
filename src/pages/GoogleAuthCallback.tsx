import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GoogleAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      let title = 'Falha na Autenticação';
      let description = 'Não foi possível concluir o login com o Google.';

      if (error === 'AccountNotFound') {
        title = 'Acesso Negado';
        description = 'Sua conta Google não está vinculada a nenhum usuário cadastrado no sistema.';
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
      navigate('/', { replace: true });
      return;
    }

    if (token) {
      // Store token
      localStorage.setItem('sf_token', token);
      
      toast({
        title: 'Identidade Verificada',
        description: 'Autenticação concluída com sucesso. Redirecionando...',
      });

      // Redirect to dashboard (hard refresh allows AuthContext to pick up the token natively)
      window.location.href = '/dashboard';
    } else {
      // No token and no error, redirect to login
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h2 className="text-xl font-medium tracking-tight">Autenticando com o Google...</h2>
        <p className="text-sm text-muted-foreground">Por favor, aguarde enquanto configuramos seu ambiente.</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
