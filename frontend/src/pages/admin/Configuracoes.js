import React, { useState, useEffect, useCallback } from 'react';
import { instituicoesAPI, tiposProjetoAPI, requisitosEtapaAPI, etapasAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import {
  Building2,
  FolderKanban,
  CheckSquare,
  Plus,
  Edit,
  Trash2,
  Save,
} from 'lucide-react';

const Configuracoes = () => {
  const [loading, setLoading] = useState(true);
  const [instituicoes, setInstituicoes] = useState([]);
  const [tiposProjeto, setTiposProjeto] = useState([]);
  const [requisitos, setRequisitos] = useState([]);
  const [etapas, setEtapas] = useState([]);
  
  // Dialog states
  const [showInstituicaoDialog, setShowInstituicaoDialog] = useState(false);
  const [showTipoDialog, setShowTipoDialog] = useState(false);
  const [showRequisitoDialog, setShowRequisitoDialog] = useState(false);
  
  // Edit states
  const [editingInstituicao, setEditingInstituicao] = useState(null);
  const [editingTipo, setEditingTipo] = useState(null);
  const [editingRequisito, setEditingRequisito] = useState(null);
  
  // Form states
  const [instituicaoForm, setInstituicaoForm] = useState({ nome: '', ativo: true });
  const [tipoForm, setTipoForm] = useState({ nome: '', ativo: true });
  const [requisitoForm, setRequisitoForm] = useState({ etapa_id: '', nome: '', campo: '', ativo: true });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [instRes, tiposRes, reqRes, etapasRes] = await Promise.all([
        instituicoesAPI.listAll(),
        tiposProjetoAPI.listAll(),
        requisitosEtapaAPI.list(),
        etapasAPI.list(),
      ]);
      setInstituicoes(instRes.data);
      setTiposProjeto(tiposRes.data);
      setRequisitos(reqRes.data);
      setEtapas(etapasRes.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Instituição handlers
  const handleSaveInstituicao = async () => {
    if (!instituicaoForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    try {
      if (editingInstituicao) {
        await instituicoesAPI.update(editingInstituicao.id, instituicaoForm);
        toast.success('Instituição atualizada');
      } else {
        await instituicoesAPI.create(instituicaoForm);
        toast.success('Instituição criada');
      }
      setShowInstituicaoDialog(false);
      setEditingInstituicao(null);
      setInstituicaoForm({ nome: '', ativo: true });
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar instituição');
    }
  };

  const handleDeleteInstituicao = async (id) => {
    if (!window.confirm('Desativar esta instituição?')) return;
    try {
      await instituicoesAPI.delete(id);
      toast.success('Instituição desativada');
      fetchData();
    } catch (error) {
      toast.error('Erro ao desativar instituição');
    }
  };

  // Tipo Projeto handlers
  const handleSaveTipo = async () => {
    if (!tipoForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    try {
      if (editingTipo) {
        await tiposProjetoAPI.update(editingTipo.id, tipoForm);
        toast.success('Tipo atualizado');
      } else {
        await tiposProjetoAPI.create(tipoForm);
        toast.success('Tipo criado');
      }
      setShowTipoDialog(false);
      setEditingTipo(null);
      setTipoForm({ nome: '', ativo: true });
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar tipo');
    }
  };

  const handleDeleteTipo = async (id) => {
    if (!window.confirm('Desativar este tipo?')) return;
    try {
      await tiposProjetoAPI.delete(id);
      toast.success('Tipo desativado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao desativar tipo');
    }
  };

  // Requisito handlers
  const handleSaveRequisito = async () => {
    if (!requisitoForm.etapa_id || !requisitoForm.nome.trim() || !requisitoForm.campo.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    try {
      if (editingRequisito) {
        await requisitosEtapaAPI.update(editingRequisito.id, requisitoForm);
        toast.success('Requisito atualizado');
      } else {
        await requisitosEtapaAPI.create(requisitoForm);
        toast.success('Requisito criado');
      }
      setShowRequisitoDialog(false);
      setEditingRequisito(null);
      setRequisitoForm({ etapa_id: '', nome: '', campo: '', ativo: true });
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar requisito');
    }
  };

  const handleDeleteRequisito = async (id) => {
    if (!window.confirm('Desativar este requisito?')) return;
    try {
      await requisitosEtapaAPI.delete(id);
      toast.success('Requisito desativado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao desativar requisito');
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie instituições, tipos de projeto e requisitos</p>
      </div>

      <Tabs defaultValue="instituicoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="instituicoes" className="gap-2">
            <Building2 className="w-4 h-4" />
            Instituições
          </TabsTrigger>
          <TabsTrigger value="tipos" className="gap-2">
            <FolderKanban className="w-4 h-4" />
            Tipos de Projeto
          </TabsTrigger>
          <TabsTrigger value="requisitos" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Requisitos
          </TabsTrigger>
        </TabsList>

        {/* Instituições Financeiras */}
        <TabsContent value="instituicoes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Instituições Financeiras</CardTitle>
                  <CardDescription>Gerencie as instituições disponíveis para projetos</CardDescription>
                </div>
                <Dialog open={showInstituicaoDialog} onOpenChange={setShowInstituicaoDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingInstituicao(null);
                      setInstituicaoForm({ nome: '', ativo: true });
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Instituição
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingInstituicao ? 'Editar' : 'Nova'} Instituição</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={instituicaoForm.nome}
                          onChange={(e) => setInstituicaoForm(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Nome da instituição"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={instituicaoForm.ativo}
                          onCheckedChange={(checked) => setInstituicaoForm(prev => ({ ...prev, ativo: checked }))}
                        />
                        <Label>Ativo</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowInstituicaoDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveInstituicao}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instituicoes.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.nome}</TableCell>
                      <TableCell>
                        <Badge variant={inst.ativo ? 'default' : 'secondary'}>
                          {inst.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingInstituicao(inst);
                              setInstituicaoForm({ nome: inst.nome, ativo: inst.ativo });
                              setShowInstituicaoDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteInstituicao(inst.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tipos de Projeto */}
        <TabsContent value="tipos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tipos de Projeto</CardTitle>
                  <CardDescription>Gerencie os tipos de projeto disponíveis</CardDescription>
                </div>
                <Dialog open={showTipoDialog} onOpenChange={setShowTipoDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingTipo(null);
                      setTipoForm({ nome: '', ativo: true });
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Tipo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTipo ? 'Editar' : 'Novo'} Tipo de Projeto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={tipoForm.nome}
                          onChange={(e) => setTipoForm(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Nome do tipo"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={tipoForm.ativo}
                          onCheckedChange={(checked) => setTipoForm(prev => ({ ...prev, ativo: checked }))}
                        />
                        <Label>Ativo</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowTipoDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveTipo}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiposProjeto.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium">{tipo.nome}</TableCell>
                      <TableCell>
                        <Badge variant={tipo.ativo ? 'default' : 'secondary'}>
                          {tipo.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingTipo(tipo);
                              setTipoForm({ nome: tipo.nome, ativo: tipo.ativo });
                              setShowTipoDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteTipo(tipo.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requisitos de Etapa */}
        <TabsContent value="requisitos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Requisitos das Etapas</CardTitle>
                  <CardDescription>Gerencie os checkboxes de requisitos por etapa</CardDescription>
                </div>
                <Dialog open={showRequisitoDialog} onOpenChange={setShowRequisitoDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingRequisito(null);
                      setRequisitoForm({ etapa_id: '', nome: '', campo: '', ativo: true });
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Requisito
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRequisito ? 'Editar' : 'Novo'} Requisito</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Etapa</Label>
                        <Select
                          value={requisitoForm.etapa_id}
                          onValueChange={(v) => setRequisitoForm(prev => ({ ...prev, etapa_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            {etapas.map((e) => (
                              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nome do Requisito</Label>
                        <Input
                          value={requisitoForm.nome}
                          onChange={(e) => setRequisitoForm(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Ex: Documento X verificado"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Campo (identificador único)</Label>
                        <Input
                          value={requisitoForm.campo}
                          onChange={(e) => setRequisitoForm(prev => ({ ...prev, campo: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                          placeholder="Ex: documento_x_verificado"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={requisitoForm.ativo}
                          onCheckedChange={(checked) => setRequisitoForm(prev => ({ ...prev, ativo: checked }))}
                        />
                        <Label>Ativo</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowRequisitoDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveRequisito}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum requisito personalizado cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    requisitos.map((req) => {
                      const etapa = etapas.find(e => e.id === req.etapa_id);
                      return (
                        <TableRow key={req.id}>
                          <TableCell>{etapa?.nome || 'N/A'}</TableCell>
                          <TableCell className="font-medium">{req.nome}</TableCell>
                          <TableCell className="mono text-sm">{req.campo}</TableCell>
                          <TableCell>
                            <Badge variant={req.ativo ? 'default' : 'secondary'}>
                              {req.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingRequisito(req);
                                  setRequisitoForm({
                                    etapa_id: req.etapa_id,
                                    nome: req.nome,
                                    campo: req.campo,
                                    ativo: req.ativo
                                  });
                                  setShowRequisitoDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteRequisito(req.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
