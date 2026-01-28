import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Toaster, toast } from 'sonner';
import { Leaf, Sun, Moon, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login: authLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login || !senha) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await authLogin({ login, senha });
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <Toaster position="top-right" richColors />
      
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1651947368468-ac261dcce643?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyYWwlMjBmaWVsZCUyMGRyb25lJTIwdmlld3xlbnwwfHx8fDE3NjkwMzc4Mjl8MA&ixlib=rb-4.1.0&q=85"
          alt="Campo agrícola"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-10 left-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Leaf className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">AgroLink</h1>
          </div>
          <p className="text-lg text-white/80 max-w-md">
            Sistema de Gestão de Crédito Rural - Gerencie seus projetos de empréstimo de forma simples e eficiente.
          </p>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Theme toggle */}
          <div className="absolute top-6 right-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle"
              className="rounded-full"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AgroLink</h1>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
              <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login">Usuário ou E-mail</Label>
                  <Input
                    id="login"
                    type="text"
                    placeholder="Digite seu usuário ou e-mail"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    data-testid="login-input"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      data-testid="password-input"
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            © 2024 AgroLink - Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
