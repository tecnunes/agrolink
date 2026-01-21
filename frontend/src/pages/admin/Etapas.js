import React, { useState, useEffect } from 'react';
import { etapasAPI } from '../../lib/api';
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
import { Plus, Edit, Trash2, CheckSquare, Save, ArrowUp, ArrowDown } from 'lucide-react';

const Etapas = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [etapas, setEtapas] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    ordem: 1,
    ativo: true,
  });

  useEffect(() => {
    loadEtapas();
  }, []);

  const loadEtapas = async () => {
    try {
      setLoading(true);
      const response = await etapasAPI.list();
      setEtapas(response.data);
    } catch (error) {
      toast.error('Erro ao carregar etapas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (etapa = null) => {
    if (etapa) {
      setEditingEtapa(etapa);
      setFormData({
        nome: etapa.nome,
        ordem: etapa.ordem,
        ativo: etapa.ativo,
      });
    } else {
      setEditingEtapa(null);
      const maxOrdem = etapas.reduce((max, e) => Math.max(max, e.ordem), 0);
      setFormData({
        nome: '',
        ordem: maxOrdem + 1,
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
      if (editingEtapa) {
        await etapasAPI.update(editingEtapa.id, formData);
        toast.success('Etapa atualizada');
      } else {
        await etapasAPI.create(formData);
        toast.success('Etapa cadastrada');
      }
      setDialogOpen(false);
      loadEtapas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar etapa');
    }
  };

  const handleDelete = async (id) => {
    try {
      await etapasAPI.delete(id);
      toast.success('Etapa desativada');
      loadEtapas();
    } catch (error) {
      toast.error('Erro ao desativar etapa');
    }
  };

  const handleReorder = async (etapa, direction) => {
    const currentIndex = etapas.findIndex(e => e.id === etapa.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= etapas.length) return;
    
    const otherEtapa = etapas[newIndex];
    
    try {
      await Promise.all([
        etapasAPI.update(etapa.id, { ordem: otherEtapa.ordem }),
        etapasAPI.update(otherEtapa.id, { ordem: etapa.ordem }),
      ]);
      loadEtapas();
    } catch (error) {
      toast.error('Erro ao reordenar etapas');
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
          <h1 className="text-2xl sm:text-3xl font-bold">Etapas</h1>
          <p className="text-muted-foreground">Configure as etapas do fluxo de projetos</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="new-etapa-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nova Etapa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Fluxo de Etapas
          </CardTitle>
          <CardDescription>
            As etapas são executadas na ordem definida abaixo
          </CardDescription>
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
                    <TableHead className="w-20">Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Reordenar</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {etapas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma etapa cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    etapas.map((etapa, index) => (
                      <TableRow key={etapa.id} data-testid={`etapa-row-${etapa.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {etapa.ordem}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{etapa.nome}</TableCell>
                        <TableCell>
                          <Badge variant={etapa.ativo ? 'default' : 'secondary'}>
                            {etapa.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleReorder(etapa, 'up')}
                              disabled={index === 0}
                              data-testid={`etapa-up-${etapa.id}`}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleReorder(etapa, 'down')}
                              disabled={index === etapas.length - 1}
                              data-testid={`etapa-down-${etapa.id}`}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDialog(etapa)}
                              data-testid={`edit-etapa-${etapa.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  data-testid={`delete-etapa-${etapa.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Desativar Etapa</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja desativar a etapa "{etapa.nome}"?
                                    Projetos existentes não serão afetados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(etapa.id)}>
                                    Desativar
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

      {/* Etapa Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
            <DialogDescription>
              {editingEtapa ? 'Atualize os dados da etapa' : 'Cadastre uma nova etapa no fluxo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome da etapa"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                data-testid="etapa-nome-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ordem">Ordem</Label>
              <Input
                id="ordem"
                type="number"
                min="1"
                value={formData.ordem}
                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 1 })}
                data-testid="etapa-ordem-input"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
                data-testid="etapa-ativo-switch"
              />
              <Label htmlFor="ativo">Etapa ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} data-testid="save-etapa-btn">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Etapas;
