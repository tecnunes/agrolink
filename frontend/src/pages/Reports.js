import React, { useState, useCallback, useRef } from 'react';
import { reportsAPI, etapasAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { FileText, Filter, Download, Search, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatCPF = (cpf) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [etapas, setEtapas] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({
    mes: '',
    ano: '',
    etapa_id: '',
    pendencia: null,
    valor_min: '',
    valor_max: '',
  });
  const tableRef = useRef(null);

  React.useEffect(() => {
    loadEtapas();
  }, []);

  const loadEtapas = async () => {
    try {
      const response = await etapasAPI.list();
      setEtapas(response.data);
    } catch (error) {
      console.error('Erro ao carregar etapas');
    }
  };

  const handleSearch = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.mes) params.mes = parseInt(filters.mes);
      if (filters.ano) params.ano = parseInt(filters.ano);
      if (filters.etapa_id) params.etapa_id = filters.etapa_id;
      if (filters.pendencia !== null) params.pendencia = filters.pendencia;
      if (filters.valor_min) params.valor_min = parseFloat(filters.valor_min);
      if (filters.valor_max) params.valor_max = parseFloat(filters.valor_max);

      const response = await reportsAPI.summary(params);
      setReport(response.data);
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleExportPDF = () => {
    if (!report) {
      toast.error('Gere um relatório primeiro');
      return;
    }

    // Create printable content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório AgroLink</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #14532D; border-bottom: 2px solid #14532D; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #14532D; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
          .summary-card { background: #f5f5f5; padding: 15px; border-radius: 8px; min-width: 150px; }
          .summary-card h3 { margin: 0; font-size: 14px; color: #666; }
          .summary-card p { margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #14532D; }
          .pendencia { color: #B91C1C; }
          .ok { color: #15803D; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>📊 Relatório AgroLink - Crédito Rural</h1>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        
        <h2>Resumo</h2>
        <div class="summary">
          <div class="summary-card">
            <h3>Total de Projetos</h3>
            <p>${report.resumo.total_projetos}</p>
          </div>
          <div class="summary-card">
            <h3>Valor Total</h3>
            <p>${formatCurrency(report.resumo.total_credito)}</p>
          </div>
          <div class="summary-card">
            <h3>Com Pendência</h3>
            <p class="pendencia">${report.resumo.com_pendencia}</p>
          </div>
        </div>

        <h2>Por Status</h2>
        <ul>
          <li>Em Andamento: ${report.resumo.por_status.em_andamento}</li>
          <li>Arquivados: ${report.resumo.por_status.arquivado}</li>
          <li>Desistidos: ${report.resumo.por_status.desistido}</li>
        </ul>

        <h2>Por Etapa</h2>
        <ul>
          ${Object.entries(report.resumo.por_etapa).map(([etapa, count]) => `<li>${etapa}: ${count}</li>`).join('')}
        </ul>

        <h2>Detalhamento</h2>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Valor Crédito</th>
              <th>Etapa</th>
              <th>Status</th>
              <th>Duração</th>
              <th>Pendência</th>
            </tr>
          </thead>
          <tbody>
            ${report.projetos.map(p => `
              <tr>
                <td>${p.cliente_nome}</td>
                <td>${formatCPF(p.cliente_cpf)}</td>
                <td>${formatCurrency(p.valor_credito)}</td>
                <td>${p.etapa_atual}</td>
                <td>${p.status}</td>
                <td>${p.duracao_total_dias} dias</td>
                <td class="${p.tem_pendencia ? 'pendencia' : 'ok'}">${p.tem_pendencia ? 'Sim' : 'Não'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Gere relatórios detalhados dos projetos</p>
        </div>
        <Button onClick={handleExportPDF} disabled={!report} data-testid="export-pdf-btn">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Configure os filtros para gerar o relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select
                value={filters.mes}
                onValueChange={(v) => setFilters({ ...filters, mes: v })}
              >
                <SelectTrigger data-testid="filter-mes">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano</Label>
              <Select
                value={filters.ano}
                onValueChange={(v) => setFilters({ ...filters, ano: v })}
              >
                <SelectTrigger data-testid="filter-ano">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select
                value={filters.etapa_id}
                onValueChange={(v) => setFilters({ ...filters, etapa_id: v })}
              >
                <SelectTrigger data-testid="filter-etapa">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {etapas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Mínimo</Label>
              <Input
                type="number"
                placeholder="R$ 0,00"
                value={filters.valor_min}
                onChange={(e) => setFilters({ ...filters, valor_min: e.target.value })}
                data-testid="filter-valor-min"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Máximo</Label>
              <Input
                type="number"
                placeholder="R$ 999.999,00"
                value={filters.valor_max}
                onChange={(e) => setFilters({ ...filters, valor_max: e.target.value })}
                data-testid="filter-valor-max"
              />
            </div>

            <div className="space-y-2">
              <Label>Com Pendência</Label>
              <Select
                value={filters.pendencia === null ? '' : filters.pendencia.toString()}
                onValueChange={(v) => setFilters({ ...filters, pendencia: v === '' ? null : v === 'true' })}
              >
                <SelectTrigger data-testid="filter-pendencia">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSearch} disabled={loading} data-testid="generate-report-btn">
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Projetos</p>
                  <p className="text-3xl font-bold">{report.resumo.total_projetos}</p>
                </div>
                <FileText className="w-10 h-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(report.resumo.total_credito)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Com Pendência</p>
                  <p className="text-3xl font-bold text-amber-600">{report.resumo.com_pendencia}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-amber-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Andamento</p>
                  <p className="text-3xl font-bold text-emerald-600">{report.resumo.por_status.em_andamento}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-emerald-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resultados ({report.projetos.length} projetos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={tableRef} className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">CPF</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden md:table-cell">Etapa</TableHead>
                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Duração</TableHead>
                    <TableHead className="hidden xl:table-cell">Parceiro</TableHead>
                    <TableHead>Pendência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.projetos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum projeto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.projetos.map((proj) => (
                      <TableRow key={proj.id}>
                        <TableCell className="font-medium">{proj.cliente_nome}</TableCell>
                        <TableCell className="hidden sm:table-cell mono text-sm">
                          {formatCPF(proj.cliente_cpf)}
                        </TableCell>
                        <TableCell>{formatCurrency(proj.valor_credito)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{proj.etapa_atual}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell capitalize">{proj.status}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {proj.duracao_total_dias} dias
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">{proj.parceiro || '-'}</TableCell>
                        <TableCell>
                          {proj.tem_pendencia ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Sim
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3 h-3" />
                              Não
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-64" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
