import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedChecklistRecord } from './reports-types';
import * as SupabaseSync from './supabase-sync';
import { UUID_REGEX } from './supabase-sync';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { comTentativas } from './retry';
import { trpcVanilla } from './trpc-vanilla';
import type { inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers';

type GerarPdfInput = inferRouterInputs<AppRouter>['checklist']['generateAndUploadPDF'];

interface PendingPdfItem {
  localId: string;
  input: GerarPdfInput;
}

interface ReportsContextType {
  completedChecklists: CompletedChecklistRecord[];
  addCompletedChecklist: (record: CompletedChecklistRecord) => Promise<void>;
  addCompletedChecklistLocalOnly: (record: CompletedChecklistRecord) => Promise<void>;
  confirmChecklistPdf: (
    localId: string,
    result: { id: string; pdfUrl: string }
  ) => Promise<void>;
  queuePdfGeneration: (localId: string, input: GerarPdfInput) => Promise<void>;
  retryPendingPdfGenerations: () => Promise<{ synced: number; failed: number }>;
  pendingPdfCount: number;
  deleteCompletedChecklists: (
    ids: string[]
  ) => Promise<{ deleted: number; failed: number; lastError?: string }>;
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

// Erros do Supabase costumam ser objetos comuns (não instâncias de Error de
// verdade), então "error instanceof Error" falha e String(error) só dá
// "[object Object]" - extrai o campo .message manualmente nesse caso.
function extrairMensagemDeErro(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

const STORAGE_KEY = 'completed_checklists';
const PENDING_PDF_QUEUE_KEY = 'pending_pdf_queue';
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
  const [pendingPdfQueue, setPendingPdfQueue] = useState<PendingPdfItem[]>([]);
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

  // Carregar fila de PDFs pendentes (checklists finalizados offline, cuja
  // geração de PDF ainda não foi confirmada com o servidor)
  useEffect(() => {
    AsyncStorage.getItem(PENDING_PDF_QUEUE_KEY).then((data) => {
      if (data) setPendingPdfQueue(JSON.parse(data));
    });
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
      
      // 2. Buscar do Supabase - sempre tenta, independente do "isOnline"
      // (NetInfo): esse estado já se mostrou não confiável no web (fica
      // "Offline" às vezes com internet normal), e usar ele aqui pra pular
      // a busca já causou checklists "sumindo" da tela por engano num
      // navegador só porque o NetInfo achou (errado) que estava offline.
      // É melhor sempre tentar de verdade e deixar uma falha real de rede
      // (já tratada abaixo) ser o que decide, não uma suposição.
      setIsSyncing(true);
      try {
        console.log('[Reports] Sincronizando com Supabase...');

        // Carregar checklists do Supabase
        const supabaseChecklists = await comTentativas(() => SupabaseSync.loadChecklistsFromSupabase());
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
          const saved = await comTentativas(() => SupabaseSync.saveChecklistToSupabase(record, deviceId));
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

  // Salva só localmente, sem tentar inserir no Supabase pelo caminho normal
  // - usado na finalização do checklist, onde quem grava a linha de verdade
  // no Supabase é o próprio servidor (junto com a geração do PDF), pra não
  // criar duas linhas duplicadas para o mesmo checklist.
  const addCompletedChecklistLocalOnly = async (record: CompletedChecklistRecord) => {
    const filtered = completedChecklists.filter((c) => c.id !== record.id);
    const updated = [...filtered, record];
    setCompletedChecklists(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Depois que o servidor confirma que gerou o PDF e salvou a linha de
  // verdade no Supabase, atualiza o registro local (que até então só tinha
  // o id provisório do aparelho e nenhum PDF) com os dados reais.
  const confirmChecklistPdf = async (
    localId: string,
    result: { id: string; pdfUrl: string }
  ) => {
    setCompletedChecklists((prev) => {
      const fixed = prev.map((c) =>
        c.id === localId ? { ...c, id: result.id, pdfFileName: result.pdfUrl } : c
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
      return fixed;
    });
  };

  const persistPendingPdfQueue = async (queue: PendingPdfItem[]) => {
    setPendingPdfQueue(queue);
    await AsyncStorage.setItem(PENDING_PDF_QUEUE_KEY, JSON.stringify(queue));
  };

  // Guarda os dados completos do checklist (todas as etapas, assinaturas,
  // etc.) pra poder gerar o PDF de novo mais tarde, sem precisar que o
  // usuário refaça nada - é isso que garante finalizar um checklist offline
  // sem perder a geração do PDF depois.
  const queuePdfGeneration = async (localId: string, input: GerarPdfInput) => {
    const semDuplicata = pendingPdfQueue.filter((item) => item.localId !== localId);
    await persistPendingPdfQueue([...semDuplicata, { localId, input }]);
  };

  // Tenta gerar de novo o PDF (e salvar no Supabase) de todo checklist que
  // foi finalizado sem internet - roda sozinho quando a conexão volta,
  // igual o syncPendingChecklists faz para os outros checklists.
  const retryPendingPdfGenerations = async () => {
    if (pendingPdfQueue.length === 0) return { synced: 0, failed: 0 };

    console.log('[Reports] Tentando gerar', pendingPdfQueue.length, 'PDF(s) pendente(s)...');
    let synced = 0;
    let failed = 0;
    let filaAtual = pendingPdfQueue;

    for (const item of pendingPdfQueue) {
      try {
        const result = await comTentativas(() =>
          trpcVanilla.checklist.generateAndUploadPDF.mutate(item.input)
        );
        if (!result.success || !result.pdfUrl) {
          throw new Error(result.message || 'Falha ao gerar o PDF no servidor');
        }
        await confirmChecklistPdf(item.localId, { id: result.id ?? item.localId, pdfUrl: result.pdfUrl });
        filaAtual = filaAtual.filter((f) => f.localId !== item.localId);
        synced++;
      } catch (error) {
        console.warn('[Reports] Falha ao gerar PDF pendente:', item.localId, error);
        failed++;
      }
    }

    await persistPendingPdfQueue(filaAtual);
    console.log('[Reports] Geração de PDFs pendentes concluída:', { synced, failed });
    return { synced, failed };
  };

  const deleteCompletedChecklists = async (ids: string[]) => {
    // Não bloqueamos por causa do "isOnline" (NetInfo) aqui - no web esse
    // estado já se mostrou não confiável (fica "Offline" às vezes mesmo com
    // internet normal). É melhor sempre tentar a exclusão de verdade no
    // Supabase e deixar a falha real de rede (se houver) ser o que decide.
    const idsDeleted = new Set<string>();
    let failed = 0;
    let lastError: string | undefined;

    for (const id of ids) {
      const record = completedChecklists.find((c) => c.id === id);
      if (!record) {
        failed++;
        lastError = 'Checklist não encontrado na lista local.';
        continue;
      }
      try {
        await comTentativas(() => SupabaseSync.deleteChecklistFromSupabase(record));
        idsDeleted.add(id);
      } catch (error) {
        console.warn('[Reports] Erro ao excluir checklist no Supabase:', id, error);
        failed++;
        lastError = extrairMensagemDeErro(error);
      }
    }

    if (idsDeleted.size > 0) {
      const updated = completedChecklists.filter((c) => !idsDeleted.has(c.id));
      setCompletedChecklists(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Não deixa uma entrada zumbi na fila de PDF pendente tentando gerar
      // PDF pra um checklist que acabou de ser excluído.
      if (pendingPdfQueue.some((item) => idsDeleted.has(item.localId))) {
        await persistPendingPdfQueue(
          pendingPdfQueue.filter((item) => !idsDeleted.has(item.localId))
        );
      }
    }

    return { deleted: idsDeleted.size, failed, lastError };
  };

  // Reenvia pro Supabase todo checklist que ainda não foi confirmado
  // sincronizado (id local, não-uuid) - é isso que garante que um checklist
  // feito sem internet realmente chega no banco de dados assim que a
  // conexão voltar, em vez de ficar preso só no aparelho pra sempre.
  const syncPendingChecklists = async (baseRecords?: CompletedChecklistRecord[]) => {
    if (!deviceId) return { synced: 0, failed: 0 };

    const idsNaFilaDePdf = new Set(pendingPdfQueue.map((item) => item.localId));
    const atualInicial = baseRecords ?? completedChecklists;
    // Checklists na fila de geração de PDF são tratados por
    // retryPendingPdfGenerations (que faz o insert completo, com PDF, junto
    // com o servidor) - não pelo insert simples daqui, senão duplicaria.
    const pendentes = atualInicial.filter((c) => isPendingSync(c) && !idsNaFilaDePdf.has(c.id));
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
          const saved = await comTentativas(() => SupabaseSync.saveChecklistToSupabase(record, deviceId));
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
      retryPendingPdfGenerations();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  // O evento de reconexão acima depende do NetInfo, que já se mostrou não
  // confiável no web (às vezes nem chega a disparar a transição
  // offline->online de verdade, mesmo com a internet de volta). Por
  // segurança, tenta de novo sozinho a cada 20s enquanto houver checklist ou
  // PDF pendente, pra garantir que os dados chegam no servidor mesmo que o
  // evento de reconexão nunca dispare - sem depender do usuário lembrar de
  // tocar em "Sincronizar Agora" ou recarregar a página.
  useEffect(() => {
    const temPendente = pendingPdfQueue.length > 0 || completedChecklists.some(isPendingSync);
    if (!temPendente) return;
    const interval = setInterval(() => {
      syncPendingChecklists();
      retryPendingPdfGenerations();
    }, 20000);
    return () => clearInterval(interval);
  }, [pendingPdfQueue.length, completedChecklists]);

  const idsNaFilaDePdf = new Set(pendingPdfQueue.map((item) => item.localId));
  const pendingSyncCount = completedChecklists.filter(
    (c) => isPendingSync(c) && !idsNaFilaDePdf.has(c.id)
  ).length;
  const pendingPdfCount = pendingPdfQueue.length;

  const value: ReportsContextType = {
    completedChecklists,
    addCompletedChecklist,
    addCompletedChecklistLocalOnly,
    confirmChecklistPdf,
    queuePdfGeneration,
    retryPendingPdfGenerations,
    pendingPdfCount,
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
