import React, { useState, useEffect, useCallback } from 'react';
import { projectsAPI, etapasAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Archive, ChevronDown, ChevronRight, Clock, CheckCircle, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatCPF = (cpf) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const ArchivedProjects = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsRes, etapasRes] = await Promise.all([
        projectsAPI.list({ status: 'arquivado' }),
        etapasAPI.list(),
      ]);
      setProjects(projectsRes.data);
      setEtapas(etapasRes.data);
    } catch (error) {
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateTotalDuration = (project) => {
    if (!project.data_arquivamento) return '-';
    const start = new Date(project.data_inicio);
    const end = new Date(project.data_arquivamento);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  };

  const openWhatsApp = (telefone) => {
    if (!telefone) return;
    const phone = telefone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
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
        <h1 className="text-2xl sm:text-3xl font-bold">Projetos Finalizados</h1>
        <p className="text-muted-foreground">Histórico de projetos arquivados</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Projetos Arquivados ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">CPF</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Valor Crédito</TableHead>
                  <TableHead className="hidden lg:table-cell">Início</TableHead>
                  <TableHead className="hidden lg:table-cell">Arquivamento</TableHead>
                  <TableHead className="hidden xl:table-cell">Duração</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum projeto arquivado
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <React.Fragment key={project.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted/50',
                          expandedProject === project.id && 'bg-muted/50'
                        )}
                        onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                        data-testid={`archived-project-row-${project.id}`}
                      >
                        <TableCell>
                          {expandedProject === project.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{project.cliente_nome}</TableCell>
                        <TableCell className="hidden sm:table-cell mono text-sm">
                          {formatCPF(project.cliente_cpf)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{project.tipo_projeto || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(project.valor_credito || 0)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {new Date(project.data_inicio).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {project.data_arquivamento 
                            ? new Date(project.data_arquivamento).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {calculateTotalDuration(project)} dias
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 whitespace-nowrap">
                              <CheckCircle className="w-3 h-3" />
                              Concluído
                            </Badge>
                            {project.cliente_telefone && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(project.cliente_telefone);
                                }}
                                className="h-8 w-8"
                              >
                                <MessageCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedProject === project.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-0 bg-muted/30">
                            <div className="p-6">
                              {/* Project details */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {project.numero_contrato && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Nº Contrato</p>
                                    <p className="font-medium">{project.numero_contrato}</p>
                                  </div>
                                )}
                                {project.valor_servico && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Valor Serviço</p>
                                    <p className="font-medium">{formatCurrency(project.valor_servico)}</p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Timeline readonly view */}
                              <h4 className="font-medium mb-4">Histórico de Etapas</h4>
                              <div className="relative">
                                <div className="flex items-center justify-between overflow-x-auto pb-4">
                                  {etapas.map((etapa, index) => {
                                    const historico = project.historico_etapas?.find(h => h.etapa_id === etapa.id);
                                    const duration = historico?.dias_duracao || 0;
                                    
                                    return (
                                      <div key={etapa.id} className="flex items-center flex-shrink-0">
                                        <div className="flex flex-col items-center">
                                          <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-emerald-500 border-emerald-500 text-white">
                                            <CheckCircle className="w-5 h-5" />
                                          </div>
                                          <span className="mt-2 text-xs font-medium text-center max-w-[80px]">
                                            {etapa.nome}
                                          </span>
                                          {historico && (
                                            <Badge variant="outline" className="mt-1 text-xs">
                                              <Clock className="w-3 h-3 mr-1" />
                                              {duration}d
                                            </Badge>
                                          )}
                                        </div>
                                        {index < etapas.length - 1 && (
                                          <div className="w-12 h-0.5 mx-2 bg-emerald-500" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivedProjects;
