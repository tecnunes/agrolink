import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clientsAPI, partnersAPI, localizacaoAPI, projectsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Save, User, MessageCircle, Eye, EyeOff, FolderOpen, CheckCircle, Clock, XCircle } from 'lucide-react';

const formatCPF = (value) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [showSenhaGov, setShowSenhaGov] = useState(false);
  const [clientProjects, setClientProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    endereco: '',
    telefone: '',
    data_nascimento: '',
    parceiro_id: '',
    estado: '',
    cidade: '',
    usuario_gov: '',
    senha_gov: '',
  });

  useEffect(() => {
    loadPartners();
    loadEstados();
    if (isEditing) {
      loadClient();
    }
  }, [id]);

  const loadEstados = async () => {
    try {
      const response = await localizacaoAPI.getEstados();
      setEstados(response.data);
    } catch (error) {
      console.error('Erro ao carregar estados');
    }
  };

  const loadCidades = async (estadoSigla) => {
    if (!estadoSigla) {
      setCidades([]);
      return;
    }
    try {
      setLoadingCidades(true);
      const response = await localizacaoAPI.getCidades(estadoSigla);
      setCidades(response.data);
    } catch (error) {
      console.error('Erro ao carregar cidades');
    } finally {
      setLoadingCidades(false);
    }
  };

  const loadPartners = async () => {
    try {
      const response = await partnersAPI.list();
      setPartners(response.data.filter(p => p.ativo));
    } catch (error) {
      console.error('Erro ao carregar parceiros');
    }
  };

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.get(id);
      const client = response.data;
      setFormData({
        nome_completo: client.nome_completo,
        cpf: formatCPF(client.cpf),
        endereco: client.endereco || '',
        telefone: formatPhone(client.telefone || ''),
        data_nascimento: client.data_nascimento || '',
        parceiro_id: client.parceiro_id || '',
        estado: client.estado || '',
        cidade: client.cidade || '',
        usuario_gov: client.usuario_gov || '',
        senha_gov: client.senha_gov || '',
      });
      // Load cities if state is set
      if (client.estado) {
        loadCidades(client.estado);
      }
      // Carregar projetos do cliente
      loadClientProjects();
    } catch (error) {
      toast.error('Erro ao carregar cliente');
      navigate('/clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadClientProjects = async () => {
    if (!id) return;
    try {
      setLoadingProjects(true);
      const response = await projectsAPI.listByClient(id);
      setClientProjects(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar projetos do cliente:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleChange = (field, value) => {
    if (field === 'cpf') {
      value = formatCPF(value);
    } else if (field === 'telefone') {
      value = formatPhone(value);
    } else if (field === 'estado') {
      loadCidades(value);
      setFormData(prev => ({ ...prev, [field]: value, cidade: '' }));
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openWhatsApp = () => {
    const phone = formData.telefone.replace(/\D/g, '');
    if (phone.length >= 10) {
      const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    } else {
      toast.error('Telefone inválido para WhatsApp');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome_completo || !formData.cpf || !formData.telefone) {
      toast.error('Preencha os campos obrigatórios: Nome, CPF e Telefone');
      return;
    }

    const cpfClean = formData.cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      toast.error('CPF inválido');
      return;
    }

    try {
      setLoading(true);
      const data = {
        nome_completo: formData.nome_completo,
        cpf: cpfClean,
        endereco: formData.endereco || null,
        telefone: formData.telefone.replace(/\D/g, ''),
        data_nascimento: formData.data_nascimento || null,
        parceiro_id: formData.parceiro_id || null,
        estado: formData.estado || null,
        cidade: formData.cidade || null,
        usuario_gov: formData.usuario_gov || null,
        senha_gov: formData.senha_gov || null,
      };

      if (isEditing) {
        await clientsAPI.update(id, data);
        toast.success('Cliente atualizado com sucesso');
      } else {
        await clientsAPI.create(data);
        toast.success('Cliente cadastrado com sucesso');
      }
      navigate('/clientes');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize os dados do cliente' : 'Cadastre um novo cliente no sistema'}
          </p>
        </div>
        {isEditing && formData.telefone && (
          <Button variant="outline" onClick={openWhatsApp} className="gap-2" data-testid="whatsapp-btn">
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Dados do Cliente
          </CardTitle>
          <CardDescription>
            Campos com * são obrigatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome completo"
                  value={formData.nome_completo}
                  onChange={(e) => handleChange('nome_completo', e.target.value)}
                  data-testid="input-nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  maxLength={14}
                  data-testid="input-cpf"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  maxLength={15}
                  data-testid="input-telefone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nascimento">Data de Nascimento</Label>
                <Input
                  id="nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => handleChange('data_nascimento', e.target.value)}
                  data-testid="input-nascimento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parceiro">Indicação (Parceiro)</Label>
                <Select
                  value={formData.parceiro_id}
                  onValueChange={(v) => handleChange('parceiro_id', v)}
                >
                  <SelectTrigger data-testid="select-parceiro">
                    <SelectValue placeholder="Selecione um parceiro (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(v) => handleChange('estado', v)}
                >
                  <SelectTrigger data-testid="select-estado">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    {estados.map((e) => (
                      <SelectItem key={e.sigla} value={e.sigla}>
                        {e.sigla} - {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Select
                  value={formData.cidade}
                  onValueChange={(v) => handleChange('cidade', v)}
                  disabled={!formData.estado || loadingCidades}
                >
                  <SelectTrigger data-testid="select-cidade">
                    <SelectValue placeholder={loadingCidades ? 'Carregando...' : 'Selecione a cidade'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    {cidades.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  placeholder="Rua, número, bairro, cidade - UF (opcional)"
                  value={formData.endereco}
                  onChange={(e) => handleChange('endereco', e.target.value)}
                  data-testid="input-endereco"
                />
              </div>

              {/* Dados GOV.BR */}
              <div className="md:col-span-2 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Acesso GOV.BR</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario_gov">Usuário GOV</Label>
                <Input
                  id="usuario_gov"
                  placeholder="CPF ou email do GOV.BR"
                  value={formData.usuario_gov}
                  onChange={(e) => handleChange('usuario_gov', e.target.value)}
                  data-testid="input-usuario-gov"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha_gov">Senha GOV</Label>
                <div className="relative">
                  <Input
                    id="senha_gov"
                    type={showSenhaGov ? 'text' : 'password'}
                    placeholder="Senha do GOV.BR"
                    value={formData.senha_gov}
                    onChange={(e) => handleChange('senha_gov', e.target.value)}
                    data-testid="input-senha-gov"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowSenhaGov(!showSenhaGov)}
                    data-testid="toggle-senha-gov"
                  >
                    {showSenhaGov ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/clientes')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} data-testid="save-client-btn">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Projetos do Cliente - apenas ao editar */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Projetos do Cliente
            </CardTitle>
            <CardDescription>
              Histórico de todos os projetos deste cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : clientProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum projeto encontrado para este cliente</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Instituição</TableHead>
                    <TableHead>Valor Crédito</TableHead>
                    <TableHead>Etapa Atual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientProjects.map((proj) => (
                    <TableRow key={proj.id}>
                      <TableCell className="font-medium">{proj.tipo_projeto}</TableCell>
                      <TableCell>{proj.instituicao_financeira_nome || '-'}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.valor_credito || 0)}
                      </TableCell>
                      <TableCell>{proj.etapa_atual_nome}</TableCell>
                      <TableCell>
                        {proj.status === 'em_andamento' && (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <Clock className="w-3 h-3 mr-1" />
                            Em Andamento
                          </Badge>
                        )}
                        {proj.status === 'arquivado' && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Finalizado
                          </Badge>
                        )}
                        {proj.status === 'desistido' && (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                            <XCircle className="w-3 h-3 mr-1" />
                            Desistido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {proj.data_inicio ? new Date(proj.data_inicio).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        {proj.status === 'em_andamento' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/?project=${proj.id}`)}
                          >
                            Ver Projeto
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientForm;
