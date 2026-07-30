import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CompletedChecklistRecord } from "./reports-types";

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncTime: number | null;
  syncNow: () => Promise<void>;
  addToSyncQueue: (checklist: CompletedChecklistRecord) => Promise<void>;
  getSyncQueue: () => Promise<CompletedChecklistRecord[]>;
  clearSyncQueue: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const SYNC_QUEUE_KEY = "@checklist_sync_queue";
const LAST_SYNC_TIME_KEY = "@checklist_last_sync_time";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Carregar fila de sincronização ao iniciar
  useEffect(() => {
    const loadSyncQueue = async () => {
      try {
        const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (queue) {
          const items = JSON.parse(queue);
          setPendingSyncCount(items.length);
        }

        const lastSync = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
        if (lastSync) {
          setLastSyncTime(parseInt(lastSync));
        }
      } catch (error) {
        console.error("Erro ao carregar fila de sincronização:", error);
      }
    };

    loadSyncQueue();
  }, []);

  // Monitorar conexão
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      const online = state.isConnected === true && state.isInternetReachable === true;
      setIsOnline(online);

      // Se voltou online e há itens na fila, sincronizar
      if (online && pendingSyncCount > 0) {
        syncNow();
      }
    });

    return () => unsubscribe();
  }, [pendingSyncCount]);

  // Adicionar checklist à fila de sincronização
  const addToSyncQueue = useCallback(async (checklist: CompletedChecklistRecord) => {
    try {
      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const items: CompletedChecklistRecord[] = queue ? JSON.parse(queue) : [];

      // Verificar se já existe
      const exists = items.some((item) => item.id === checklist.id);
      if (!exists) {
        items.push(checklist);
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
        setPendingSyncCount(items.length);
      }
    } catch (error) {
      console.error("Erro ao adicionar à fila de sincronização:", error);
    }
  }, []);

  // Obter fila de sincronização
  const getSyncQueue = useCallback(async (): Promise<CompletedChecklistRecord[]> => {
    try {
      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error("Erro ao obter fila de sincronização:", error);
      return [];
    }
  }, []);

  // Limpar fila de sincronização
  const clearSyncQueue = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      setPendingSyncCount(0);
    } catch (error) {
      console.error("Erro ao limpar fila de sincronização:", error);
    }
  }, []);

  // Sincronizar dados
  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const queue = await getSyncQueue();

      if (queue.length === 0) {
        setIsSyncing(false);
        return;
      }

      // Aqui você faria a chamada para sincronizar com o servidor
      // Por enquanto, apenas simulamos a sincronização
      console.log(`Sincronizando ${queue.length} checklists...`);

      // Simular delay de sincronização
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Limpar fila após sincronização bem-sucedida
      await clearSyncQueue();

      // Atualizar tempo de última sincronização
      const now = Date.now();
      setLastSyncTime(now);
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, now.toString());

      console.log("Sincronização concluída com sucesso!");
    } catch (error) {
      console.error("Erro durante sincronização:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, getSyncQueue, clearSyncQueue]);

  const value: SyncContextType = {
    isOnline,
    isSyncing,
    pendingSyncCount,
    lastSyncTime,
    syncNow,
    addToSyncQueue,
    getSyncQueue,
    clearSyncQueue,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync deve ser usado dentro de SyncProvider");
  }
  return context;
}
