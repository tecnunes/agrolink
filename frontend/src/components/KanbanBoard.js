import React, { useState, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { projectsAPI } from '../lib/api';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageCircle,
  DollarSign,
  User,
  StickyNote,
  GripVertical,
} from 'lucide-react';
import { cn } from '../lib/utils';
import ProjectTimeline from './ProjectTimeline';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const KanbanCard = ({ project, onClick, onWhatsApp, onDragStart, onDragEnd, isDragging }) => {
  // Get current stage pendencias and observacoes
  const currentHistorico = project.historico_etapas?.find(
    h => h.etapa_id === project.etapa_atual_id
  );
  const pendencias = currentHistorico?.pendencias?.filter(p => !p.resolvida) || [];
  const observacoes = currentHistorico?.observacoes || [];
  const lastObservacao = observacoes.length > 0 ? observacoes[observacoes.length - 1] : null;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        project.tem_pendencia && 'border-red-500/50 bg-red-500/5',
        isDragging && 'opacity-50 rotate-2 scale-105 shadow-lg'
      )}
      onClick={onClick}
      draggable={!project.tem_pendencia}
      onDragStart={(e) => onDragStart(e, project)}
      onDragEnd={onDragEnd}
      data-testid={`kanban-card-${project.id}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Tipo do Projeto + Drag Handle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!project.tem_pendencia && (
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            )}
            <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/30">
              {project.tipo_projeto || 'PRONAF'}
            </Badge>
          </div>
          {project.cliente_telefone && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 -mr-1"
              onClick={(e) => {
                e.stopPropagation();
                onWhatsApp(project.cliente_telefone);
              }}
            >
              <MessageCircle className="w-4 h-4 text-green-600" />
            </Button>
          )}
        </div>

        {/* Nome do Cliente */}
        <p className="font-semibold text-sm leading-tight" title={project.cliente_nome}>
          {project.cliente_nome}
        </p>

        {/* Valor do Crédito */}
        <p className="text-lg font-bold text-primary">
          {formatCurrency(project.valor_credito)}
        </p>

        {/* Pendências (se houver) */}
        {pendencias.length > 0 && (
          <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {pendencias.length} Pendência{pendencias.length > 1 ? 's' : ''} - Não pode mover
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 truncate">
                  {pendencias[0].descricao}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Última Observação (se houver) */}
        {lastObservacao && (
          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <StickyNote className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Última anotação
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 truncate">
                  {lastObservacao.texto}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer: Instituição + Duração */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <span className="truncate">{project.instituicao_financeira_nome || 'N/A'}</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{Math.floor((new Date() - new Date(project.data_inicio)) / (1000 * 60 * 60 * 24))}d</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const KanbanColumn = ({ 
  etapa, 
  projects, 
  onCardClick, 
  onWhatsApp, 
  isActive,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragOver,
  draggingProject
}) => {
  const pendingCount = projects.filter(p => p.tem_pendencia).length;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-[280px] bg-muted/30 rounded-lg border transition-all duration-200',
        isActive && 'ring-2 ring-primary/50',
        isDragOver && 'ring-2 ring-emerald-500 bg-emerald-500/10'
      )}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, etapa)}
      data-testid={`kanban-column-${etapa.id}`}
    >
      {/* Column Header */}
      <div className="p-3 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm truncate" title={etapa.nome}>
            {etapa.nome}
          </h3>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="h-5 text-xs">
              {projects.length}
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 text-xs">
                {pendingCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
        <div className="p-2 space-y-2">
          {projects.length === 0 ? (
            <div className={cn(
              "text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg",
              isDragOver && "border-emerald-500 bg-emerald-500/5"
            )}>
              {isDragOver ? 'Solte aqui' : 'Nenhum projeto'}
            </div>
          ) : (
            projects.map((project) => (
              <KanbanCard
                key={project.id}
                project={project}
                onClick={() => onCardClick(project)}
                onWhatsApp={onWhatsApp}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                isDragging={draggingProject?.id === project.id}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const KanbanBoard = ({ projects, etapas, onUpdate }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [draggingProject, setDraggingProject] = useState(null);
  const [dragOverEtapa, setDragOverEtapa] = useState(null);

  const openWhatsApp = (telefone) => {
    if (!telefone) return;
    const phone = telefone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  const handleCardClick = (project) => {
    setSelectedProject(project);
    setShowProjectDialog(true);
  };

  // Refresh project data without closing dialog
  const handleProjectUpdate = useCallback(async () => {
    if (selectedProject) {
      try {
        // Fetch updated project data
        const response = await projectsAPI.get(selectedProject.id);
        setSelectedProject(response.data);
      } catch (error) {
        console.error('Error refreshing project:', error);
      }
    }
    // Always call parent update to refresh the list
    onUpdate();
  }, [selectedProject, onUpdate]);

  const handleDialogClose = () => {
    setShowProjectDialog(false);
    setSelectedProject(null);
    onUpdate(); // Refresh when dialog closes
  };

  // Drag and Drop handlers
  const handleDragStart = (e, project) => {
    if (project.tem_pendencia) {
      e.preventDefault();
      return;
    }
    setDraggingProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingProject(null);
    setDragOverEtapa(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetEtapa) => {
    e.preventDefault();
    
    if (!draggingProject) return;
    
    // Can't move to same etapa
    if (draggingProject.etapa_atual_id === targetEtapa.id) {
      setDraggingProject(null);
      setDragOverEtapa(null);
      return;
    }

    // Check if it's the next etapa (can only move forward one step)
    const currentEtapaOrder = etapas.find(e => e.id === draggingProject.etapa_atual_id)?.ordem || 0;
    const targetEtapaOrder = targetEtapa.ordem;

    if (targetEtapaOrder !== currentEtapaOrder + 1) {
      toast.error('Só é possível avançar para a próxima etapa');
      setDraggingProject(null);
      setDragOverEtapa(null);
      return;
    }

    try {
      await projectsAPI.advanceStage(draggingProject.id);
      toast.success(`Projeto movido para ${targetEtapa.nome}`);
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao mover projeto');
    }

    setDraggingProject(null);
    setDragOverEtapa(null);
  };

  // Group projects by etapa
  const projectsByEtapa = etapas.reduce((acc, etapa) => {
    acc[etapa.id] = projects.filter(p => p.etapa_atual_id === etapa.id);
    return acc;
  }, {});

  // Calculate totals
  const totalProjects = projects.length;
  const totalPending = projects.filter(p => p.tem_pendencia).length;
  const totalValue = projects.reduce((sum, p) => sum + (p.valor_credito || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{totalProjects} projetos</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-muted-foreground">Pendências:</span>
          <span className="font-medium text-amber-600">{totalPending}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span className="text-muted-foreground">Valor:</span>
          <span className="font-medium text-emerald-600">{formatCurrency(totalValue)}</span>
        </div>
        {draggingProject && (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Arraste para a próxima etapa</span>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {etapas.map((etapa) => {
            const etapaProjects = projectsByEtapa[etapa.id] || [];
            const hasActiveProjects = etapaProjects.length > 0;
            const isDropTarget = draggingProject && 
              etapa.ordem === (etapas.find(e => e.id === draggingProject.etapa_atual_id)?.ordem || 0) + 1;
            
            return (
              <KanbanColumn
                key={etapa.id}
                etapa={etapa}
                projects={etapaProjects}
                onCardClick={handleCardClick}
                onWhatsApp={openWhatsApp}
                isActive={hasActiveProjects}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragOver={isDropTarget}
                draggingProject={draggingProject}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Project Detail Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={(open) => {
        if (!open) handleDialogClose();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedProject?.cliente_nome}
              {selectedProject?.tem_pendencia && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Com Pendência
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-4">
              {/* Project Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Valor do Crédito</p>
                  <p className="font-medium">{formatCurrency(selectedProject.valor_credito)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{selectedProject.tipo_projeto || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Instituição</p>
                  <p className="font-medium">{selectedProject.instituicao_financeira_nome || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Etapa Atual</p>
                  <Badge variant="outline">{selectedProject.etapa_atual_nome}</Badge>
                </div>
              </div>

              {/* Timeline - onUpdate now doesn't close dialog */}
              <ProjectTimeline
                project={selectedProject}
                etapas={etapas}
                onUpdate={handleProjectUpdate}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KanbanBoard;
