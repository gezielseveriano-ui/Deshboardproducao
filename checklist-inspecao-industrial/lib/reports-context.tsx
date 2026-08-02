import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedChecklistRecord } from './reports-types';
import * as SupabaseSync from './supabase-sync';
import { UUID_REGEX } from './supabase-sync';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';

interface ReportsContextType {
  completedChecklists: CompletedChecklistRecord[];
  addCompletedChecklist: (record: CompletedChecklistRecord) => Promise<void>;
  deleteCompletedChecklists: (ids: string[]) => Promise<{ deleted: number; failed: number }>;
  loadCompletedChecklists: () => Promise<void>;
  syncPendingChecklists: () => Promise<{ synced: number; failed: number }>;
  pendingSyncCount: number;
  isSyncing: boolean;
  isOnline: boolean;
}

// Um checklist só recebe um id de verdade (uuid) depois de confirmado salvo
// no Supabase - enquanto o id local (gerado no aparelho, tipo
// "checklist_<timestamp>") continuar, é sinal de que esse checklist ainda
// não foi sincronizado.
const isPendingSync = (record: CompletedChecklistRecord) => !UUID_REGEX.test(record.id);

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

const STORAGE_KEY = 'completed_checklists';
// SecureStore só aceita chaves alfanuméricas + "." "-" "_" (sem "@"), por isso
// não pode ser "@device_id" — com a chave inválida, getItemAsync/setItemAsync
// sempre lançavam erro e a lógica sempre caía (silenciosamente) no fallback
// de AsyncStorage abaixo.
const DEVICE_ID_KEY = 'device_id';

