import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, filesAPI } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  MessageSquare,
  MessageCircle,
  FileText,
  Download,
  Upload,
  Trash2,
  ChevronRight,
  Archive,
  XCircle,
  Eye,
} from 'lucide-react';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ProjectTimeline = ({ project, etapas, onUpdate }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pendenciaDialog, setPendenciaDialog] = useState(false);
  const [observacaoDialog, setObservacaoDialog] = useState(false);
  const [documentosDialog, setDocumentosDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [newPendencia, setNewPendencia] = useState('');
  const [newObservacao, setNewObservacao] = useState('');
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [numeroContrato, setNumeroContrato] = useState(project.numero_contrato || '');
  const [valorServico, setValorServico] = useState(project.valor_servico || '');

  const currentEtapaIndex = etapas.findIndex(e => e.id === project.etapa_atual_id);
  const isLastStage = currentEtapaIndex === etapas.length - 1;
  const currentEtapaNome = project.etapa_atual_nome || '';

  const getEtapaStatus = (etapa, index) => {
    if (index < currentEtapaIndex) return 'completed';
    if (index === currentEtapaIndex) {
      const currentHistorico = project.historico_etapas?.find(h => h.etapa_id === etapa.id);
      const hasPendencia = currentHistorico?.pendencias?.some(p => !p.resolvida);
      return hasPendencia ? 'pending' : 'active';
    }
    return 'upcoming';
  };

  const getEtapaDuration = (etapaId) => {
    const historico = project.historico_etapas?.find(h => h.etapa_id === etapaId);
    if (!historico) return null;
    
    if (historico.data_fim) {
      return historico.dias_duracao;
    }
    
    const start = new Date(historico.data_inicio);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };

  const handleSaveExtraFields = async () => {
    try {
      await projectsAPI.updateDocuments(project.id, {
        numero_contrato: numeroContrato,
        valor_servico: valorServico ? parseFloat(valorServico) : null
      });
      toast.success('Dados salvos com sucesso');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao salvar dados');
    }
  };

  // Render stage-specific checklist
  const renderStageChecklist = () => {
    const docs = project.documentos_check || {};
    
    // Coleta de Documentos
    if (currentEtapaNome.includes('Coleta de Documentos')) {
      const hasPending = !docs.ccu_titulo || !docs.saldo_iagro || !docs.car;
      return (
        <div className="p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium mb-3">Documentos Obrigatórios</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ccu"
                checked={docs.ccu_titulo}
                onCheckedChange={(v) => handleDocumentCheck('ccu_titulo', v)}
                data-testid="doc-ccu"
              />
              <Label htmlFor="ccu" className="text-sm cursor-pointer">
                CCU / Título / Contrato / Escritura
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="iagro"
                checked={docs.saldo_iagro}
                onCheckedChange={(v) => handleDocumentCheck('saldo_iagro', v)}
                data-testid="doc-iagro"
              />
              <Label htmlFor="iagro" className="text-sm cursor-pointer">
                Saldo IAGRO
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="car"
                checked={docs.car}
                onCheckedChange={(v) => handleDocumentCheck('car', v)}
                data-testid="doc-car"
              />
              <Label htmlFor="car" className="text-sm cursor-pointer">
                CAR
              </Label>
            </div>
          </div>
          {hasPending && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Documentos pendentes
            </p>
          )}
        </div>
      );
    }
    
    // Desenvolvimento do Projeto
    if (currentEtapaNome.includes('Desenvolvimento do Projeto')) {
      return (
        <div className="p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium mb-3">Requisitos da Etapa</h4>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="projeto_implementado"
              checked={docs.projeto_implementado}
              onCheckedChange={(v) => handleDocumentCheck('projeto_implementado', v)}
              data-testid="doc-projeto-implementado"
            />
            <Label htmlFor="projeto_implementado" className="text-sm cursor-pointer">
              Projeto Implementado
            </Label>
          </div>
          {!docs.projeto_implementado && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pendente: Projeto não implementado
            </p>
          )}
        </div>
      );
    }
    
    // Coletar Assinaturas
    if (currentEtapaNome.includes('Coletar Assinaturas')) {
      return (
        <div className="p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium mb-3">Requisitos da Etapa</h4>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="projeto_assinado"
              checked={docs.projeto_assinado}
              onCheckedChange={(v) => handleDocumentCheck('projeto_assinado', v)}
              data-testid="doc-projeto-assinado"
            />
            <Label htmlFor="projeto_assinado" className="text-sm cursor-pointer">
              Projeto Assinado
            </Label>
          </div>
          {!docs.projeto_assinado && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pendente: Projeto não assinado
            </p>
          )}
        </div>
      );
    }
    
    // Protocolo CENOP
    if (currentEtapaNome.includes('Protocolo CENOP')) {
      return (
        <div className="p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium mb-3">Requisitos da Etapa</h4>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="projeto_protocolado"
              checked={docs.projeto_protocolado}
              onCheckedChange={(v) => handleDocumentCheck('projeto_protocolado', v)}
              data-testid="doc-projeto-protocolado"
            />
            <Label htmlFor="projeto_protocolado" className="text-sm cursor-pointer">
              Projeto Protocolado
            </Label>
          </div>
          {!docs.projeto_protocolado && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pendente: Projeto não protocolado
            </p>
          )}
        </div>
      );
    }
    
    // Instrumento de Crédito
    if (currentEtapaNome.includes('Instrumento de Crédito')) {
      const hasPending = !docs.assinatura_agencia || !docs.upload_contrato;
      return (
        <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
          <h4 className="font-medium">Requisitos da Etapa</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assinatura_agencia"
                checked={docs.assinatura_agencia}
                onCheckedChange={(v) => handleDocumentCheck('assinatura_agencia', v)}
                data-testid="doc-assinatura-agencia"
              />
              <Label htmlFor="assinatura_agencia" className="text-sm cursor-pointer">
                Assinatura na Agência
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="upload_contrato"
                checked={docs.upload_contrato}
                onCheckedChange={(v) => handleDocumentCheck('upload_contrato', v)}
                data-testid="doc-upload-contrato"
              />
              <Label htmlFor="upload_contrato" className="text-sm cursor-pointer">
                Upload Contrato
              </Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero_contrato">Número do Contrato</Label>
            <div className="flex gap-2">
              <Input
                id="numero_contrato"
                placeholder="Digite o número do contrato"
                value={numeroContrato}
                onChange={(e) => setNumeroContrato(e.target.value)}
                data-testid="input-numero-contrato"
                className="flex-1"
              />
              <Button onClick={handleSaveExtraFields} size="sm" data-testid="save-contrato-btn">
                Salvar
              </Button>
            </div>
          </div>
          {hasPending && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pendente: Requisitos não completados
            </p>
          )}
        </div>
      );
    }
    
    // GTA e Nota Fiscal
    if (currentEtapaNome.includes('GTA e Nota Fiscal')) {
      const hasPending = !docs.gta_emitido || !docs.nota_fiscal_emitida;
      return (
        <div className="p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium mb-3">Requisitos da Etapa</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gta_emitido"
                checked={docs.gta_emitido}
                onCheckedChange={(v) => handleDocumentCheck('gta_emitido', v)}
                data-testid="doc-gta-emitido"
              />
              <Label htmlFor="gta_emitido" className="text-sm cursor-pointer">
                GTA Emitido
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nota_fiscal_emitida"
                checked={docs.nota_fiscal_emitida}
                onCheckedChange={(v) => handleDocumentCheck('nota_fiscal_emitida', v)}
                data-testid="doc-nota-fiscal-emitida"
              />
              <Label htmlFor="nota_fiscal_emitida" className="text-sm cursor-pointer">
                Nota Fiscal Emitida
              </Label>
            </div>
          </div>
          {hasPending && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pendente: Requisitos não completados
            </p>
          )}
        </div>
      );
    }
    
    // Projeto Creditado
    if (currentEtapaNome.includes('Projeto Creditado')) {
      return (
        <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
          <h4 className="font-medium">Requisitos da Etapa</h4>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="comprovante_servico_pago"
              checked={docs.comprovante_servico_pago}
              onCheckedChange={(v) => handleDocumentCheck('comprovante_servico_pago', v)}
              data-testid="doc-comprovante-servico"
            />
            <Label htmlFor="comprovante_servico_pago" className="text-sm cursor-pointer">
              Comprovante de Serviço Pago
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor_servico">Valor do Serviço (R$)</Label>
            <div className="flex gap-2">
              <Input
                id="valor_servico"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valorServico}
                onChange={(e) => setValorServico(e.target.value)}
                data-testid="input-valor-servico"
                className="flex-1"
              />
              <Button onClick={handleSaveExtraFields} size="sm" data-testid="save-servico-btn">
                Salvar
              </Button>
            </div>
          </div>
          {!docs.comprovante_servico_pago && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pendente: Comprovante não enviado
            </p>
          )}
        </div>
      );
    }
    
    // Cadastro ou outras etapas sem checklist específico
    return null;
  };

  const handleNextStage = async () => {
    try {
      setLoading(true);
      await projectsAPI.nextStage(project.id);
      toast.success('Projeto avançado para próxima etapa');
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao avançar etapa');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setLoading(true);
      await projectsAPI.archive(project.id);
      toast.success('Projeto arquivado com sucesso');
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao arquivar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelMotivo.trim()) {
      toast.error('Informe o motivo da desistência');
      return;
    }
    try {
      setLoading(true);
      await projectsAPI.cancel(project.id, { motivo: cancelMotivo });
      toast.success('Projeto cancelado');
      setCancelDialog(false);
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPendencia = async () => {
    if (!newPendencia.trim()) {
      toast.error('Informe a descrição da pendência');
      return;
    }
    try {
      setLoading(true);
      await projectsAPI.addPendencia(project.id, { descricao: newPendencia });
      toast.success('Pendência adicionada');
      setPendenciaDialog(false);
      setNewPendencia('');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao adicionar pendência');
    } finally {
      setLoading(false);
    }
  };

  const handleResolvePendencia = async (index) => {
    try {
      await projectsAPI.resolvePendencia(project.id, index);
      toast.success('Pendência resolvida');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao resolver pendência');
    }
  };

  const handleAddObservacao = async () => {
    if (!newObservacao.trim()) {
      toast.error('Informe a observação');
      return;
    }
    try {
      setLoading(true);
      await projectsAPI.addObservacao(project.id, { texto: newObservacao });
      toast.success('Observação adicionada');
      setObservacaoDialog(false);
      setNewObservacao('');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao adicionar observação');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentCheck = async (field, value) => {
    try {
      await projectsAPI.updateDocuments(project.id, { [field]: value });
      onUpdate();
    } catch (error) {
      toast.error('Erro ao atualizar documento');
    }
  };

  const loadFiles = async () => {
    try {
      const response = await filesAPI.list(project.cliente_id);
      setFiles(response.data.files || []);
    } catch (error) {
      toast.error('Erro ao carregar arquivos');
    }
  };

  const handleOpenDocumentos = async () => {
    setDocumentosDialog(true);
    await loadFiles();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo excede o limite de 10MB');
      return;
    }

    try {
      setUploading(true);
      await filesAPI.upload(project.cliente_id, file);
      toast.success('Arquivo enviado');
      await loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await filesAPI.download(project.cliente_id, filename);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handleDeleteFile = async (filename) => {
    try {
      await filesAPI.delete(project.cliente_id, filename);
      toast.success('Arquivo excluído');
      await loadFiles();
    } catch (error) {
      toast.error('Erro ao excluir arquivo');
    }
  };

  const currentHistorico = project.historico_etapas?.[project.historico_etapas.length - 1];
  const pendencias = currentHistorico?.pendencias || [];
  const observacoes = currentHistorico?.observacoes || [];

  return (
    <div className="p-6 space-y-6">
      {/* Timeline */}
      <div className="relative">
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {etapas.map((etapa, index) => {
            const status = getEtapaStatus(etapa, index);
            const duration = getEtapaDuration(etapa.id);
            
            return (
              <div key={etapa.id} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      status === 'completed' && 'bg-emerald-500 border-emerald-500 text-white',
                      status === 'active' && 'bg-primary border-primary text-primary-foreground',
                      status === 'pending' && 'bg-amber-500 border-amber-500 text-white',
                      status === 'upcoming' && 'bg-background border-muted-foreground/30 text-muted-foreground'
                    )}
                    data-testid={`timeline-step-${index}`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : status === 'pending' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : status === 'active' ? (
                      <Circle className="w-5 h-5 fill-current" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className={cn(
                    'mt-2 text-xs font-medium text-center max-w-[80px]',
                    status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {etapa.nome}
                  </span>
                  {duration !== null && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {duration}d
                    </Badge>
                  )}
                </div>
                {index < etapas.length - 1 && (
                  <div className={cn(
                    'w-12 h-0.5 mx-2',
                    index < currentEtapaIndex ? 'bg-emerald-500' : 'bg-muted'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage-specific Checklist */}
      {renderStageChecklist()}

      {/* Pendências */}
      {pendencias.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Pendências da Etapa Atual</h4>
          <div className="space-y-2">
            {pendencias.map((p, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  p.resolvida ? 'bg-muted/30' : 'bg-red-500/10 border-red-500/30'
                )}
              >
                <div className="flex items-center gap-3">
                  {p.resolvida ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={cn('text-sm', p.resolvida && 'line-through text-muted-foreground')}>
                    {p.descricao}
                  </span>
                </div>
                {!p.resolvida && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolvePendencia(idx)}
                    data-testid={`resolve-pendencia-${idx}`}
                  >
                    Resolver
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observações */}
      {observacoes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Observações da Etapa Atual</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {observacoes.map((obs, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-sm">{obs.texto}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {obs.usuario_nome} - {new Date(obs.data).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPendenciaDialog(true)}
          data-testid="add-pendencia-btn"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Pendência
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setObservacaoDialog(true)}
          data-testid="add-observacao-btn"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Observação
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenDocumentos}
          data-testid="view-documents-btn"
        >
          <FileText className="w-4 h-4 mr-2" />
          Documentos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/clientes/${project.cliente_id}`)}
          data-testid="view-client-btn"
        >
          <Eye className="w-4 h-4 mr-2" />
          Ver Cliente
        </Button>
        
        <div className="flex-1" />
        
        <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" data-testid="cancel-project-btn">
              <XCircle className="w-4 h-4 mr-2" />
              Desistir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desistir do Projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá cancelar o projeto e excluir todos os documentos. Informe o motivo:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              placeholder="Motivo da desistência..."
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              data-testid="cancel-motivo"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel} disabled={loading}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isLastStage ? (
          <Button onClick={handleArchive} disabled={loading} data-testid="archive-project-btn">
            <Archive className="w-4 h-4 mr-2" />
            Arquivar Projeto
          </Button>
        ) : (
          <Button onClick={handleNextStage} disabled={loading} data-testid="next-stage-btn">
            Próxima Etapa
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Pendência Dialog */}
      <Dialog open={pendenciaDialog} onOpenChange={setPendenciaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Pendência</DialogTitle>
            <DialogDescription>
              Informe a descrição da pendência para esta etapa.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Descreva a pendência..."
            value={newPendencia}
            onChange={(e) => setNewPendencia(e.target.value)}
            data-testid="pendencia-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendenciaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPendencia} disabled={loading}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Observação Dialog */}
      <Dialog open={observacaoDialog} onOpenChange={setObservacaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Observação</DialogTitle>
            <DialogDescription>
              Adicione uma observação sobre o andamento do projeto.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Digite sua observação..."
            value={newObservacao}
            onChange={(e) => setNewObservacao(e.target.value)}
            data-testid="observacao-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setObservacaoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddObservacao} disabled={loading}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documentos Dialog */}
      <Dialog open={documentosDialog} onOpenChange={setDocumentosDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documentos do Cliente</DialogTitle>
            <DialogDescription>
              Gerencie os documentos do cliente. Limite: 10MB por arquivo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload */}
            <div className="flex items-center gap-4">
              <Input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
                data-testid="file-upload-input"
              />
              {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
            </div>

            {/* File list */}
            <ScrollArea className="h-64 border rounded-lg">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileText className="w-8 h-8 mb-2" />
                  <p>Nenhum arquivo enviado</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 flex-shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownload(file.name)}
                          data-testid={`download-file-${idx}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteFile(file.name)}
                          data-testid={`delete-file-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectTimeline;
