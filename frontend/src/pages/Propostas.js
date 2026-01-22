import React, { useState, useEffect, useCallback } from 'react';
import { propostasAPI, tiposProjetoAPI, instituicoesAPI, alertsAPI, clientsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Trash2,
  Filter,
  ChevronDown,
  ChevronRight,
  LayoutList,
  Kanban,
  Building2,
  DollarSign,
  User,
  AlertTriangle,
  UserPlus,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '../lib/utils';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatCPF = (cpf) => {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Kanban Card Component
const PropostaKanbanCard = ({ proposta, onWhatsApp, onConverter, onDesistir, onDelete }) => {
  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        proposta.status === 'aberta' && proposta.dias_aberta > 3 && 'border-amber-500/50 bg-amber-500/5'
      )}
      data-testid={`proposta-kanban-card-${proposta.id}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Tipo do Projeto */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/30">
            {proposta.tipo_projeto_nome}
          </Badge>
          {proposta.cliente_telefone && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 -mr-1"
              onClick={() => onWhatsApp(proposta.cliente_telefone)}
            >
              <MessageCircle className="w-4 h-4 text-green-600" />
            </Button>
          )}
        </div>

        {/* Nome do Cliente */}
        <p className="font-semibold text-sm leading-tight" title={proposta.cliente_nome}>
          {proposta.cliente_nome}
        </p>

        {/* Valor do Crédito */}
        <p className="text-lg font-bold text-primary">
          {formatCurrency(proposta.valor_credito)}
        </p>

        {/* Instituição */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="w-3 h-3" />
          <span className="truncate">{proposta.instituicao_financeira_nome}</span>
        </div>

        {/* Dias aberta (apenas para abertas) */}
        {proposta.status === 'aberta' && proposta.dias_aberta > 0 && (
          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {proposta.dias_aberta} dias em aberto
              </span>
            </div>
          </div>
        )}

        {/* Motivo desistência (apenas para desistidas) */}
        {proposta.status === 'desistida' && proposta.motivo_desistencia && (
          <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-600 dark:text-red-400 truncate" title={proposta.motivo_desistencia}>
              {proposta.motivo_desistencia}
            </p>
          </div>
        )}

        {/* Actions (apenas para abertas) */}
        {proposta.status === 'aberta' && (
          <div className="flex items-center gap-1 pt-2 border-t">
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-7 text-xs"
              onClick={() => onConverter(proposta)}
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              Converter
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onDesistir(proposta)}
            >
              <XCircle className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={() => onDelete(proposta)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span>{formatCPF(proposta.cliente_cpf)}</span>
          <span>{new Date(proposta.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Kanban Column Component
const PropostaKanbanColumn = ({ title, icon: Icon, propostas, variant, onWhatsApp, onConverter, onDesistir, onDelete }) => {
  const variants = {
    warning: 'bg-amber-500/10 border-amber-500/30',
    success: 'bg-emerald-500/10 border-emerald-500/30',
    destructive: 'bg-red-500/10 border-red-500/30',
  };

  const iconVariants = {
    warning: 'text-amber-600',
    success: 'text-emerald-600',
    destructive: 'text-red-600',
  };

  const totalValue = propostas.reduce((sum, p) => sum + (p.valor_credito || 0), 0);

  return (
    <div className="flex-shrink-0 w-[320px] bg-muted/30 rounded-lg border">
      {/* Column Header */}
      <div className={cn('p-3 border-b rounded-t-lg', variants[variant])}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon className={cn('w-4 h-4', iconVariants[variant])} />
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>
          <Badge variant="secondary" className="h-5 text-xs">
            {propostas.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Total: {formatCurrency(totalValue)}
        </p>
      </div>

      {/* Column Content */}
      <ScrollArea className="h-[calc(100vh-380px)] min-h-[350px]">
        <div className="p-2 space-y-2">
          {propostas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma proposta
            </div>
          ) : (
            propostas.map((proposta) => (
              <PropostaKanbanCard
                key={proposta.id}
                proposta={proposta}
                onWhatsApp={onWhatsApp}
                onConverter={onConverter}
                onDesistir={onDesistir}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const Propostas = () => {
  const [loading, setLoading] = useState(true);
  const [propostas, setPropostas] = useState([]);
  const [tiposProjeto, setTiposProjeto] = useState([]);
  const [instituicoes, setInstituicoes] = useState([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDesistirDialog, setShowDesistirDialog] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState(null);
  const [motivoDesistencia, setMotivoDesistencia] = useState('');
  const [filterStatus, setFilterStatus] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'table' or 'kanban'
  
  // Novo: Tab para o modal (selecionar existente ou criar novo)
  const [clientTab, setClientTab] = useState('existente');
  const [clients, setClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    telefone: '',
    tipo_projeto_id: '',
    instituicao_financeira_id: '',
    valor_credito: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [propostasRes, tiposRes, instRes] = await Promise.all([
        propostasAPI.list({}), // Fetch all for kanban view
        tiposProjetoAPI.list(),
        instituicoesAPI.list(),
      ]);
      setPropostas(propostasRes.data);
      setTiposProjeto(tiposRes.data);
      setInstituicoes(instRes.data);
    } catch (error) {
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Buscar clientes para o select
  const fetchClients = useCallback(async (search = '') => {
    try {
      setLoadingClients(true);
      const res = await clientsAPI.list(search);
      setClients(res.data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  // Carregar clientes quando o modal abrir
  useEffect(() => {
    if (showNewDialog) {
      fetchClients();
    }
  }, [showNewDialog, fetchClients]);

  // Buscar clientes conforme digita
  useEffect(() => {
    if (showNewDialog && clientTab === 'existente') {
      const timer = setTimeout(() => {
        fetchClients(clientSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [clientSearchTerm, showNewDialog, clientTab, fetchClients]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCPFChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    setFormData(prev => ({ ...prev, cpf: value }));
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    setFormData(prev => ({ ...prev, telefone: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação comum
    if (!formData.tipo_projeto_id || !formData.instituicao_financeira_id || !formData.valor_credito) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      let clientId = null;

      if (clientTab === 'existente') {
        // Usando cliente existente
        if (!selectedClientId) {
          toast.error('Selecione um cliente existente');
          return;
        }
        clientId = selectedClientId;
      } else {
        // Criando novo cliente
        if (!formData.nome_completo || !formData.cpf || !formData.telefone) {
          toast.error('Preencha todos os dados do novo cliente');
          return;
        }
        
        // Primeiro cria o cliente
        const clientRes = await clientsAPI.create({
          nome_completo: formData.nome_completo,
          cpf: formData.cpf,
          telefone: formData.telefone,
        });
        clientId = clientRes.data.id;
        toast.success('Cliente cadastrado com sucesso!');
      }

      // Agora cria a proposta com o client_id
      await propostasAPI.create({
        client_id: clientId,
        tipo_projeto_id: formData.tipo_projeto_id,
        instituicao_financeira_id: formData.instituicao_financeira_id,
        valor_credito: parseFloat(formData.valor_credito),
      });
      
      toast.success('Proposta criada com sucesso!');
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar proposta');
    }
  };

  const handleCloseDialog = () => {
    setShowNewDialog(false);
    setClientTab('existente');
    setSelectedClientId('');
    setClientSearchTerm('');
    setFormData({
      nome_completo: '',
      cpf: '',
      telefone: '',
      tipo_projeto_id: '',
      instituicao_financeira_id: '',
      valor_credito: '',
    });
  };

  const handleConverter = async (proposta) => {
    try {
      await propostasAPI.converter(proposta.id);
      toast.success('Proposta convertida em projeto!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao converter proposta');
    }
  };

  const handleDesistir = async () => {
    if (!selectedProposta) return;
    
    try {
      await propostasAPI.desistir(selectedProposta.id, { motivo: motivoDesistencia });
      toast.success('Proposta marcada como desistida');
      setShowDesistirDialog(false);
      setSelectedProposta(null);
      setMotivoDesistencia('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao desistir da proposta');
    }
  };

  const handleDelete = async (proposta) => {
    if (!window.confirm('Tem certeza que deseja excluir esta proposta?')) return;
    
    try {
      await propostasAPI.delete(proposta.id);
      toast.success('Proposta excluída');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir proposta');
    }
  };

  const openWhatsApp = (telefone) => {
    if (!telefone) return;
    const phone = telefone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  const handleClearAllAlerts = async () => {
    try {
      await alertsAPI.clearAllPropostaAlerts();
      toast.success('Todos os alertas foram limpos');
      fetchData();
    } catch (error) {
      toast.error('Erro ao limpar alertas');
    }
  };

  const filteredPropostas = propostas.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.cliente_nome?.toLowerCase().includes(search) ||
      p.cliente_cpf?.includes(search)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'aberta':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Aberta</Badge>;
      case 'convertida':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" />Convertida</Badge>;
      case 'desistida':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Desistida</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">Gerencie propostas de crédito rural</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearAllAlerts} data-testid="clear-alerts-btn">
            <XCircle className="w-4 h-4 mr-2" />
            Limpar Alertas
          </Button>
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button data-testid="new-proposta-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nova Proposta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Proposta</DialogTitle>
                <DialogDescription>
                  Cadastre uma nova proposta de crédito rural
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    name="nome_completo"
                    value={formData.nome_completo}
                    onChange={handleInputChange}
                    placeholder="Nome do cliente"
                    data-testid="input-nome"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      value={formatCPF(formData.cpf)}
                      onChange={handleCPFChange}
                      placeholder="000.000.000-00"
                      data-testid="input-cpf"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handlePhoneChange}
                      placeholder="(00) 00000-0000"
                      data-testid="input-telefone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_projeto_id">Tipo de Projeto *</Label>
                  <Select
                    value={formData.tipo_projeto_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_projeto_id: v }))}
                  >
                    <SelectTrigger data-testid="select-tipo-projeto">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposProjeto.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instituicao_financeira_id">Instituição Financeira *</Label>
                  <Select
                    value={formData.instituicao_financeira_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, instituicao_financeira_id: v }))}
                  >
                    <SelectTrigger data-testid="select-instituicao">
                      <SelectValue placeholder="Selecione a instituição" />
                    </SelectTrigger>
                    <SelectContent>
                      {instituicoes.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_credito">Valor do Crédito *</Label>
                  <Input
                    id="valor_credito"
                    name="valor_credito"
                    type="number"
                    step="0.01"
                    value={formData.valor_credito}
                    onChange={handleInputChange}
                    placeholder="0,00"
                    data-testid="input-valor"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" data-testid="submit-proposta">
                    Criar Proposta
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Propostas ({propostas.length})
              </CardTitle>
              
              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={setViewMode} className="hidden sm:block">
                <TabsList className="h-8">
                  <TabsTrigger value="kanban" className="h-7 px-3 gap-1" data-testid="view-kanban">
                    <Kanban className="w-4 h-4" />
                    <span className="hidden md:inline">Kanban</span>
                  </TabsTrigger>
                  <TabsTrigger value="table" className="h-7 px-3 gap-1" data-testid="view-table">
                    <LayoutList className="w-4 h-4" />
                    <span className="hidden md:inline">Tabela</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mobile View Toggle */}
              <div className="sm:hidden flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('kanban')}
                >
                  <Kanban className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('table')}
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
              
              {viewMode === 'table' && (
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
              )}
            </div>
          </div>
          
          {viewMode === 'table' && showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="filter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="aberta">Abertas</SelectItem>
                    <SelectItem value="convertida">Convertidas</SelectItem>
                    <SelectItem value="desistida">Desistidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="search-input"
                  />
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {viewMode === 'kanban' ? (
            /* Kanban View */
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                <PropostaKanbanColumn
                  title="Em Aberto"
                  icon={Clock}
                  variant="warning"
                  propostas={propostas.filter(p => p.status === 'aberta')}
                  onWhatsApp={openWhatsApp}
                  onConverter={handleConverter}
                  onDesistir={(p) => {
                    setSelectedProposta(p);
                    setShowDesistirDialog(true);
                  }}
                  onDelete={handleDelete}
                />
                <PropostaKanbanColumn
                  title="Convertidas"
                  icon={CheckCircle}
                  variant="success"
                  propostas={propostas.filter(p => p.status === 'convertida')}
                  onWhatsApp={openWhatsApp}
                  onConverter={handleConverter}
                  onDesistir={(p) => {
                    setSelectedProposta(p);
                    setShowDesistirDialog(true);
                  }}
                  onDelete={handleDelete}
                />
                <PropostaKanbanColumn
                  title="Desistidas"
                  icon={XCircle}
                  variant="destructive"
                  propostas={propostas.filter(p => p.status === 'desistida')}
                  onWhatsApp={openWhatsApp}
                  onConverter={handleConverter}
                  onDesistir={(p) => {
                    setSelectedProposta(p);
                    setShowDesistirDialog(true);
                  }}
                  onDelete={handleDelete}
                />
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            /* Table View */
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">CPF</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Instituição</TableHead>
                    <TableHead className="hidden lg:table-cell">Valor</TableHead>
                    <TableHead className="hidden lg:table-cell">Dias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPropostas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma proposta encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPropostas.map((proposta) => (
                      <TableRow
                        key={proposta.id}
                        className={cn(
                          proposta.status === 'aberta' && proposta.dias_aberta > 3 && 'bg-amber-50 dark:bg-amber-950/20'
                        )}
                        data-testid={`proposta-row-${proposta.id}`}
                      >
                        <TableCell className="font-medium">{proposta.cliente_nome}</TableCell>
                        <TableCell className="hidden sm:table-cell mono text-sm">
                          {formatCPF(proposta.cliente_cpf)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{proposta.tipo_projeto_nome}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {proposta.instituicao_financeira_nome}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {formatCurrency(proposta.valor_credito)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {proposta.dias_aberta}d
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(proposta.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {proposta.cliente_telefone && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openWhatsApp(proposta.cliente_telefone)}
                                className="h-8 w-8"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            {proposta.status === 'aberta' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleConverter(proposta)}
                                  className="h-8 w-8"
                                  title="Converter em Projeto"
                                >
                                  <ArrowRight className="w-4 h-4 text-primary" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedProposta(proposta);
                                    setShowDesistirDialog(true);
                                  }}
                                  className="h-8 w-8"
                                  title="Desistir"
                                >
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(proposta)}
                              className="h-8 w-8"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desistir Dialog */}
      <Dialog open={showDesistirDialog} onOpenChange={setShowDesistirDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desistir da Proposta</DialogTitle>
            <DialogDescription>
              Informe o motivo da desistência. O cadastro do cliente será mantido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo da Desistência</Label>
              <Textarea
                value={motivoDesistencia}
                onChange={(e) => setMotivoDesistencia(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDesistirDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDesistir}>
              Confirmar Desistência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Propostas;
