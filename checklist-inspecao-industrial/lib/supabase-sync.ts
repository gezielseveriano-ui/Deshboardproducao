import { supabase, isSupabaseConfigured } from "./supabase-client";
import { CompletedChecklistRecord } from "./reports-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const SYNC_QUEUE_KEY = "@checklist_supabase_sync_queue";
const LAST_SYNC_TIME_KEY = "@checklist_supabase_last_sync";

/**
 * Fazer upload do PDF para o servidor (fallback)
 */
export async function uploadPDFToSupabase(
  pdfPath: string,
  pdfFileName: string
): Promise<string | null> {
  try {
    console.log("[Supabase] Tentando fazer upload do PDF:", pdfFileName);
    
    // Por enquanto, retornar null para usar fallback do servidor
    // O upload será feito pelo servidor quando sincronizar
    return null;
  } catch (error) {
    console.error("[Supabase] Erro ao fazer upload de PDF:", error);
    return null;
  }
}

/**
 * Salvar checklist no Supabase
 */
export async function saveChecklistToSupabase(
  record: CompletedChecklistRecord,
  deviceId: string,
  pdfUrl?: string
) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes)");
  }
  try {
    console.log("[Supabase] Salvando checklist:", record.id);

    const data = {
      device_id: deviceId,
      checklist_code: record.checklistCode,
      checklist_name: record.checklistName,
      categoria: record.categoria,
      modelo: record.modelo,
      resultado: record.resultado,
      executante_name: record.executanteName,
      executante_matricula: record.executanteMatricula,
      data_recuperacao: record.dataRecuperacao,
      data_fabricacao: record.dataFabricacao,
      numero_serie: record.numeroSerie,
      numero_op: record.numeroOP,
      pdf_url: pdfUrl || null,
      pdf_file_name: record.pdfFileName,
      resultado_detalhado: record,
      sync_status: "synced",
      synced_at: new Date().toISOString(),
      timestamp: record.timestamp,
    };

    const { data: result, error } = await supabase
      .from("completed_checklists")
      .insert([data])
      .select();

    if (error) {
      console.error("[Supabase] Erro ao salvar:", error);
      throw error;
    }

    console.log("[Supabase] ✓ Checklist salvo com sucesso:", result?.[0]?.id);
    return result?.[0];
  } catch (error) {
    console.error("[Supabase] Erro ao salvar checklist:", error);
    throw error;
  }
}

/**
 * Carregar todos os checklists do Supabase
 */
export async function loadChecklistsFromSupabase(): Promise<
  CompletedChecklistRecord[]
> {
  if (!isSupabaseConfigured) return [];
  try {
    console.log("[Supabase] Carregando checklists...");

    const { data, error } = await supabase
      .from("completed_checklists")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Erro ao carregar:", error);
      throw error;
    }

    console.log("[Supabase] ✓ Carregados", data?.length || 0, "checklists");

    return (data || []).map((row: any) => ({
      id: row.id,
      checklistCode: row.checklist_code,
      checklistName: row.checklist_name,
      categoria: row.categoria,
      modelo: row.modelo,
      resultado: row.resultado,
      executanteName: row.executante_name,
      executanteMatricula: row.executante_matricula,
      dataRecuperacao: row.data_recuperacao,
      dataFabricacao: row.data_fabricacao,
      numeroSerie: row.numero_serie,
      numeroOP: row.numero_op,
      pdfFileName: row.pdf_url || row.pdf_file_name,
      timestamp: row.timestamp,
    }));
  } catch (error) {
    console.error("[Supabase] Erro ao carregar checklists:", error);
    throw error;
  }
}

/**
 * Excluir um checklist do Supabase (linha da tabela + PDF no Storage,
 * se o pdf_file_name apontar pro bucket checklist-pdfs).
 */
export async function deleteChecklistFromSupabase(
  id: string,
  pdfFileName?: string | null
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes)");
  }
  try {
    console.log("[Supabase] Excluindo checklist:", id);

    if (pdfFileName) {
      const match = pdfFileName.match(/\/checklist-pdfs\/(.+)$/);
      if (match) {
        // Best-effort: excluir o PDF nunca deve impedir a exclusão da
        // linha, que é a ação essencial.
        try {
          const { error: storageError } = await supabase.storage
            .from("checklist-pdfs")
            .remove([match[1]]);
          if (storageError) {
            console.warn("[Supabase] Não foi possível excluir o PDF do Storage:", storageError);
          }
        } catch (storageError) {
          console.warn("[Supabase] Não foi possível excluir o PDF do Storage:", storageError);
        }
      }
    }

    const { error } = await supabase.from("completed_checklists").delete().eq("id", id);
    if (error) {
      console.error("[Supabase] Erro ao excluir:", error);
      throw error;
    }

    console.log("[Supabase] ✓ Checklist excluído com sucesso:", id);
  } catch (error) {
    console.error("[Supabase] Erro ao excluir checklist:", error);
    throw error;
  }
}

