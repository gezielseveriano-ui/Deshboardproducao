import { useCallback, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNetInfo } from "@react-native-community/netinfo";

interface SyncChecklistParams {
  tabletId: string;
  checklistType: string;
  checklistCode: string;
  checklistData: any;
}

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  error: string | null;
}

const SYNC_QUEUE_KEY = "sync_queue";
const TABLET_ID_KEY = "tablet_id";
const LAST_SYNC_TIME_KEY = "last_sync_time";
// URL do servidor em produção - usar a URL do servidor Node.js
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000";

export function useSyncChecklist() {
  const syncStatusRef = useRef<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    error: null,
  });

  const netInfo = useNetInfo();

  // Gerar ou obter ID único do tablet
  const getTabletId = useCallback(async () => {
    let tabletId = await AsyncStorage.getItem(TABLET_ID_KEY);
    if (!tabletId) {
      tabletId = `tablet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(TABLET_ID_KEY, tabletId);
    }
    return tabletId;
  }, []);

  // Adicionar checklist à fila de sincronização
  const queueChecklistForSync = useCallback(
    async (params: SyncChecklistParams) => {
      try {
        const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const syncQueue = queue ? JSON.parse(queue) : [];

        syncQueue.push({
          id: `${params.checklistCode}-${Date.now()}`,
          ...params,
          queuedAt: new Date().toISOString(),
          synced: false,
        });

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));

        syncStatusRef.current.pendingCount = syncQueue.length;

        // Tentar sincronizar se estiver conectado
        if (netInfo.isConnected) {
          await syncPendingChecklists();
        }
      } catch (error) {
        console.error("Erro ao adicionar checklist à fila:", error);
        syncStatusRef.current.error =
          error instanceof Error ? error.message : "Erro desconhecido";
      }
    },
    [netInfo.isConnected]
  );

  // Sincronizar checklists pendentes
  const syncPendingChecklists = useCallback(async () => {
    console.log("[Sync] Tentando sincronizar...", {
      isSyncing: syncStatusRef.current.isSyncing,
      isConnected: netInfo.isConnected,
    });
    
    if (syncStatusRef.current.isSyncing || !netInfo.isConnected) {
      console.log("[Sync] Abortado: já sincronizando ou sem rede");
      return;
    }

    try {
      syncStatusRef.current.isSyncing = true;
      syncStatusRef.current.error = null;

      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (!queue) {
        console.log("[Sync] Nenhuma fila encontrada");
        syncStatusRef.current.isSyncing = false;
        return;
      }

      const syncQueue = JSON.parse(queue);
      const pendingChecklists = syncQueue.filter((item: any) => !item.synced);
      
      console.log("[Sync] Fila encontrada:", {
        totalNaFila: syncQueue.length,
        pendentes: pendingChecklists.length,
      });

      if (pendingChecklists.length === 0) {
        console.log("[Sync] Nenhum checklist pendente");
        syncStatusRef.current.isSyncing = false;
        return;
      }

      const tabletId = await getTabletId();

      // Sincronizar cada checklist
      console.log("[Sync] Iniciando sincronização de", pendingChecklists.length, "checklists");
      
      for (const checklist of pendingChecklists) {
        try {
          console.log("[Sync] Enviando checklist:", checklist.checklistCode);
          
          const response = await fetch(`${API_URL}/api/sync-checklist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tabletId,
              checklistType: checklist.checklistType,
              checklistCode: checklist.checklistCode,
              checklistData: checklist.checklistData,
              email: checklist.checklistData?.email || "",
            }),
          });

          if (response.ok) {
            console.log("[Sync] ✅ Checklist sincronizado:", checklist.checklistCode);
            // Marcar como sincronizado
            checklist.synced = true;
            checklist.syncedAt = new Date().toISOString();
          } else {
            const errorText = await response.text();
            console.error("[Sync] ❌ Erro HTTP:", response.status, errorText);
            throw new Error(`Erro HTTP: ${response.status}`);
          }
        } catch (error) {
          console.error("[Sync] ❌ Erro ao sincronizar checklist:", error);
          // Continuar com os próximos
        }
      }

      // Atualizar fila
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));

      // Atualizar status
      const stillPending = syncQueue.filter((item: any) => !item.synced).length;
      syncStatusRef.current.pendingCount = stillPending;
      syncStatusRef.current.lastSyncTime = new Date().toISOString();
      syncStatusRef.current.isSyncing = false;

      console.log(`Sincronização concluída. Pendentes: ${stillPending}`);
    } catch (error) {
      console.error("Erro durante sincronização:", error);
      syncStatusRef.current.error =
        error instanceof Error ? error.message : "Erro desconhecido";
      syncStatusRef.current.isSyncing = false;
    }
  }, [netInfo.isConnected, getTabletId]);

  // Sincronizar quando conectar à rede
  useEffect(() => {
    if (netInfo.isConnected && !syncStatusRef.current.isSyncing) {
      syncPendingChecklists();
    }
  }, [netInfo.isConnected, syncPendingChecklists]);

  // Sincronizar periodicamente (a cada 30 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      if (netInfo.isConnected && !syncStatusRef.current.isSyncing) {
        syncPendingChecklists();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [netInfo.isConnected, syncPendingChecklists]);

  return {
    queueChecklistForSync,
    syncPendingChecklists,
    syncStatus: syncStatusRef.current,
    isConnected: netInfo.isConnected,
  };
}
