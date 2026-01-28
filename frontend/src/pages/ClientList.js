import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Search, Plus, Edit, Trash2, Users, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react';

const formatCPF = (cpf) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const ClientList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');

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

  const handleDelete = async (id) => {
    try {
      await clientsAPI.delete(id);
      toast.success('Cliente excluído');
      loadClients(search);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir cliente');
    }
  };

  const openWhatsApp = (telefone) => {
    const phone = telefone.replace(/\D/g, '');
    if (phone.length >= 10) {
      const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    } else {
      toast.error('Telefone inválido para WhatsApp');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes cadastrados</p>
        </div>
        <Button onClick={() => navigate('/clientes/novo')} data-testid="new-client-btn">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Clientes
            </CardTitle>
            <form onSubmit={handleSearch} className="flex-1 flex gap-2 sm:max-w-md sm:ml-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="search-input"
                />
              </div>
              <Button type="submit" variant="secondary" data-testid="search-btn">
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
                    <TableHead className="hidden lg:table-cell">Data Cadastro</TableHead>
                    <TableHead className="hidden lg:table-cell">Parceiro</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id} data-testid={`client-row-${client.id}`}>
                        <TableCell className="font-medium">{client.nome_completo}</TableCell>
                        <TableCell className="hidden sm:table-cell mono text-sm">
                          {formatCPF(client.cpf)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{client.telefone || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {formatDate(client.created_at)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {client.parceiro_nome || '-'}
                        </TableCell>
                        <TableCell>
                          {client.tem_projeto_ativo ? (
                            <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              <CheckCircle className="w-3 h-3" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Sem projeto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {client.telefone && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openWhatsApp(client.telefone)}
                                data-testid={`whatsapp-client-${client.id}`}
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/clientes/${client.id}`)}
                              data-testid={`edit-client-${client.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  data-testid={`delete-client-${client.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o cliente "{client.nome_completo}"?
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(client.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
    </div>
  );
};

export default ClientList;