/**
 * Gerar ou carregar ID único do dispositivo
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      console.log('[Reports] Novo Device ID criado:', deviceId);
    }
    return deviceId;
  } catch (error) {
    console.warn('[Reports] Erro ao usar SecureStore, usando AsyncStorage:', error);
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }
}

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [completedChecklists, setCompletedChecklists] = useState<CompletedChecklistRecord[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [deviceId, setDeviceId] = useState<string>('');

  // Inicializar Device ID
  useEffect(() => {
    const initDeviceId = async () => {
      const id = await getOrCreateDeviceId();
      setDeviceId(id);
    };
    initDeviceId();
  }, []);

  // Monitorar conexão
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable === true;
      setIsOnline(online);
      console.log('[Reports] Conexão:', online ? 'Online' : 'Offline');
    });

    return () => unsubscribe();
  }, []);

  // Carregar dados ao inicializar
  useEffect(() => {
    loadCompletedChecklists();
  }, [refreshTrigger, deviceId]);

  const loadCompletedChecklists = async () => {
    if (!deviceId) return;

    try {
      console.log('[Reports] Carregando checklists...');
      
      // 1. Carregar dados locais PRIMEIRO (rápido)
      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      const localChecklists = localData ? JSON.parse(localData) : [];
      setCompletedChecklists(localChecklists);
      
      // 2. Se online, sincronizar com Supabase
      if (isOnline) {
        setIsSyncing(true);
        try {
          console.log('[Reports] Sincronizando com Supabase...');
          
          // Verificar conexão com Supabase
          const hasConnection = await SupabaseSync.checkSupabaseConnection();
          if (!hasConnection) {
            console.warn('[Reports] Sem conexão com Supabase');
            setIsSyncing(false);
            return;
          }
          
          // Carregar checklists do Supabase
          const supabaseChecklists = await SupabaseSync.loadChecklistsFromSupabase();
          console.log('[Reports] ✓ Carregados', supabaseChecklists.length, 'checklists do Supabase');
          
          // 3. Mesclar: Supabase tem prioridade (mais recente)
          const merged = [...localChecklists];
          for (const supabaseChecklist of supabaseChecklists) {
            const index = merged.findIndex(c => c.id === supabaseChecklist.id);
            if (index >= 0) {
              merged[index] = supabaseChecklist; // Atualizar com versão do Supabase
            } else {
              merged.push(supabaseChecklist); // Adicionar novo
            }
          }
          
          setCompletedChecklists(merged);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          console.log('[Reports] ✓ Sincronização com Supabase concluída');

          // Aproveita e já tenta mandar pro servidor qualquer checklist
          // pendente (feito offline, nunca confirmado sincronizado).
          await syncPendingChecklists(merged);
        } catch (syncError) {
          console.warn('[Reports] Erro ao sincronizar com Supabase:', syncError);
          // Continuar com dados locais - não é erro fatal
        } finally {
          setIsSyncing(false);
        }
      } else {
        console.log('[Reports] Offline - usando dados locais apenas');
      }
    } catch (error) {
      console.error('Erro ao carregar checklists:', error);
      setIsSyncing(false);
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
      
      // Se online, sincronizar com Supabase
      if (isOnline && deviceId) {
        try {
          console.log('[Reports] Sincronizando novo checklist com Supabase...');
          const saved = await SupabaseSync.saveChecklistToSupabase(record, deviceId);
          console.log('[Reports] ✓ Checklist sincronizado com Supabase');

          // O id local (gerado no aparelho) é diferente do id real da linha
          // no Supabase (gerado lá) - corrige o id local pro id real, senão
          // ações futuras nesse checklist (como excluir) não acham a linha.
          if (saved?.id && saved.id !== record.id) {
            setCompletedChecklists((prev) => {
              const fixed = prev.map((c) => (c.id === record.id ? { ...c, id: saved.id } : c));
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
              return fixed;
            });
          }
        } catch (error) {
          console.warn('[Reports] Erro ao sincronizar com Supabase (será tentado depois):', error);
          // Continuar mesmo se falhar - dados estão locais
        }
      }
    } catch (error) {
      console.error('Erro ao salvar checklist completado:', error);
    }
  };

  const deleteCompletedChecklists = async (ids: string[]) => {
    // Não bloqueamos por causa do "isOnline" (NetInfo) aqui - no web esse
    // estado já se mostrou não confiável (fica "Offline" às vezes mesmo com
    // internet normal). É melhor sempre tentar a exclusão de verdade no
    // Supabase e deixar a falha real de rede (se houver) ser o que decide.
    const idsDeleted = new Set<string>();
    let failed = 0;

    for (const id of ids) {
      const record = completedChecklists.find((c) => c.id === id);
      if (!record) {
        failed++;
        continue;
      }
      try {
        await SupabaseSync.deleteChecklistFromSupabase(record);
        idsDeleted.add(id);
      } catch (error) {
        console.warn('[Reports] Erro ao excluir checklist no Supabase:', id, error);
        failed++;
      }
    }

    if (idsDeleted.size > 0) {
      const updated = completedChecklists.filter((c) => !idsDeleted.has(c.id));
      setCompletedChecklists(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    return { deleted: idsDeleted.size, failed };
  };

  // Reenvia pro Supabase todo checklist que ainda não foi confirmado
  // sincronizado (id local, não-uuid) - é isso que garante que um checklist
  // feito sem internet realmente chega no banco de dados assim que a
  // conexão voltar, em vez de ficar preso só no aparelho pra sempre.
  const syncPendingChecklists = async (baseRecords?: CompletedChecklistRecord[]) => {
    if (!deviceId) return { synced: 0, failed: 0 };

    const atualInicial = baseRecords ?? completedChecklists;
    const pendentes = atualInicial.filter(isPendingSync);
    if (pendentes.length === 0) {
      return { synced: 0, failed: 0 };
    }

    console.log('[Reports] Sincronizando', pendentes.length, 'checklist(s) pendente(s)...');
    setIsSyncing(true);

    let synced = 0;
    let failed = 0;
    let atual = atualInicial;

    try {
      for (const record of pendentes) {
        try {
          const saved = await SupabaseSync.saveChecklistToSupabase(record, deviceId);
          if (saved?.id) {
            atual = atual.map((c) => (c.id === record.id ? { ...c, id: saved.id } : c));
          }
          synced++;
        } catch (error) {
          console.warn('[Reports] Falha ao sincronizar checklist pendente:', record.id, error);
          failed++;
        }
      }

      if (synced > 0) {
        setCompletedChecklists(atual);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(atual));
      }

      console.log('[Reports] Sincronização de pendentes concluída:', { synced, failed });
      return { synced, failed };
    } finally {
      setIsSyncing(false);
    }
  };

  // Tenta sincronizar pendentes sempre que a conexão volta - sem isso, um
  // checklist feito offline só sincronizaria se o usuário lembrasse de
  // tocar em "Sincronizar Agora".
  const wasOnlineRef = React.useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnlineRef.current) {
      syncPendingChecklists();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  const pendingSyncCount = completedChecklists.filter(isPendingSync).length;

  const value: ReportsContextType = {
    completedChecklists,
    addCompletedChecklist,
    deleteCompletedChecklists,
    loadCompletedChecklists,
    syncPendingChecklists,
    pendingSyncCount,
    isSyncing,
    isOnline,
  };

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports deve ser usado dentro de ReportsProvider');
  }
  return context;
}
