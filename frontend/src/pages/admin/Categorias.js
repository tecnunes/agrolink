import React, { useState, useEffect, useCallback } from 'react';
import { etapasAPI, requisitosEtapaAPI, tiposProjetoAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { toast } from 'sonner';
import { 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  CheckSquare,
  ChevronRight,
  Layers,
  Tag,
  RefreshCw,
  Database
} from 'lucide-react';

const Categorias = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [etapas, setEtapas] = useState([]);
  const [tiposProjeto, setTiposProjeto] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [selectedEtapa, setSelectedEtapa] = useState('all');
  const [formData, setFormData] = useState({
    etapa_id: '',
    nome: '',
    campo: '',
    ativo: true,
    tipos_projeto_ids: [], // Novo campo para tipos de projeto
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [etapasRes, categoriasRes, tiposRes] = await Promise.all([
        etapasAPI.list(),
        requisitosEtapaAPI.list(),
        tiposProjetoAPI.list(),
      ]);
      setEtapas(etapasRes.data);
      setCategorias(categoriasRes.data);
      setTiposProjeto(tiposRes.data.filter(t => t.ativo));
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gerar campo automaticamente a partir do nome
  const generateCampo = (nome) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleOpenDialog = (categoria = null, etapaId = null) => {
    if (categoria) {
      setEditingCategoria(categoria);
      setFormData({
        etapa_id: categoria.etapa_id,
        nome: categoria.nome,
        campo: categoria.campo,
        ativo: categoria.ativo,
        tipos_projeto_ids: categoria.tipos_projeto_ids || [],
      });
    } else {
      setEditingCategoria(null);
      setFormData({
        etapa_id: etapaId || '',
        nome: '',
        campo: '',
        ativo: true,
        tipos_projeto_ids: [],
      });
    }
    setDialogOpen(true);
  };

  const handleTipoProjetoToggle = (tipoId) => {
    setFormData(prev => {
      const tipos = prev.tipos_projeto_ids || [];
      if (tipos.includes(tipoId)) {
        return { ...prev, tipos_projeto_ids: tipos.filter(id => id !== tipoId) };
      } else {
        return { ...prev, tipos_projeto_ids: [...tipos, tipoId] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.etapa_id || !formData.nome) {
      toast.error('Etapa e nome são obrigatórios');
      return;
    }

    const submitData = {
      ...formData,
      campo: formData.campo || generateCampo(formData.nome),
    };

    try {
      if (editingCategoria) {
        await requisitosEtapaAPI.update(editingCategoria.id, submitData);
        toast.success('Categoria atualizada com sucesso');
      } else {
        await requisitosEtapaAPI.create(submitData);
        toast.success('Categoria criada com sucesso');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar categoria');
    }
  };

  const handleDelete = async (id) => {
    try {
      await requisitosEtapaAPI.delete(id);
      toast.success('Categoria desativada');
      fetchData();
    } catch (error) {
      toast.error('Erro ao desativar categoria');
    }
  };

  // Popular requisitos padrão do sistema
  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      const response = await requisitosEtapaAPI.seedDefaults();
      toast.success(response.data.message || 'Requisitos padrão criados');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar requisitos padrão');
    } finally {
      setSeeding(false);
    }
  };

  // Agrupar categorias por etapa
  const categoriasPorEtapa = etapas.map(etapa => ({
    ...etapa,
    categorias: categorias.filter(c => c.etapa_id === etapa.id),
  }));

  // Filtrar se uma etapa específica está selecionada
  const filteredEtapas = selectedEtapa === 'all' 
    ? categoriasPorEtapa 
    : categoriasPorEtapa.filter(e => e.id === selectedEtapa);

  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-primary" />
            Categorias por Etapa
          </h1>
          <p className="text-muted-foreground">
            Gerencie as categorias de requisitos para cada etapa do fluxo
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {categorias.length === 0 && (
            <Button 
              variant="outline" 
              onClick={handleSeedDefaults} 
              disabled={seeding}
              data-testid="seed-defaults-btn"
              className="touch-target"
            >
              {seeding ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Carregar Padrões
            </Button>
          )}
          <Button onClick={() => handleOpenDialog()} data-testid="new-categoria-btn" className="touch-target">
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Aviso se não há categorias */}
      {!loading && categorias.length === 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Nenhuma categoria cadastrada
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Carregar Padrões" para importar os requisitos padrão do sistema (RG/CNH, CAR, etc.) 
                  ou crie suas próprias categorias personalizadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtro por Etapa */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Label className="whitespace-nowrap">Filtrar por Etapa:</Label>
            <Select value={selectedEtapa} onValueChange={setSelectedEtapa}>
              <SelectTrigger className="w-full sm:w-[280px]" data-testid="filter-etapa">
                <SelectValue placeholder="Todas as etapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                {etapas.map((etapa) => (
                  <SelectItem key={etapa.id} value={etapa.id}>
                    {etapa.ordem}. {etapa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {categorias.length} categoria(s) cadastrada(s)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Etapas com Categorias */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={etapas.map(e => e.id)} className="space-y-3">
          {filteredEtapas.map((etapa) => (
            <AccordionItem 
              key={etapa.id} 
              value={etapa.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]>div>svg]:rotate-90">
                <div className="flex items-center gap-3 w-full">
                  <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200" />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{etapa.ordem}</Badge>
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{etapa.nome}</span>
                  </div>
                  <Badge variant="secondary" className="ml-auto mr-4">
                    {etapa.categorias.length} categoria(s)
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-4 pt-2 border-t">
                  {etapa.categorias.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma categoria cadastrada para esta etapa</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => handleOpenDialog(null, etapa.id)}
                        data-testid={`add-categoria-${etapa.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Categoria
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Desktop View */}
                      <div className="hidden md:block">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase mb-2 px-2">
                          <div className="col-span-4">Nome</div>
                          <div className="col-span-3">Campo</div>
                          <div className="col-span-3">Tipos de Projeto</div>
                          <div className="col-span-2 text-right">Ações</div>
                        </div>
                        {etapa.categorias.map((cat) => {
                          const tiposNomes = (cat.tipos_projeto_ids || [])
                            .map(id => tiposProjeto.find(t => t.id === id)?.nome)
                            .filter(Boolean);
                          return (
                          <div 
                            key={cat.id} 
                            className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                            data-testid={`categoria-item-${cat.id}`}
                          >
                            <div className="col-span-4 flex items-center gap-2">
                              <Tag className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{cat.nome}</span>
                              {!cat.ativo && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                            </div>
                            <div className="col-span-3">
                              <code className="text-xs bg-muted px-2 py-1 rounded">{cat.campo}</code>
                            </div>
                            <div className="col-span-3">
                              {tiposNomes.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Todos</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {tiposNomes.map((nome, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{nome}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="col-span-2 flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenDialog(cat)}
                                data-testid={`edit-categoria-${cat.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive"
                                    data-testid={`delete-categoria-${cat.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Desativar Categoria</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja desativar a categoria "{cat.nome}"?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(cat.id)}>
                                      Desativar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                        })}
                      </div>

                      {/* Mobile View */}
                      <div className="md:hidden space-y-3">
                        {etapa.categorias.map((cat) => {
                          const tiposNomes = (cat.tipos_projeto_ids || [])
                            .map(id => tiposProjeto.find(t => t.id === id)?.nome)
                            .filter(Boolean);
                          return (
                          <div 
                            key={cat.id} 
                            className="p-3 border rounded-lg bg-background"
                            data-testid={`categoria-mobile-${cat.id}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-primary" />
                                <span className="font-medium">{cat.nome}</span>
                              </div>
                              <Badge variant={cat.ativo ? 'default' : 'secondary'} className="text-xs">
                                {cat.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <div className="mb-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">{cat.campo}</code>
                            </div>
                            <div className="mb-3 text-xs text-muted-foreground">
                              Tipos: {tiposNomes.length === 0 ? 'Todos' : tiposNomes.join(', ')}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleOpenDialog(cat)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Desativar Categoria</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja desativar "{cat.nome}"?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(cat.id)}>
                                      Desativar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                        })}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-muted-foreground"
                        onClick={() => handleOpenDialog(null, etapa.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar mais
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Dialog de Criar/Editar Categoria */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategoria 
                ? 'Atualize os dados da categoria de requisito'
                : 'Adicione uma nova categoria de requisito para uma etapa'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="etapa">Etapa *</Label>
              <Select
                value={formData.etapa_id}
                onValueChange={(v) => setFormData({ ...formData, etapa_id: v })}
              >
                <SelectTrigger data-testid="categoria-etapa-select">
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapas.map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      {etapa.ordem}. {etapa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Categoria *</Label>
              <Input
                id="nome"
                placeholder="Ex: RG/CNH Verificado"
                value={formData.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setFormData({ 
                    ...formData, 
                    nome,
                    campo: generateCampo(nome)
                  });
                }}
                data-testid="categoria-nome-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campo">Campo (identificador único)</Label>
              <Input
                id="campo"
                placeholder="Gerado automaticamente"
                value={formData.campo}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  campo: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                })}
                data-testid="categoria-campo-input"
              />
              <p className="text-xs text-muted-foreground">
                Usado internamente para identificar a categoria.
              </p>
            </div>
            
            {/* Tipos de Projeto */}
            <div className="space-y-2">
              <Label>Tipos de Projeto</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione os tipos de projeto onde esta categoria deve aparecer. Se nenhum for selecionado, aparecerá em todos.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                {tiposProjeto.map((tipo) => (
                  <div key={tipo.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tipo-${tipo.id}`}
                      checked={(formData.tipos_projeto_ids || []).includes(tipo.id)}
                      onCheckedChange={() => handleTipoProjetoToggle(tipo.id)}
                      data-testid={`tipo-projeto-${tipo.id}`}
                    />
                    <Label htmlFor={`tipo-${tipo.id}`} className="text-sm cursor-pointer">
                      {tipo.nome}
                    </Label>
                  </div>
                ))}
              </div>
              {(formData.tipos_projeto_ids || []).length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Nenhum tipo selecionado = aparecerá em todos os projetos
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
                data-testid="categoria-ativo-switch"
              />
              <Label htmlFor="ativo">Categoria ativa</Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} data-testid="save-categoria-btn" className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categorias;
