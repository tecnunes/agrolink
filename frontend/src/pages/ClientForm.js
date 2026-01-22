import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clientsAPI, partnersAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, User, MessageCircle } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    endereco: '',
    telefone: '',
    data_nascimento: '',
    parceiro_id: '',
  });

  useEffect(() => {
    loadPartners();
    if (isEditing) {
      loadClient();
    }
  }, [id]);

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
      });
    } catch (error) {
      toast.error('Erro ao carregar cliente');
      navigate('/clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (field === 'cpf') {
      value = formatCPF(value);
    } else if (field === 'telefone') {
      value = formatPhone(value);
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
    </div>
  );
};

export default ClientForm;
