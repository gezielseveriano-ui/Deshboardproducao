import { Router, Request, Response } from "express";
import { getDb, saveCompletedChecklist } from "../db";

const router = Router();

// Armazenamento em memória para checklists sincronizados
const syncedChecklists: any[] = [];
const syncStats = {
  totalSynced: 0,
  lastSync: null as string | null,
};

// Interface para dados sincronizados
interface SyncedChecklist {
  id: string;
  tabletId: string;
  checklistType: string;
  checklistCode: string;
  data: any;
  syncedAt: string;
  status: "synced" | "pending";
}

// API: Sincronizar checklist do tablet
router.post("/api/sync-checklist", async (req: Request, res: Response) => {
  try {
    const { tabletId, checklistType, checklistCode, checklistData, email } = req.body;

    if (!tabletId || !checklistType || !checklistCode || !checklistData) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    // Gerar ID único para o checklist (usado para rastrear sincronizações)
    const checklistId = `${tabletId}-${checklistCode}-${Date.now()}`;

    // Preparar dados para salvar no banco
    const completedChecklistData = {
      syncId: checklistId, // Rastrear qual checklist foi sincronizado
      checklistCode,
      checklistName: checklistData.nome || checklistType,
      categoria: checklistData.categoria || "Laterais",
      modelo: checklistData.modelo || "",
      resultado: checklistData.resultado || "NAO_OK",
      executanteName: checklistData.executanteName || "",
      executanteMatricula: checklistData.executanteMatricula || "",
      liderName: checklistData.liderName,
      liderMatricula: checklistData.liderMatricula,
      inspectorName: checklistData.inspectorName,
      inspectorMatricula: checklistData.inspectorMatricula,
      dataFabricacao: checklistData.dataFabricacao,
      dataRecuperacao: checklistData.dataRecuperacao || new Date().toISOString().split('T')[0],
      numeroOP: checklistData.numeroOP,
      numeroSerie: checklistData.numeroSerie,
      totalEtapas: checklistData.totalEtapas || 0,
      etapasOK: checklistData.etapasOK || 0,
      etapasNaoOK: checklistData.etapasNaoOK || 0,
      etapasNaoAplicavel: checklistData.etapasNaoAplicavel || 0,
      pdfFileName: checklistData.pdfFileName,
      email: email || "",
    };

    // Salvar no banco de dados
    try {
      await saveCompletedChecklist(completedChecklistData);
      console.log(`[Sync] Checklist salvo no banco: ${checklistId}`);
    } catch (dbError) {
      console.error("[Sync] Erro ao salvar no banco:", dbError);
      // Continuar mesmo se falhar o banco (para compatibilidade)
    }

    // Também armazenar em memória para compatibilidade
    const syncedChecklist: SyncedChecklist = {
      id: checklistId,
      tabletId,
      checklistType,
      checklistCode,
      data: checklistData,
      syncedAt: new Date().toISOString(),
      status: "synced",
    };

    syncedChecklists.push(syncedChecklist);
    syncStats.totalSynced++;
    syncStats.lastSync = new Date().toISOString();

    // Manter apenas os últimos 1000 registros
    if (syncedChecklists.length > 1000) {
      syncedChecklists.shift();
    }

    res.json({
      success: true,
      message: "Checklist sincronizado com sucesso!",
      checklistId,
    });
  } catch (error) {
    console.error("Erro ao sincronizar checklist:", error);
    res.status(500).json({ error: "Falha ao sincronizar checklist" });
  }
});

// API: Obter checklists sincronizados (para o dashboard)
router.get("/api/get-synced-checklists", async (req: Request, res: Response) => {
  try {
    const { tabletId, checklistType, limit = 100, offset = 0 } = req.query;

    let filtered = [...syncedChecklists];

    // Filtrar por tabletId se fornecido
    if (tabletId) {
      filtered = filtered.filter((item) => item.tabletId === tabletId);
    }

    // Filtrar por checklistType se fornecido
    if (checklistType) {
      filtered = filtered.filter((item) => item.checklistType === checklistType);
    }

    // Ordenar por data decrescente
    filtered.sort(
      (a, b) =>
        new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
    );

    const total = filtered.length;
    const paginatedData = filtered.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );

    res.json({
      success: true,
      checklists: paginatedData,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error("Erro ao obter checklists sincronizados:", error);
    res.status(500).json({ error: "Falha ao obter checklists sincronizados" });
  }
});

// API: Obter estatísticas de sincronização
router.get("/api/sync-stats", async (req: Request, res: Response) => {
  try {
    // Calcular estatísticas
    const byTablet: any = {};
    const byType: any = {};

    syncedChecklists.forEach((item) => {
      // Por tablet
      byTablet[item.tabletId] = (byTablet[item.tabletId] || 0) + 1;

      // Por tipo
      byType[item.checklistType] = (byType[item.checklistType] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        totalChecklists: syncedChecklists.length,
        byTablet,
        byType,
        lastSync: syncStats.lastSync,
      },
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas de sincronização:", error);
    res.status(500).json({ error: "Falha ao obter estatísticas" });
  }
});

// API: Limpar todos os dados (ADMIN)
router.post("/api/admin/clear-all-data", async (req: Request, res: Response) => {
  try {
    console.log("[Admin] Limpando todos os dados de sincronização...");
    syncedChecklists.length = 0; // Limpar array
    syncStats.totalSynced = 0;
    syncStats.lastSync = null;
    
    console.log("[Admin] Dados limpos com sucesso!");
    res.json({
      success: true,
      message: "Todos os dados foram limpos com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao limpar dados:", error);
    res.status(500).json({ error: "Falha ao limpar dados" });
  }
});

// REMOVIDO: Rota /api/dashboard-realtime movida para dashboard-links.ts para usar dados do banco de dados
// Esta rota legada usava syncedChecklists em memória, causando conflito com a rota do banco

export default router;
