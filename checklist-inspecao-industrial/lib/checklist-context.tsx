import React, { createContext, useContext, useReducer, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Checklist, DadosIniciais, VerificacoesIniciais, Etapa, Assinaturas, PerguntasFinais, InspetorPM } from "./types";
import { ChecklistType, getChecklistConfig } from "./checklist-configs";

interface ChecklistContextType {
  checklist: Checklist | null;
  updateDadosIniciais: (dados: DadosIniciais) => void;
  updateModeloSelecionado: (modelo: string) => void;
  updateVerificacoesIniciais: (verificacoes: VerificacoesIniciais) => void;
  updateInspetorPM: (inspetorPM: InspetorPM) => void;
  updateEtapa: (numero: number, resultado: string, medidas: Record<string, string>) => void;
  updatePerguntasFinais: (perguntas: PerguntasFinais) => void;
  updateAssinaturas: (assinaturas: Assinaturas) => void;
  saveChecklist: () => Promise<void>;
  loadChecklist: (id: string) => Promise<void>;
  createNewChecklist: (checklistType: ChecklistType) => void;
  isComplete: () => boolean;
}

const ChecklistContext = createContext<ChecklistContextType | undefined>(undefined);

type ChecklistAction =
  | { type: "SET_CHECKLIST"; payload: Checklist }
  | { type: "UPDATE_DADOS_INICIAIS"; payload: DadosIniciais }
  | { type: "UPDATE_MODELO"; payload: string }
  | { type: "UPDATE_VERIFICACOES"; payload: VerificacoesIniciais }
  | { type: "UPDATE_INSPETOR_PM"; payload: InspetorPM }
  | { type: "UPDATE_ETAPA"; payload: { numero: number; resultado: string; medidas: Record<string, string> } }
  | { type: "UPDATE_PERGUNTAS_FINAIS"; payload: PerguntasFinais }
  | { type: "UPDATE_ASSINATURAS"; payload: Assinaturas };

function createEmptyChecklist(checklistType: ChecklistType): Checklist {
  const config = getChecklistConfig(checklistType);

  const etapas: Etapa[] = config.etapas.map((etapaConfig) => ({
    numero: etapaConfig.numero,
    titulo: etapaConfig.subsistema,
    descricao: etapaConfig.atividade,
    resultado: null,
    medidas: etapaConfig.medidas.map((med, idx) => ({
      id: `etapa_${etapaConfig.numero}_medida_${idx}`,
      label: med.label,
      unidade: med.unidade,
      valor: null,
      naoAplicavel: false,
    })),
  }));

  return ({
    id: `checklist_${Date.now()}`,
    timestamp: Date.now(),
    checklistType,
    checklistConfig: config,
    dadosIniciais: {
      data: new Date().toISOString().split("T")[0],
      dataFabricacao: "",
      numeroOP: "",
      numeroSerie: "",
      dataRecuperacao: "",
      numeroRelatorioPM: "",
    },
    modeloSelecionado: null,
    verificacoesIniciais: {
      trinca: null,
      empenos: null,
    },
    inspetorPM: {
      nome: "",
      matricula: "",
      numeroRelatorio: "",
    },
    etapas,
    perguntasFinais: {
      substituicaoChapaColuna: null,
      substituicaoChapaGuia: null,
    },
    assinaturas: {
      executante: null,
      liderMRS: null,
      inspectorTecnico: null,
    },
    status: "INCOMPLETO",
  }) as any as Checklist;
}

