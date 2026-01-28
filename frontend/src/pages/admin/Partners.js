import React, { useState, useEffect } from 'react';
import { partnersAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Handshake, Save } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const Partners = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    comissao: '',
    telefone: '',
    ativo: true,
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const response = await partnersAPI.list();
      setPartners(response.data);
    } catch (error) {
      toast.error('Erro ao carregar parceiros');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (partner = null) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData({
        nome: partner.nome,
        comissao: partner.comissao.toString(),
        telefone: partner.telefone || '',
        ativo: partner.ativo,
      });
    } else {
      setEditingPartner(null);
      setFormData({
        nome: '',
        comissao: '',
        telefone: '',
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const data = {
        ...formData,
        comissao: parseFloat(formData.comissao) || 0,
      };

      if (editingPartner) {
        await partnersAPI.update(editingPartner.id, data);
        toast.success('Parceiro atualizado');
      } else {
        await partnersAPI.create(data);
        toast.success('Parceiro cadastrado');
      }
      setDialogOpen(false);
      loadPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar parceiro');
    }
  };

  const handleDelete = async (id) => {
    try {
      await partnersAPI.delete(id);
      toast.success('Parceiro excluído');
      loadPartners();
    } catch (error) {
      toast.error('Erro ao excluir parceiro');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Parceiros</h1>
          <p className="text-muted-foreground">Gerencie os parceiros de indicação</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="new-partner-btn">
          <Plus className="w-4 h-4 mr-2" />
          Novo Parceiro
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5" />
            Lista de Parceiros
          </CardTitle>
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
                    <TableHead>Comissão</TableHead>
                    <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum parceiro cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    partners.map((partner) => (
                      <TableRow key={partner.id} data-testid={`partner-row-${partner.id}`}>
                        <TableCell className="font-medium">{partner.nome}</TableCell>
                        <TableCell>{formatCurrency(partner.comissao)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {partner.telefone || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={partner.ativo ? 'default' : 'secondary'}>
                            {partner.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDialog(partner)}
                              data-testid={`edit-partner-${partner.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  data-testid={`delete-partner-${partner.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Parceiro</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o parceiro "{partner.nome}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(partner.id)}>
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

      {/* Partner Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Editar Parceiro' : 'Novo Parceiro'}</DialogTitle>
            <DialogDescription>
              {editingPartner ? 'Atualize os dados do parceiro' : 'Cadastre um novo parceiro de indicação'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome do parceiro"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                data-testid="partner-nome-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comissao">Valor da Comissão (R$)</Label>
              <Input
                id="comissao"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.comissao}
                onChange={(e) => setFormData({ ...formData, comissao: e.target.value })}
                data-testid="partner-comissao-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                data-testid="partner-telefone-input"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
                data-testid="partner-ativo-switch"
              />
              <Label htmlFor="ativo">Parceiro ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} data-testid="save-partner-btn">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Partners;
