import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from './ui/sheet';
import {
  Leaf,
  LayoutDashboard,
  Users,
  UserPlus,
  FolderOpen,
  Settings,
  FileText,
  Handshake,
  CheckSquare,
  Archive,
  Sun,
  Moon,
  Menu,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['master', 'admin', 'analista'] },
  { icon: UserPlus, label: 'Cadastrar Cliente', path: '/clientes/novo', roles: ['master', 'admin', 'analista'] },
  { icon: Users, label: 'Clientes', path: '/clientes', roles: ['master', 'admin', 'analista'] },
  { icon: FolderOpen, label: 'Iniciar Projeto', path: '/projetos/novo', roles: ['master', 'admin', 'analista'] },
  { icon: Archive, label: 'Projetos Finalizados', path: '/projetos/arquivados', roles: ['master', 'admin', 'analista'] },
  { icon: FileText, label: 'Relatórios', path: '/relatorios', roles: ['master', 'admin', 'analista'] },
];

const adminMenuItems = [
  { icon: Handshake, label: 'Parceiros', path: '/admin/parceiros', roles: ['master', 'admin'] },
  { icon: Users, label: 'Usuários', path: '/admin/usuarios', roles: ['master', 'admin'] },
  { icon: CheckSquare, label: 'Etapas', path: '/admin/etapas', roles: ['master', 'admin'] },
  { icon: Settings, label: 'Configurações', path: '/admin/config', roles: ['master', 'admin'] },
];

const SidebarContent = ({ onItemClick }) => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-3" onClick={onItemClick}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">AgroLink</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            if (!item.roles.includes(user?.role)) return null;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive(item.path) && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </Link>
            );
          })}

          {isAdmin() && (
            <>
              <div className="pt-4 pb-2 px-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Administração
                </span>
              </div>
              {adminMenuItems.map((item) => {
                if (!item.roles.includes(user?.role)) return null;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    data-testid={`nav-admin-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                      isActive(item.path)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {isActive(item.path) && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* User info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nome}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-card lg:border-r lg:border-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  data-testid="mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>

            <div className="flex-1" />

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="header-theme-toggle"
              className="rounded-full"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2" data-testid="user-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline font-medium">{user?.nome}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.nome}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="logout-btn">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