/**
 * Carregar checklists de um dispositivo específico
 */
export async function loadChecklistsByDevice(
  deviceId: string
): Promise<CompletedChecklistRecord[]> {
  try {
    console.log("[Supabase] Carregando checklists do dispositivo:", deviceId);

    const { data, error } = await supabase
      .from("completed_checklists")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Erro ao carregar:", error);
      throw error;
    }

    console.log(
      "[Supabase] ✓ Carregados",
      data?.length || 0,
      "checklists do dispositivo"
    );

    return (data || []).map((row: any) => ({
      id: row.id,
      checklistCode: row.checklist_code,
      checklistName: row.checklist_name,
      categoria: row.categoria,
      modelo: row.modelo,
      resultado: row.resultado,
      executanteName: row.executante_name,
      executanteMatricula: row.executante_matricula,
      dataRecuperacao: row.data_recuperacao,
      dataFabricacao: row.data_fabricacao,
      numeroSerie: row.numero_serie,
      numeroOP: row.numero_op,
      pdfFileName: row.pdf_url || row.pdf_file_name,
      timestamp: row.timestamp,
    }));
  } catch (error) {
    console.error("[Supabase] Erro ao carregar checklists do dispositivo:", error);
    throw error;
  }
}

/**
 * Carregar checklists por categoria
 */
export async function loadChecklistsByCategory(
  categoria: string
): Promise<CompletedChecklistRecord[]> {
  try {
    console.log("[Supabase] Carregando checklists da categoria:", categoria);

    const { data, error } = await supabase
      .from("completed_checklists")
      .select("*")
      .eq("categoria", categoria)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] Erro ao carregar:", error);
      throw error;
    }

    console.log(
      "[Supabase] ✓ Carregados",
      data?.length || 0,
      "checklists da categoria"
    );

    return (data || []).map((row: any) => ({
      id: row.id,
      checklistCode: row.checklist_code,
      checklistName: row.checklist_name,
      categoria: row.categoria,
      modelo: row.modelo,
      resultado: row.resultado,
      executanteName: row.executante_name,
      executanteMatricula: row.executante_matricula,
      dataRecuperacao: row.data_recuperacao,
      dataFabricacao: row.data_fabricacao,
      numeroSerie: row.numero_serie,
      numeroOP: row.numero_op,
      pdfFileName: row.pdf_url || row.pdf_file_name,
      timestamp: row.timestamp,
    }));
  } catch (error) {
    console.error("[Supabase] Erro ao carregar checklists da categoria:", error);
    throw error;
  }
}

/**
 * Verificar conexão com Supabase
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("completed_checklists")
      .select("count")
      .limit(1);

    if (error) {
      console.error("[Supabase] Erro na conexão:", error);
      return false;
    }

    console.log("[Supabase] ✓ Conexão OK");
    return true;
  } catch (error) {
    console.error("[Supabase] Erro ao verificar conexão:", error);
    return false;
  }
}

/**
 * Sincronizar checklists locais com Supabase
 */
export async function syncLocalChecklistsWithSupabase(
  localChecklists: CompletedChecklistRecord[],
  deviceId: string
): Promise<{ synced: number; failed: number }> {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log("[Supabase] Sem conexão, sincronização adiada");
      return { synced: 0, failed: 0 };
    }

    console.log(
      "[Supabase] Sincronizando",
      localChecklists.length,
      "checklists locais..."
    );

    let synced = 0;
    let failed = 0;

    for (const checklist of localChecklists) {
      try {
        await saveChecklistToSupabase(checklist, deviceId);
        synced++;
      } catch (error) {
        console.error("[Supabase] Erro ao sincronizar checklist:", error);
        failed++;
      }
    }

    console.log(
      "[Supabase] Sincronização concluída:",
      synced,
      "sucesso,",
      failed,
      "falhas"
    );

    await AsyncStorage.setItem(
      LAST_SYNC_TIME_KEY,
      new Date().toISOString()
    );

    return { synced, failed };
  } catch (error) {
    console.error("[Supabase] Erro ao sincronizar:", error);
    return { synced: 0, failed: localChecklists.length };
  }
}

/**
 * Obter último tempo de sincronização
 */
export async function getLastSyncTime(): Promise<Date | null> {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
    return lastSync ? new Date(lastSync) : null;
  } catch (error) {
    console.error("[Supabase] Erro ao obter último sync:", error);
    return null;
  }
}
