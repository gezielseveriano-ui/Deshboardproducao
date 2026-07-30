import { useEffect, useRef } from "react";
import { useNetInfo } from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SYNC_TIME_KEY = "last_auto_sync_time";

interface AutoSyncConfig {
  onSyncStart?: () => void;
  onSyncComplete?: (successCount: number, errorCount: number) => void;
  onSyncError?: (error: Error) => void;
}

/**
 * Hook que detecta quando o tablet reconecta à rede e sincroniza automaticamente
 * os checklists offline que estão salvos localmente
 */
export function useAutoSyncOnReconnect(config?: AutoSyncConfig) {
  const netInfo = useNetInfo();
  const wasOfflineRef = useRef(true);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    console.log("[AutoSync] Estado da rede:", { 
      isConnected: netInfo.isConnected, 
      type: netInfo.type,
      wasOffline: wasOfflineRef.current 
    });

    // Se está conectado e estava offline, sincronizar
    if (netInfo.isConnected && wasOfflineRef.current) {
      console.log("[AutoSync] ✅ Reconectado à rede, iniciando sincronização automática...");
      syncChecklistsFromStorage();
      wasOfflineRef.current = false;
    } else if (!netInfo.isConnected) {
      // Marcou como offline
      wasOfflineRef.current = true;
      console.log("[AutoSync] ⚠️ Sem conexão de rede");
    }
  }, [netInfo.isConnected, netInfo.type]);

  async function syncChecklistsFromStorage() {
    if (isSyncingRef.current) {
      console.log("[AutoSync] Já está sincronizando, ignorando chamada");
      return;
    }

    isSyncingRef.current = true;
    config?.onSyncStart?.();

    try {
      const completedChecklistsJson = await AsyncStorage.getItem("completed_checklists");
      if (!completedChecklistsJson) {
        console.log("[AutoSync] Nenhum checklist local para sincronizar");
        isSyncingRef.current = false;
        config?.onSyncComplete?.(0, 0);
        return;
      }

      const completedChecklists = JSON.parse(completedChecklistsJson);
      console.log("[AutoSync] Encontrados", completedChecklists.length, "checklists para sincronizar");

      const apiUrl = "https://chklistapp-8bfswvbm.manus.space";
      console.log("[AutoSync] Usando API URL:", apiUrl);
      
      let successCount = 0;
      let errorCount = 0;

      for (const checklist of completedChecklists) {
        try {
          console.log("[AutoSync] Sincronizando:", checklist.checklistCode);

          // Validar dados obrigatórios
          const requiredFields = ['checklistCode', 'checklistName', 'categoria', 'modelo', 'resultado', 'executanteName', 'dataRecuperacao', 'totalEtapas', 'etapasOK', 'etapasNaoOK', 'etapasNaoAplicavel'];
          const missingFields = requiredFields.filter(field => !checklist[field]);
          if (missingFields.length > 0) {
            console.warn(`[AutoSync] Campos faltando em ${checklist.checklistCode}:`, missingFields);
            errorCount++;
            continue;
          }

          const response = await fetch(`${apiUrl}/api/sync-checklist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tabletId: "auto-sync",
              checklistType: checklist.checklistType,
              checklistCode: checklist.checklistCode,
              checklistData: {
                checklistCode: checklist.checklistCode,
                checklistName: checklist.checklistName,
                categoria: checklist.categoria,
                modelo: checklist.modelo,
                resultado: checklist.resultado,
                executanteName: checklist.executanteName,
                executanteMatricula: checklist.executanteMatricula,
                liderName: checklist.liderName,
                liderMatricula: checklist.liderMatricula,
                inspectorName: checklist.inspectorName,
                inspectorMatricula: checklist.inspectorMatricula,
                dataFabricacao: checklist.dataFabricacao,
                dataRecuperacao: checklist.dataRecuperacao,
                numeroOP: checklist.numeroOP,
                numeroSerie: checklist.numeroSerie,
                totalEtapas: checklist.totalEtapas,
                etapasOK: checklist.etapasOK,
                etapasNaoOK: checklist.etapasNaoOK,
                etapasNaoAplicavel: checklist.etapasNaoAplicavel,
              },
              email: checklist.email || "",
            }),
          });

          if (response.ok) {
            console.log("[AutoSync] ✅ Sincronizado:", checklist.checklistCode);
            successCount++;
          } else {
            const errorText = await response.text();
            console.error("[AutoSync] ❌ Erro ao sincronizar:", checklist.checklistCode, response.status, errorText);
            errorCount++;
          }
        } catch (error) {
          console.error("[AutoSync] ❌ Erro na requisição:", error);
          errorCount++;
        }
      }

      console.log("[AutoSync] Sincronização concluída:", { successCount, errorCount });
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, new Date().toISOString());
      config?.onSyncComplete?.(successCount, errorCount);
    } catch (error) {
      console.error("[AutoSync] ❌ Erro ao sincronizar:", error);
      config?.onSyncError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      isSyncingRef.current = false;
    }
  }

  return {
    syncChecklistsFromStorage,
    isSyncing: isSyncingRef.current,
  };
}
