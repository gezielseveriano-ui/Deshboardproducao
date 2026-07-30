import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedChecklistRecord } from './reports-types';

interface ReportsContextType {
  completedChecklists: CompletedChecklistRecord[];
  addCompletedChecklist: (record: CompletedChecklistRecord) => Promise<void>;
  loadCompletedChecklists: () => Promise<void>;
  syncWithServer: () => Promise<boolean>;
  recoverFromServer: () => Promise<boolean>;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

const STORAGE_KEY = 'completed_checklists';

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [completedChecklists, setCompletedChecklists] = useState<CompletedChecklistRecord[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Carregar dados ao inicializar
  useEffect(() => {
    loadCompletedChecklists();
  }, [refreshTrigger]);

  // Recarregar dados quando completedChecklists mudar (removido interval que causava duplicação)

  const loadCompletedChecklists = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setCompletedChecklists(JSON.parse(data));
      }
    } catch (error) {
      console.error('Erro ao carregar checklists completados:', error);
    }
  };

  const addCompletedChecklist = async (record: CompletedChecklistRecord) => {
    try {
      // Remover checklist com o mesmo ID se ja existir (evita duplicacao)
      const filtered = completedChecklists.filter(c => c.id !== record.id);
      // Adicionar o novo registro
      const updated = [...filtered, record];
      setCompletedChecklists(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Erro ao salvar checklist completado:', error);
    }
  };

  // Sincronizar checklists com servidor (backup remoto)
  const syncWithServer = async () => {
    try {
      console.log('[Sync] Iniciando sincronização com servidor...');
      const apiUrl = "https://chklistapp-8bfswvbm.manus.space";
      
      for (const checklist of completedChecklists) {
        try {
          const response = await fetch(`${apiUrl}/api/checklists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checklist),
          });
          
          if (!response.ok) {
            console.error(`[Sync] Erro ao sincronizar ${checklist.id}:`, response.statusText);
          } else {
            console.log(`[Sync] ✓ ${checklist.id} sincronizado`);
          }
        } catch (error) {
          console.error(`[Sync] Erro ao sincronizar ${checklist.id}:`, error);
        }
      }
      
      console.log('[Sync] Sincronização concluída');
      return true;
    } catch (error) {
      console.error('[Sync] Erro geral:', error);
      return false;
    }
  };

  // Recuperar checklists do servidor (restauração de backup)
  const recoverFromServer = async () => {
    try {
      console.log('[Recovery] Tentando recuperar checklists do servidor...');
      const apiUrl = "https://chklistapp-8bfswvbm.manus.space";
      
      const response = await fetch(`${apiUrl}/api/checklists`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        console.error('[Recovery] Erro ao recuperar:', response.statusText);
        return false;
      }
      
      const serverChecklists = await response.json();
      console.log(`[Recovery] ✓ ${serverChecklists.length} checklists recuperados`);
      
      // Mesclar com dados locais (servidor tem prioridade)
      const merged = [...completedChecklists];
      for (const serverChecklist of serverChecklists) {
        const index = merged.findIndex(c => c.id === serverChecklist.id);
        if (index >= 0) {
          merged[index] = serverChecklist; // Atualizar com versão do servidor
        } else {
          merged.push(serverChecklist); // Adicionar novo
        }
      }
      
      setCompletedChecklists(merged);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return true;
    } catch (error) {
      console.error('[Recovery] Erro geral:', error);
      return false;
    }
  };

  // Sincronização automática a cada 5 minutos
  useEffect(() => {
    const syncInterval = setInterval(() => {
      console.log('[Auto-Sync] Sincronizando automaticamente...');
      syncWithServer();
    }, 5 * 60 * 1000); // 5 minutos
    
    return () => clearInterval(syncInterval);
  }, [completedChecklists]);

  return (
    <ReportsContext.Provider value={{ completedChecklists, addCompletedChecklist, loadCompletedChecklists, syncWithServer, recoverFromServer }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports deve ser usado dentro de ReportsProvider');
  }
  return context;
}
