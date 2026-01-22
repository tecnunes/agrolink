import React, { useState, useEffect } from 'react';
import { masterAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Trash2,
  Database,
  Users,
  FolderOpen,
  FileText,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';

const EliminarDados = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const CONFIRM_PHRASE = 'ELIMINAR TUDO';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await masterAPI.getDataStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      toast.error(`Digite "${CONFIRM_PHRASE}" para confirmar`);
      return;
    }

    try {
      setDeleting(true);
      const response = await masterAPI.resetAllData();
      toast.success('Todos os dados foram eliminados!');
      setShowConfirmDialog(false);
      setConfirmText('');
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao eliminar dados');
    } finally {
      setDeleting(false);
    }
  };

  // Only Master can access this page
  if (user?.role !== 'master') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Apenas o usuário Master pode acessar esta funcionalidade.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-destructive" />
          Eliminar Dados
        </h1>
        <p className="text-muted-foreground">
          Zona restrita - Apenas para usuário Master
        </p>
      </div>

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Atenção! Ação Irreversível</AlertTitle>
        <AlertDescription>
          Esta funcionalidade irá apagar PERMANENTEMENTE todos os projetos, propostas e clientes do sistema.
          Esta ação NÃO pode ser desfeita. Use com extrema cautela.
        </AlertDescription>
      </Alert>

      {/* Data Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Dados no Sistema
          </CardTitle>
          <CardDescription>
            Resumo dos dados que serão eliminados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Clientes */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{stats?.clients || 0}</p>
                </div>
              </div>
            </div>

            {/* Projetos */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <FolderOpen className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projetos</p>
                  <p className="text-2xl font-bold">{stats?.projects || 0}</p>
                </div>
              </div>
            </div>

            {/* Propostas */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Propostas</p>
                  <p className="text-2xl font-bold">{stats?.propostas || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 p-4 rounded-lg border-2 border-dashed">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total de registros:</span>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {stats?.total || 0}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Button */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Eliminar Todos os Dados
          </CardTitle>
          <CardDescription>
            Clique no botão abaixo para iniciar o processo de eliminação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => setShowConfirmDialog(true)}
            disabled={stats?.total === 0}
            data-testid="btn-eliminar-dados"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar Todos os Dados
          </Button>
          
          {stats?.total === 0 && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Não há dados para eliminar. O sistema já está limpo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Eliminação
            </DialogTitle>
            <DialogDescription>
              Esta ação irá apagar permanentemente:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg space-y-2">
              <p className="flex items-center justify-between">
                <span>Clientes:</span>
                <Badge variant="destructive">{stats?.clients || 0}</Badge>
              </p>
              <p className="flex items-center justify-between">
                <span>Projetos:</span>
                <Badge variant="destructive">{stats?.projects || 0}</Badge>
              </p>
              <p className="flex items-center justify-between">
                <span>Propostas:</span>
                <Badge variant="destructive">{stats?.propostas || 0}</Badge>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Digite <strong className="text-destructive">{CONFIRM_PHRASE}</strong> para confirmar:
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder={CONFIRM_PHRASE}
                className="font-mono"
                data-testid="input-confirm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetData}
              disabled={confirmText !== CONFIRM_PHRASE || deleting}
              data-testid="btn-confirm-eliminar"
            >
              {deleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EliminarDados;