function checklistReducer(state: Checklist | null, action: ChecklistAction): Checklist | null {
  // SET_CHECKLIST deve funcionar mesmo quando state é null (criação de novo checklist)
  if (action.type === "SET_CHECKLIST") {
    return action.payload;
  }

  if (!state) return null;

  switch (action.type) {

    case "UPDATE_DADOS_INICIAIS":
      return {
        ...state,
        dadosIniciais: action.payload,
      };

    case "UPDATE_MODELO":
      return {
        ...(state as any),
        modeloSelecionado: action.payload,
      } as Checklist;

    case "UPDATE_VERIFICACOES":
      return {
        ...state,
        verificacoesIniciais: action.payload,
      };

    case "UPDATE_INSPETOR_PM":
      return {
        ...state,
        inspetorPM: action.payload,
      };

    case "UPDATE_ETAPA": {
      const { numero, resultado, medidas } = action.payload;
      const updatedEtapas = state.etapas.map((etapa) => {
        if (etapa.numero === numero) {
          return {
            ...etapa,
            resultado: resultado as any,
            medidas: etapa.medidas.map((med) => ({
              ...med,
              valor: medidas[med.id] || null,
            })),
          };
        }
        return etapa;
      });

      return {
        ...state,
        etapas: updatedEtapas,
      };
    }

    case "UPDATE_PERGUNTAS_FINAIS":
      return {
        ...state,
        perguntasFinais: action.payload,
      };

    case "UPDATE_ASSINATURAS":
      return {
        ...state,
        assinaturas: action.payload,
      };

    default:
      return state;
  }
}

