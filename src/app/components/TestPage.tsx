import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Trash2, Database, AlertTriangle, RefreshCcw, Activity } from 'lucide-react';
import { useApp } from '../utils/AppContext';
import { toast } from 'sonner';

export function TestPage() {
  const { state, clearAllData, initializeSupabase, loadPlayers, loadMatches, loadPhysicalTests } = useApp();
  const [isClearing, setIsClearing] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleClearDatabase = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
    } catch (error) {
      console.error('Failed to clear database:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      toast.info('Recargando datos...');
      await Promise.all([
        loadPlayers(),
        loadMatches(), 
        loadPhysicalTests()
      ]);
      toast.success('Datos recargados exitosamente');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Error al recargar datos');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Database Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Database className="h-6 w-6" />
              Gestión de Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current State */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <Badge variant={state.supabaseInitialized ? 'default' : 'secondary'}>
                    {state.supabaseInitialized ? 'Supabase' : 'API Local'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">Sistema Activo</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{state.players.length}</div>
                <div className="text-xs text-muted-foreground">Jugadores</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{state.matches.length}</div>
                <div className="text-xs text-muted-foreground">Partidos</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{state.physicalTests.length}</div>
                <div className="text-xs text-muted-foreground">Tests Físicos</div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Clear Database Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="flex items-center gap-2"
                    disabled={isClearing}
                  >
                    <Trash2 className="h-4 w-4" />
                    {isClearing ? 'Limpiando...' : 'Limpiar Base de Datos'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      ⚠️ PELIGRO: Limpiar toda la Base de Datos
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <div>
                        <strong>Esta acción es IRREVERSIBLE</strong> y eliminará completamente:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>{state.players.length} jugadores</strong> y todos sus datos</li>
                        <li><strong>{state.matches.length} partidos</strong> con análisis completos</li>
                        <li><strong>{state.physicalTests.length} tests físicos</strong> y mediciones</li>
                        <li>Datos de cargas de entrenamiento</li>
                        <li>Configuraciones de equipos y competencias</li>
                        <li>Todos los rallies, eventos y estadísticas</li>
                      </ul>
                      <div className="font-medium text-red-600 mt-3">
                        ¿Estás completamente seguro de que quieres eliminar TODOS los datos del sistema?
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar - NO eliminar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleClearDatabase}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Sí, ELIMINAR TODO
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Refresh Data Button */}
              <Button 
                onClick={handleRefreshData}
                variant="outline" 
                className="flex items-center gap-2"
                disabled={isRefreshing}
              >
                <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Recargando...' : 'Recargar Datos'}
              </Button>
            </div>

            {/* Warning */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Advertencia Importante</h4>
                  <p className="text-sm text-red-700 mt-1">
                    La limpieza de la base de datos es una operación destructiva que no se puede deshacer. 
                    Asegúrate de tener respaldos de cualquier información importante antes de proceder.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Typography */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Test de Tipografía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Display 24/700 - Título Principal</h1>
            <h2 className="text-lg font-bold text-gray-900">Title 18/700 - Título de Sección</h2>
            <p className="text-sm font-medium text-gray-700">Body 14/500 - Texto de contenido</p>
            <p className="text-xs font-medium text-gray-500">Caption 12/500 - Texto auxiliar</p>
          </CardContent>
        </Card>

        {/* Test Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Test de Colores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="w-full h-16 bg-[#A191FF] rounded-lg mb-2"></div>
                <p className="text-xs text-muted-foreground">Primary #A191FF</p>
              </div>
              <div className="text-center">
                <div className="w-full h-16 bg-[#91FFB0] rounded-lg mb-2"></div>
                <p className="text-xs text-muted-foreground">Success #91FFB0</p>
              </div>
              <div className="text-center">
                <div className="w-full h-16 bg-[#FFD391] rounded-lg mb-2"></div>
                <p className="text-xs text-muted-foreground">Warning #FFD391</p>
              </div>
              <div className="text-center">
                <div className="w-full h-16 bg-[#FF919F] rounded-lg mb-2"></div>
                <p className="text-xs text-muted-foreground">Danger #FF919F</p>
              </div>
              <div className="text-center">
                <div className="w-full h-16 bg-white/40 rounded-lg mb-2"></div>
                <p className="text-xs text-muted-foreground">Neutral</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Test de Grid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 bg-blue-100 p-4 rounded">12 columnas</div>
              <div className="col-span-6 bg-green-100 p-4 rounded">6 columnas</div>
              <div className="col-span-6 bg-green-100 p-4 rounded">6 columnas</div>
              <div className="col-span-4 bg-yellow-100 p-4 rounded">4 col</div>
              <div className="col-span-4 bg-yellow-100 p-4 rounded">4 col</div>
              <div className="col-span-4 bg-yellow-100 p-4 rounded">4 col</div>
            </div>
          </CardContent>
        </Card>

        {/* Test Spacing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Test de Espaciado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-100 rounded">Padding 16px</div>
            <div className="p-6 bg-gray-200 rounded">Padding 24px</div>
            <div className="flex gap-4">
              <div className="p-2 bg-blue-100 rounded">Gap 16px</div>
              <div className="p-2 bg-blue-100 rounded">Gap 16px</div>
              <div className="p-2 bg-blue-100 rounded">Gap 16px</div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-green-600">✅ Sistema Base Funcionando</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">
              Todos los elementos básicos están funcionando correctamente. 
              Ahora podemos proceder con la implementación de los componentes específicos de voleibol.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}