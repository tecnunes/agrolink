import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsAPI, projectsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Search, FolderPlus, User, CheckCircle } from 'lucide-react';

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

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async (searchTerm = '') => {
    try {
      setLoading(true);
      const response = await clientsAPI.list(searchTerm);
      setClients(response.data);
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
  };

  const handleCreateProject = async () => {
    if (!selectedClient) return;

    try {
      setCreating(true);
      await projectsAPI.create({ cliente_id: selectedClient.id });
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
                Busque e selecione o cliente para o novo projeto
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
                    <TableHead className="hidden md:table-cell">Valor Crédito</TableHead>
                    <TableHead className="hidden lg:table-cell">Parceiro</TableHead>
                    <TableHead className="w-32">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado
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
                          {formatCurrency(client.valor_credito)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Início do Projeto</DialogTitle>
            <DialogDescription>
              Deseja iniciar um novo projeto para o cliente selecionado?
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
              <p><strong>Cliente:</strong> {selectedClient.nome_completo}</p>
              <p><strong>CPF:</strong> {formatCPF(selectedClient.cpf)}</p>
              <p><strong>Valor do Crédito:</strong> {formatCurrency(selectedClient.valor_credito)}</p>
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
