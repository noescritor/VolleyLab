import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Wifi, WifiOff, Upload, CheckCircle } from 'lucide-react';

interface QueuedAction {
  id: string;
  action: any;
  timestamp: string;
  attempts: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

interface OfflineQueueProps {
  onSync?: (actions: QueuedAction[]) => Promise<void>;
  maxRetries?: number;
  children?: React.ReactNode;
}

export function OfflineQueue({ 
  onSync, 
  maxRetries = 3, 
  children 
}: OfflineQueueProps) {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexión restaurada', {
        description: 'Sincronizando datos pendientes...'
      });
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sin conexión', {
        description: 'Los datos se guardarán localmente'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('volleyball-offline-queue');
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (error) {
        console.error('Error loading offline queue:', error);
        localStorage.removeItem('volleyball-offline-queue');
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('volleyball-offline-queue', JSON.stringify(queue));
  }, [queue]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      syncQueue();
    }
  }, [isOnline, queue.length, isSyncing]);

  const addToQueue = (action: any) => {
    const queuedAction: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      timestamp: new Date().toISOString(),
      attempts: 0,
      status: isOnline ? 'pending' : 'pending'
    };

    setQueue(prev => [...prev, queuedAction]);

    if (isOnline) {
      // Try to sync immediately if online
      syncSingleAction(queuedAction);
    } else {
      toast.info('Guardado localmente', {
        description: 'Se sincronizará cuando tengas conexión'
      });
    }

    return queuedAction.id;
  };

  const syncSingleAction = async (queuedAction: QueuedAction) => {
    if (!onSync) return;

    setQueue(prev => prev.map(item => 
      item.id === queuedAction.id 
        ? { ...item, status: 'syncing', attempts: item.attempts + 1 }
        : item
    ));

    try {
      await onSync([queuedAction]);
      
      setQueue(prev => prev.map(item => 
        item.id === queuedAction.id 
          ? { ...item, status: 'synced' }
          : item
      ));

      // Remove synced actions after a delay
      setTimeout(() => {
        setQueue(prev => prev.filter(item => item.id !== queuedAction.id));
      }, 5000);

    } catch (error) {
      console.error('Sync error:', error);
      
      setQueue(prev => prev.map(item => 
        item.id === queuedAction.id 
          ? { 
              ...item, 
              status: item.attempts >= maxRetries ? 'failed' : 'pending' 
            }
          : item
      ));

      if (queuedAction.attempts >= maxRetries) {
        toast.error('Error al sincronizar', {
          description: 'Acción guardada para retry manual'
        });
      }
    }
  };

  const syncQueue = async () => {
    if (!onSync || isSyncing || queue.length === 0) return;

    setIsSyncing(true);
    const pendingActions = queue.filter(item => 
      item.status === 'pending' && item.attempts < maxRetries
    );

    if (pendingActions.length === 0) {
      setIsSyncing(false);
      return;
    }

    try {
      await onSync(pendingActions);
      
      // Mark all as synced
      setQueue(prev => prev.map(item => 
        pendingActions.some(pa => pa.id === item.id)
          ? { ...item, status: 'synced' }
          : item
      ));

      toast.success(`${pendingActions.length} acciones sincronizadas`);

      // Clean up synced actions
      setTimeout(() => {
        setQueue(prev => prev.filter(item => item.status !== 'synced'));
      }, 5000);

    } catch (error) {
      console.error('Batch sync error:', error);
      
      // Increment attempts for failed actions
      setQueue(prev => prev.map(item => 
        pendingActions.some(pa => pa.id === item.id)
          ? { 
              ...item, 
              attempts: item.attempts + 1,
              status: item.attempts + 1 >= maxRetries ? 'failed' : 'pending'
            }
          : item
      ));

      toast.error('Error en sincronización', {
        description: 'Se reintentará automáticamente'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const retryFailed = () => {
    setQueue(prev => prev.map(item => 
      item.status === 'failed' 
        ? { ...item, status: 'pending', attempts: 0 }
        : item
    ));
    
    if (isOnline) {
      syncQueue();
    }
  };

  const clearQueue = () => {
    setQueue([]);
    localStorage.removeItem('volleyball-offline-queue');
    toast.success('Cola de sincronización limpiada');
  };

  // Provide context to children
  const queueContext = {
    addToQueue,
    isOnline,
    queueLength: queue.length,
    pendingCount: queue.filter(item => item.status === 'pending').length,
    failedCount: queue.filter(item => item.status === 'failed').length,
    isSyncing,
    retryFailed,
    clearQueue,
    syncQueue
  };

  return (
    <OfflineQueueContext.Provider value={queueContext}>
      {children}
      <QueueStatusIndicator />
    </OfflineQueueContext.Provider>
  );
}

// Context for accessing queue functionality
const OfflineQueueContext = React.createContext<any>(null);

export function useOfflineQueue() {
  const context = React.useContext(OfflineQueueContext);
  if (!context) {
    throw new Error('useOfflineQueue must be used within OfflineQueue');
  }
  return context;
}

// Status indicator component
function QueueStatusIndicator() {
  const { isOnline, pendingCount, failedCount, isSyncing } = useOfflineQueue();

  if (pendingCount === 0 && failedCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64">
        <div className="flex items-center gap-2 mb-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="font-medium text-sm">
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isSyncing ? (
              <Upload className="h-3 w-3 animate-spin" />
            ) : (
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
            )}
            <span>{pendingCount} acciones pendientes</span>
          </div>
        )}

        {failedCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
            <div className="h-2 w-2 bg-red-500 rounded-full" />
            <span>{failedCount} acciones fallidas</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfflineQueue;