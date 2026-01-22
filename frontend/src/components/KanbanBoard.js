import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageCircle,
  ChevronRight,
  DollarSign,
  Building2,
  User,
} from 'lucide-react';
import { cn } from '../lib/utils';
import ProjectTimeline from './ProjectTimeline';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const KanbanCard = ({ project, onClick, onWhatsApp }) => {
  const calculateDuration = (dataInicio) => {
    const start = new Date(dataInicio);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };

  const getDurationColor = (days) => {
    if (days <= 7) return 'text-emerald-600 dark:text-emerald-400';
    if (days <= 14) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const duration = calculateDuration(project.data_inicio);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        project.tem_pendencia && 'border-red-500/50 bg-red-500/5'
      )}
      onClick={onClick}
      data-testid={`kanban-card-${project.id}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: Nome + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" title={project.cliente_nome}>
              {project.cliente_nome}
            </p>
          </div>
          {project.tem_pendencia ? (
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          )}
        </div>

        {/* Valor + Instituição */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span className="font-medium text-foreground">
            {formatCurrency(project.valor_credito)}
          </span>
        </div>

        {project.instituicao_financeira_nome && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{project.instituicao_financeira_nome}</span>
          </div>
        )}

        {/* Footer: Duração + WhatsApp */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className={cn('flex items-center gap-1 text-xs', getDurationColor(duration))}>
            <Clock className="w-3 h-3" />
            <span className="font-medium">{duration}d</span>
          </div>
          {project.cliente_telefone && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onWhatsApp(project.cliente_telefone);
              }}
            >
              <MessageCircle className="w-3 h-3 text-green-600" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const KanbanColumn = ({ etapa, projects, onCardClick, onWhatsApp, isActive }) => {
  const pendingCount = projects.filter(p => p.tem_pendencia).length;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-[280px] bg-muted/30 rounded-lg border',
        isActive && 'ring-2 ring-primary/50'
      )}
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
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum projeto
            </div>
          ) : (
            projects.map((project) => (
              <KanbanCard
                key={project.id}
                project={project}
                onClick={() => onCardClick(project)}
                onWhatsApp={onWhatsApp}
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

  const handleDialogClose = () => {
    setShowProjectDialog(false);
    setSelectedProject(null);
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
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {etapas.map((etapa, index) => {
            const etapaProjects = projectsByEtapa[etapa.id] || [];
            const hasActiveProjects = etapaProjects.length > 0;
            
            return (
              <KanbanColumn
                key={etapa.id}
                etapa={etapa}
                projects={etapaProjects}
                onCardClick={handleCardClick}
                onWhatsApp={openWhatsApp}
                isActive={hasActiveProjects}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Project Detail Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
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

              {/* Timeline */}
              <ProjectTimeline
                project={selectedProject}
                etapas={etapas}
                onUpdate={() => {
                  onUpdate();
                  handleDialogClose();
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KanbanBoard;
