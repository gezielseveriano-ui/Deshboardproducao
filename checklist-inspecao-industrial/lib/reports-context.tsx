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

// Registro mínimo guardado quando um checklist é excluído, até a exclusão
// no Supabase ser confirmada de verdade.
type PendingDeleteItem = Pick<
  CompletedChecklistRecord,
  'id' | 'checklistCode' | 'timestamp' | 'pdfFileName' | 'clientChecklistId'
>;

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
  retryPendingDeletes: () => Promise<{ deleted: number; failed: number }>;
  pendingDeleteCount: number;
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
const PENDING_PDF_QUEUE_KEY = 'pending_pdf_queue';
const PENDING_DELETE_QUEUE_KEY = 'pending_delete_queue';
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
  const [pendingDeleteQueue, setPendingDeleteQueue] = useState<PendingDeleteItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [deviceId, setDeviceId] = useState<string>('');

  // Sempre reflete o completedChecklists mais atual, mesmo dentro de uma
  // função assíncrona de vida longa (como retryPendingPdfGenerations, que
  // fica esperando uma resposta de rede) - usado pra checar se um checklist
  // ainda existe localmente sem depender de um closure que pode estar
  // desatualizado.
  const completedChecklistsRef = React.useRef<CompletedChecklistRecord[]>([]);
  useEffect(() => {
    completedChecklistsRef.current = completedChecklists;
  }, [completedChecklists]);

  // Mesma ideia acima, para a fila de exclusões pendentes - usada pra evitar
  // que um checklist recém-excluído "ressuscite" na tela se uma linha dele
  // ainda existir no Supabase no momento em que essa busca acontecer.
  const pendingDeleteQueueRef = React.useRef<PendingDeleteItem[]>([]);
  useEffect(() => {
    pendingDeleteQueueRef.current = pendingDeleteQueue;
  }, [pendingDeleteQueue]);

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

  // Carregar fila de exclusões pendentes (checklists excluídos localmente,
  // cuja exclusão no Supabase ainda não foi confirmada)
  useEffect(() => {
    AsyncStorage.getItem(PENDING_DELETE_QUEUE_KEY).then((data) => {
      if (data) setPendingDeleteQueue(JSON.parse(data));
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
      completedChecklistsRef.current = localChecklists;

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

        // 3. Mesclar: Supabase tem prioridade (mais recente). Usa o estado
        // mais atual (via ref), não o snapshot capturado no passo 1 - essa
        // busca no Supabase pode levar alguns segundos (com retry), e nesse
        // meio tempo outra coisa (como a confirmação de um PDF gerado em
        // segundo plano) pode ter mudado o registro local; mesclar contra um
        // snapshot antigo sobrescreveria essa mudança mais recente.
        const merged = [...completedChecklistsRef.current];
        for (const supabaseChecklist of supabaseChecklists) {
          // Um checklist que acabou de ser excluído (fila de exclusão
          // pendente) não pode "ressuscitar" só porque a linha dele ainda
          // não terminou de ser removida do Supabase - ignora completamente
          // enquanto ele estiver nessa fila.
          const foiExcluido = pendingDeleteQueueRef.current.some(
            (item) =>
              item.id === supabaseChecklist.id ||
              (!!supabaseChecklist.clientChecklistId && item.clientChecklistId === supabaseChecklist.clientChecklistId)
          );
          if (foiExcluido) continue;

          // Compara tanto pelo id quanto pelo client_checklist_id: um
          // checklist feito offline começa com o id provisório do aparelho
          // (igual ao client_checklist_id) e só é trocado pelo id real do
          // Supabase quando o PDF é confirmado - se essa confirmação
          // acontecer bem nessa janela (enquanto essa busca ainda estava em
          // andamento), o registro local ainda tem o id antigo. Sem esse
          // segundo critério, esse checklist não seria reconhecido como o
          // mesmo e viraria um card duplicado no Histórico.
          const index = merged.findIndex(
            (c) =>
              c.id === supabaseChecklist.id ||
              (!!supabaseChecklist.clientChecklistId && c.id === supabaseChecklist.clientChecklistId)
          );
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
        // Itens enfileirados antes da chave de idempotência existir ficaram
        // gravados no aparelho sem clientChecklistId (o payload já estava
        // congelado no armazenamento local antes dessa correção) - completa
        // aqui na hora de enviar, senão esse checklist específico nunca
        // ganha a proteção contra duplicidade, não importa quantas vezes o
        // código do servidor seja corrigido.
        const inputComIdempotencia = {
          ...item.input,
          clientChecklistId: item.input.clientChecklistId ?? item.localId,
        };
        const result = await comTentativas(() =>
          trpcVanilla.checklist.generateAndUploadPDF.mutate(inputComIdempotencia)
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

  const persistPendingDeleteQueue = async (queue: PendingDeleteItem[]) => {
    setPendingDeleteQueue(queue);
    pendingDeleteQueueRef.current = queue;
    await AsyncStorage.setItem(PENDING_DELETE_QUEUE_KEY, JSON.stringify(queue));
  };

  // Exclui da lista local IMEDIATAMENTE (antes de qualquer chamada de rede) -
  // se isso dependesse da exclusão no Supabase terminar primeiro (como era
  // antes), fechar o app/aba logo depois de confirmar a exclusão podia
  // interromper a chamada de rede no meio e o checklist "reaparecia" depois,
  // porque a remoção local nunca tinha chegado a acontecer de fato. A
  // exclusão real no servidor agora é tentada em seguida e, se falhar, fica
  // guardada numa fila (igual a fila de PDF pendente) pra ser tentada de novo
  // sozinha depois - sem nunca voltar a aparecer na tela nesse meio tempo,
  // graças ao "não ressuscitar" no merge do loadCompletedChecklists.
  const deleteCompletedChecklists = async (ids: string[]) => {
    const idsSet = new Set(ids);
    const registrosParaExcluir = completedChecklists.filter((c) => idsSet.has(c.id));
    const idsNaoEncontrados = ids.length - registrosParaExcluir.length;

    if (registrosParaExcluir.length > 0) {
      const updated = completedChecklists.filter((c) => !idsSet.has(c.id));
      setCompletedChecklists(updated);
      completedChecklistsRef.current = updated;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Não deixa uma entrada zumbi na fila de PDF pendente tentando gerar
      // PDF pra um checklist que acabou de ser excluído.
      if (pendingPdfQueue.some((item) => idsSet.has(item.localId))) {
        await persistPendingPdfQueue(pendingPdfQueue.filter((item) => !idsSet.has(item.localId)));
      }

      const semDuplicata = pendingDeleteQueue.filter((item) => !idsSet.has(item.id));
      await persistPendingDeleteQueue([
        ...semDuplicata,
        ...registrosParaExcluir.map((record) => ({
          id: record.id,
          checklistCode: record.checklistCode,
          timestamp: record.timestamp,
          pdfFileName: record.pdfFileName,
          clientChecklistId: record.clientChecklistId,
        })),
      ]);
    }

    const { deleted, failed } = await retryPendingDeletes();
    return {
      deleted,
      failed: failed + idsNaoEncontrados,
      lastError: idsNaoEncontrados > 0 ? 'Checklist não encontrado na lista local.' : undefined,
    };
  };

  // Tenta de novo excluir no Supabase todo checklist já removido daqui -
  // roda sozinho quando a conexão volta, igual os outros "pendentes".
  const retryPendingDeletes = async () => {
    if (pendingDeleteQueue.length === 0) return { deleted: 0, failed: 0 };

    let deleted = 0;
    let failed = 0;
    let filaAtual = pendingDeleteQueue;

    for (const item of pendingDeleteQueue) {
      try {
        await comTentativas(() => SupabaseSync.deleteChecklistFromSupabase(item));
        filaAtual = filaAtual.filter((f) => f.id !== item.id);
        deleted++;
      } catch (error) {
        console.warn('[Reports] Erro ao excluir checklist no Supabase:', item.id, error);
        failed++;
      }
    }

    await persistPendingDeleteQueue(filaAtual);
    return { deleted, failed };
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
      retryPendingDeletes();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  // O evento de reconexão acima depende do NetInfo, que já se mostrou não
  // confiável no web (às vezes nem chega a disparar a transição
  // offline->online de verdade, mesmo com a internet de volta). Por
  // segurança, tenta de novo sozinho a cada 20s enquanto houver checklist,
  // PDF ou exclusão pendente, pra garantir que os dados chegam no servidor
  // mesmo que o evento de reconexão nunca dispare - sem depender do usuário
  // lembrar de tocar em "Sincronizar Agora" ou recarregar a página.
  useEffect(() => {
    const temPendente =
      pendingPdfQueue.length > 0 || pendingDeleteQueue.length > 0 || completedChecklists.some(isPendingSync);
    if (!temPendente) return;
    const interval = setInterval(() => {
      syncPendingChecklists();
      retryPendingPdfGenerations();
      retryPendingDeletes();
    }, 20000);
    return () => clearInterval(interval);
  }, [pendingPdfQueue.length, pendingDeleteQueue.length, completedChecklists]);

  const idsNaFilaDePdf = new Set(pendingPdfQueue.map((item) => item.localId));
  const pendingSyncCount = completedChecklists.filter(
    (c) => isPendingSync(c) && !idsNaFilaDePdf.has(c.id)
  ).length;
  const pendingPdfCount = pendingPdfQueue.length;
  const pendingDeleteCount = pendingDeleteQueue.length;

  const value: ReportsContextType = {
    completedChecklists,
    addCompletedChecklist,
    addCompletedChecklistLocalOnly,
    confirmChecklistPdf,
    queuePdfGeneration,
    retryPendingPdfGenerations,
    pendingPdfCount,
    deleteCompletedChecklists,
    retryPendingDeletes,
    pendingDeleteCount,
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
