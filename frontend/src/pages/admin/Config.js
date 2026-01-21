import React, { useState, useRef } from 'react';
import { configAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Upload, Image, Save } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ConfigPage = () => {
  const { isAdmin } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(`${API_URL}/api/config/logo-image`);
  const [logoError, setLogoError] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato de arquivo inválido. Use PNG, JPG, SVG ou WebP.');
      return;
    }

    try {
      setUploading(true);
      await configAPI.uploadLogo(file);
      toast.success('Logo atualizado com sucesso!');
      setLogoError(false);
      // Force refresh of logo
      setLogoUrl(`${API_URL}/api/config/logo-image?t=${Date.now()}`);
    } catch (error) {
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Configure as opções do sistema</p>
      </div>

      <div className="grid gap-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Logo da Empresa
            </CardTitle>
            <CardDescription>
              Este logo será exibido nos relatórios em PDF. Formatos aceitos: PNG, JPG, SVG, WebP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-48 h-24 border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                {logoError ? (
                  <div className="text-center text-muted-foreground text-sm">
                    <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Sem logo
                  </div>
                ) : (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Enviar novo logo</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    data-testid="logo-upload-input"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="logo-upload-btn"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Nome do Sistema</span>
                <span className="font-medium">AgroLink</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Versão</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Limite de Upload</span>
                <span className="font-medium">10 MB por arquivo</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">CRM - Crédito Rural</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfigPage;
