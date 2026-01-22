import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, projectsAPI, etapasAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  FolderOpen,
  Users,
  AlertTriangle,
  DollarSign,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  XCircle,
  Banknote,
  LayoutList,
  Kanban,
} from 'lucide-react';
import { cn } from '../lib/utils';
import ProjectTimeline from '../components/ProjectTimeline';
import KanbanBoard from '../components/KanbanBoard';

const StatCard = ({ title, value, icon: Icon, description, variant = 'default' }) => {
  const variants = {
    default: 'bg-card',
    primary: 'bg-primary/10 border-primary/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    success: 'bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', variants[variant])} data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            variant === 'primary' && 'bg-primary text-primary-foreground',
            variant === 'warning' && 'bg-amber-500 text-white',
            variant === 'success' && 'bg-emerald-500 text-white',
            variant === 'default' && 'bg-secondary text-secondary-foreground'
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatCPF = (cpf) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    nome: '',
    pendencia: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, projectsRes, etapasRes] = await Promise.all([
        dashboardAPI.stats(),
        projectsAPI.list({
          status: 'em_andamento',
          mes: filters.mes,
          ano: filters.ano,
          nome: filters.nome || undefined,
          pendencia: filters.pendencia,
        }),
        etapasAPI.list(),
      ]);
      setStats(statsRes.data);
      setProjects(projectsRes.data);
      setEtapas(etapasRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateDuration = (dataInicio) => {
    const start = new Date(dataInicio);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Acompanhe seus projetos de crédito rural</p>
        </div>
        <Button onClick={() => navigate('/projetos/novo')} data-testid="new-project-btn">
          <FolderOpen className="w-4 h-4 mr-2" />
          Iniciar Projeto
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Projetos Ativos"
          value={stats?.total_projetos_ativos || 0}
          icon={FolderOpen}
          description="Em andamento"
          variant="primary"
        />
        <StatCard
          title="Clientes"
          value={stats?.total_clientes || 0}
          icon={Users}
          description="Total cadastrados"
        />
        <StatCard
          title="Com Pendência"
          value={stats?.projetos_com_pendencia || 0}
          icon={AlertTriangle}
          description="Requer atenção"
          variant="warning"
        />
        <StatCard
          title="Valor Total"
          value={formatCurrency(stats?.valor_total_credito || 0)}
          icon={DollarSign}
          description="Crédito em análise"
          variant="success"
        />
        <StatCard
          title="Valor Serviço"
          value={formatCurrency(stats?.valor_total_servico || 0)}
          icon={Banknote}
          description="Serviços realizados"
          variant="success"
        />
      </div>

      {/* Projects Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Projetos em Andamento</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="toggle-filters"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {showFilters ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t mt-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select
                  value={String(filters.mes)}
                  onValueChange={(v) => setFilters({ ...filters, mes: parseInt(v) })}
                >
                  <SelectTrigger data-testid="filter-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select
                  value={String(filters.ano)}
                  onValueChange={(v) => setFilters({ ...filters, ano: parseInt(v) })}
                >
                  <SelectTrigger data-testid="filter-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buscar por Nome</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite o nome..."
                    value={filters.nome}
                    onChange={(e) => setFilters({ ...filters, nome: e.target.value })}
                    className="pl-9"
                    data-testid="filter-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Apenas com Pendência</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={filters.pendencia === true}
                    onCheckedChange={(checked) => setFilters({ ...filters, pendencia: checked ? true : null })}
                    data-testid="filter-pendencia"
                  />
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">CPF</TableHead>
                  <TableHead className="hidden md:table-cell">Valor Crédito</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="hidden lg:table-cell">Início</TableHead>
                  <TableHead className="hidden lg:table-cell">Duração</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum projeto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <React.Fragment key={project.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted/50',
                          project.tem_pendencia && 'pendencia-row',
                          expandedProject === project.id && 'bg-muted/50'
                        )}
                        onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                        data-testid={`project-row-${project.id}`}
                      >
                        <TableCell>
                          {expandedProject === project.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{project.cliente_nome}</TableCell>
                        <TableCell className="hidden sm:table-cell mono text-sm">
                          {formatCPF(project.cliente_cpf)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(project.valor_credito)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal whitespace-nowrap">
                            {project.etapa_atual_nome}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {new Date(project.data_inicio).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {calculateDuration(project.data_inicio)} dias
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.tem_pendencia ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Pendente
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              <CheckCircle className="w-3 h-3" />
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedProject === project.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="p-0 bg-muted/30">
                            <ProjectTimeline
                              project={project}
                              etapas={etapas}
                              onUpdate={fetchData}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
