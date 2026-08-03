import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const SYNC_QUEUE_KEY = "sync_queue";
const LAST_SYNC_KEY = "last_sync_time";

export interface SyncQueueItem {
  id: string;
  checklistId: string;
  action: "create" | "update" | "delete";
  data: any;
  timestamp: number;
  retries: number;
}

/**
 * Adicionar item à fila de sincronização
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "timestamp" | "retries">) {
  try {
    const queue = await getSyncQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    };
    
    queue.push(newItem);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    console.log("[SyncService] Item adicionado à fila:", newItem.id);
    
    // Tentar sincronizar imediatamente se houver internet
    await trySyncQueue();
  } catch (error) {
    console.error("[SyncService] Erro ao adicionar à fila:", error);
  }
}

/**
 * Obter fila de sincronização
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error("[SyncService] Erro ao obter fila:", error);
    return [];
  }
}

/**
 * Limpar fila de sincronização
 */
export async function clearSyncQueue() {
  try {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    console.log("[SyncService] Fila de sincronização limpa");
  } catch (error) {
    console.error("[SyncService] Erro ao limpar fila:", error);
  }
}

/**
 * Tentar sincronizar fila
 */
export async function trySyncQueue() {
  try {
    // Verificar conexão
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log("[SyncService] Sem conexão, sincronização adiada");
      return;
    }

    const queue = await getSyncQueue();
    if (queue.length === 0) {
      console.log("[SyncService] Fila vazia, nada para sincronizar");
      return;
    }

    console.log(`[SyncService] Iniciando sincronização de ${queue.length} items`);

    const { trpc } = require("@/lib/trpc");
    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      try {
        // Tentar sincronizar cada item
        if (item.action === "create" || item.action === "update") {
          const result = await trpc.checklist.saveCompleted.mutate(item.data);
          
          if (result?.success) {
            successCount++;
            // Remover da fila
            const updatedQueue = queue.filter((q) => q.id !== item.id);
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
            console.log(`[SyncService] Item sincronizado: ${item.id}`);
          } else {
            failCount++;
            // Incrementar retries
            item.retries++;
            if (item.retries > 3) {
              // Remover após 3 tentativas
              const updatedQueue = queue.filter((q) => q.id !== item.id);
              await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
              console.warn(`[SyncService] Item removido após 3 tentativas: ${item.id}`);
            }
          }
        }
      } catch (error) {
        failCount++;
        console.error(`[SyncService] Erro ao sincronizar ${item.id}:`, error);
        item.retries++;
      }
    }

    // Atualizar último tempo de sincronização
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    console.log(`[SyncService] Sincronização concluída: ${successCount} sucesso, ${failCount} falhas`);
  } catch (error) {
    console.error("[SyncService] Erro ao sincronizar fila:", error);
  }
}

/**
 * Obter último tempo de sincronização
 */
export async function getLastSyncTime(): Promise<Date | null> {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? new Date(lastSync) : null;
  } catch (error) {
    console.error("[SyncService] Erro ao obter último sync:", error);
    return null;
  }
}

/**
 * Monitorar conexão e sincronizar quando voltar online
 */
export function startSyncMonitor() {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      console.log("[SyncService] Conexão restaurada, tentando sincronizar...");
      trySyncQueue();
    } else {
      console.log("[SyncService] Sem conexão, modo offline ativado");
    }
  });

  return unsubscribe;
}
