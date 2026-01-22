import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsAPI, projectsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Search, FolderPlus, User, CheckCircle, AlertTriangle } from 'lucide-react';

const formatCPF = (cpf) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const NewProject = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Project data
  const [valorCredito, setValorCredito] = useState('');
  const [tipoProjeto, setTipoProjeto] = useState('PRONAF A');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async (searchTerm = '') => {
    try {
      setLoading(true);
      const response = await clientsAPI.list(searchTerm);
      // Filter clients without active project
      setClients(response.data.filter(c => !c.tem_projeto_ativo));
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadClients(search);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setConfirmDialog(true);
    setValorCredito('');
    setTipoProjeto('PRONAF A');
  };

  const handleCreateProject = async () => {
    if (!selectedClient) return;
    
    if (!valorCredito || parseFloat(valorCredito) <= 0) {
      toast.error('Informe o valor do crédito');
      return;
    }

    try {
      setCreating(true);
      await projectsAPI.create({ 
        cliente_id: selectedClient.id,
        valor_credito: parseFloat(valorCredito),
        tipo_projeto: tipoProjeto
      });
      toast.success('Projeto iniciado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar projeto');
    } finally {
      setCreating(false);
      setConfirmDialog(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Iniciar Projeto</h1>
          <p className="text-muted-foreground">Selecione um cliente para iniciar um novo projeto</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Selecionar Cliente
              </CardTitle>
              <CardDescription>
                Mostrando apenas clientes sem projeto ativo
              </CardDescription>
            </div>
            <form onSubmit={handleSearch} className="flex-1 flex gap-2 sm:max-w-md sm:ml-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="search-client-input"
                />
              </div>
              <Button type="submit" variant="secondary">
                Buscar
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">CPF</TableHead>
                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Parceiro</TableHead>
                    <TableHead className="w-32">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente disponível para novo projeto
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id} data-testid={`select-client-row-${client.id}`}>
                        <TableCell className="font-medium">{client.nome_completo}</TableCell>
                        <TableCell className="hidden sm:table-cell mono text-sm">
                          {formatCPF(client.cpf)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {client.telefone || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {client.parceiro_nome || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleSelectClient(client)}
                            data-testid={`select-client-btn-${client.id}`}
                          >
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Selecionar
                          </Button>
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

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Novo Projeto</DialogTitle>
            <DialogDescription>
              Configure os dados do projeto para o cliente selecionado.
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                <p><strong>Cliente:</strong> {selectedClient.nome_completo}</p>
                <p><strong>CPF:</strong> {formatCPF(selectedClient.cpf)}</p>
                {selectedClient.telefone && (
                  <p><strong>Telefone:</strong> {selectedClient.telefone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_projeto">Tipo de Projeto *</Label>
                <Select
                  value={tipoProjeto}
                  onValueChange={setTipoProjeto}
                >
                  <SelectTrigger data-testid="select-tipo-projeto">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRONAF A">PRONAF A</SelectItem>
                    <SelectItem value="PRONAF B">PRONAF B</SelectItem>
                    <SelectItem value="CUSTEIO">CUSTEIO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_credito">Valor do Crédito (R$) *</Label>
                <Input
                  id="valor_credito"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={valorCredito}
                  onChange={(e) => setValorCredito(e.target.value)}
                  data-testid="input-valor-credito"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProject} disabled={creating} data-testid="confirm-create-project">
              <CheckCircle className="w-4 h-4 mr-2" />
              {creating ? 'Criando...' : 'Iniciar Projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewProject;