export function ChecklistProvider({ children }: { children: React.ReactNode }) {
  const [checklist, dispatch] = useReducer(checklistReducer, null);

  const updateDadosIniciais = (dados: DadosIniciais) => {
    dispatch({ type: "UPDATE_DADOS_INICIAIS", payload: dados });
  };

  const updateModeloSelecionado = (modelo: string) => {
    dispatch({ type: "UPDATE_MODELO", payload: modelo });
  };

  const updateVerificacoesIniciais = (verificacoes: VerificacoesIniciais) => {
    dispatch({ type: "UPDATE_VERIFICACOES", payload: verificacoes });
  };

  const updateInspetorPM = (inspetorPM: InspetorPM) => {
    dispatch({ type: "UPDATE_INSPETOR_PM", payload: inspetorPM });
  };

  const updateEtapa = (numero: number, resultado: string, medidas: Record<string, string>) => {
    dispatch({ type: "UPDATE_ETAPA", payload: { numero, resultado, medidas } });
  };

  const updatePerguntasFinais = (perguntas: PerguntasFinais) => {
    dispatch({ type: "UPDATE_PERGUNTAS_FINAIS", payload: perguntas });
  };

  const updateAssinaturas = (assinaturas: Assinaturas) => {
    console.log('[Checklist] Atualizando assinaturas:', assinaturas);
    dispatch({ type: "UPDATE_ASSINATURAS", payload: assinaturas });
  };

  const saveChecklist = async () => {
    try {
      if (!checklist) return;
      
      console.log('[SaveChecklist] Iniciando salvamento...', {
        tipo: checklist.checklistType,
        codigo: checklist.checklistConfig?.codigo,
        categoria: checklist.checklistConfig?.categoria,
      });
      
      // 1. Salvar localmente (fallback)
      const key = `checklist_${checklist.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(checklist));
      console.log('[SaveChecklist] Salvo localmente com sucesso');
      
      // 2. Tentar sincronizar com backend (se houver internet)
      try {
        const { trpc } = require('@/lib/trpc');
        const user = await trpc.auth.me.query();
        
        if (user?.id) {
          console.log('[SaveChecklist] Preparando dados para sincronização com backend...');
          
          // Preparar dados para salvar no banco
          const checklistData = {
            userId: typeof user.id === 'string' ? parseInt(user.id, 10) : user.id,
            checklistCode: checklist.checklistConfig?.codigo || 'UNKNOWN',
            checklistName: checklist.checklistConfig?.nome || 'Checklist',
            categoria: checklist.checklistConfig?.categoria || 'Geral',
            modelo: checklist.modeloSelecionado || 'Não especificado',
            resultado: 'OK', // Será atualizado após completar
            executanteName: checklist.assinaturas?.executante?.nome || 'Não assinado',
            executanteMatricula: checklist.assinaturas?.executante?.matricula || '0',
            liderName: checklist.assinaturas?.liderMRS?.nome || '',
            liderMatricula: checklist.assinaturas?.liderMRS?.matricula || '0',
            inspectorName: checklist.assinaturas?.inspectorTecnico?.nome || '',
            inspectorMatricula: checklist.assinaturas?.inspectorTecnico?.matricula || '0',
            dataFabricacao: checklist.dadosIniciais?.dataFabricacao || '',
            dataRecuperacao: checklist.dadosIniciais?.dataRecuperacao || new Date().toLocaleDateString('pt-BR'),
            numeroOP: checklist.dadosIniciais?.numeroOP || '',
            numeroSerie: checklist.dadosIniciais?.numeroSerie || '',
            totalEtapas: checklist.etapas?.length || 0,
            etapasOK: checklist.etapas?.filter((e: any) => e.resultado === 'OK').length || 0,
            etapasNaoOK: checklist.etapas?.filter((e: any) => e.resultado === 'NAO_OK').length || 0,
            etapasNaoAplicavel: checklist.etapas?.filter((e: any) => e.resultado === 'NAO_APLICAVEL').length || 0,
            deviceId: 'web', // Será preenchido pelo app
            syncStatus: 'pending' as const,
          };
          
          console.log('[SaveChecklist] Enviando para backend:', checklistData);
          
          // Salvar no banco via tRPC
          const result = await trpc.checklist.saveCompleted.mutate(checklistData);
          console.log('[SaveChecklist] Resposta do backend:', result);
          
          if (result?.success && result?.data?.insertId) {
            console.log('[Sync] Checklist salvo no banco com sucesso:', result.data.insertId);
            // Atualizar status de sincronização
            await trpc.checklist.updateSyncStatus.mutate({
              checklistId: result.data.insertId,
              syncStatus: 'synced',
            });
          }
        }
      } catch (syncError) {
        // Se falhar a sincronização, apenas registra no console
        // O checklist já foi salvo localmente, então não há perda de dados
        console.error('[SaveChecklist] Erro ao sincronizar:', syncError);
        console.warn('[Sync] Falha ao sincronizar com backend (offline?):', syncError);
      }
    } catch (error) {
      console.error("Erro ao salvar checklist:", error);
    }
  };

  const loadChecklist = async (id: string) => {
    try {
      const key = `checklist_${id}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        dispatch({ type: "SET_CHECKLIST", payload: JSON.parse(data) });
      }
    } catch (error) {
      console.error("Erro ao carregar checklist:", error);
    }
  };

  const createNewChecklist = (checklistType: ChecklistType) => {
    dispatch({ type: "SET_CHECKLIST", payload: createEmptyChecklist(checklistType) });
  };

  const isComplete = (): boolean => {
    if (!checklist) return false;

    // Verificar dados iniciais
    const dadosCompletos =
      !!checklist.dadosIniciais.dataFabricacao &&
      !!checklist.dadosIniciais.numeroOP &&
      !!checklist.dadosIniciais.numeroSerie &&
      !!checklist.dadosIniciais.dataRecuperacao &&
      !!checklist.dadosIniciais.numeroRelatorioPM;

    // Verificar modelo selecionado
    const modeloSelecionado = (checklist as any).modeloSelecionado !== null;

    // Verificar verificações iniciais
    const verificacoesCompletas =
      checklist.verificacoesIniciais.trinca !== null && checklist.verificacoesIniciais.empenos !== null;

    // Verificar etapas
    const etapasCompletas = checklist.etapas.every((etapa) => etapa.resultado !== null);

    // Verificar assinaturas
    const assinaturasCompletas =
      checklist.assinaturas.executante !== null &&
      checklist.assinaturas.liderMRS !== null &&
      checklist.assinaturas.inspectorTecnico !== null;

    return dadosCompletos && modeloSelecionado && verificacoesCompletas && etapasCompletas && assinaturasCompletas;
  };

  // Auto-save a cada mudança
  useEffect(() => {
    if (checklist) {
      saveChecklist();
    }
  }, [checklist]);

  return (
    <ChecklistContext.Provider
      value={{
        checklist,
        updateDadosIniciais,
        updateModeloSelecionado,
        updateVerificacoesIniciais,
        updateInspetorPM,
        updateEtapa,
        updatePerguntasFinais,
        updateAssinaturas,
        saveChecklist,
        loadChecklist,
        createNewChecklist,
        isComplete,
      }}
    >
      {children}
    </ChecklistContext.Provider>
  );
}

export function useChecklist() {
  const context = useContext(ChecklistContext);
  if (!context) {
    throw new Error("useChecklist deve ser usado dentro de ChecklistProvider");
  }
  return context;
}
