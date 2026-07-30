import { eq, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, completedChecklists, InsertCompletedChecklist, checklistPdfs, InsertChecklistPdf, syncLogs, InsertSyncLog } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Salvar checklist completado no banco de dados
 */
export async function saveCompletedChecklist(checklist: InsertCompletedChecklist) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save checklist: database not available");
    return null;
  }

  try {
    const result = await db.insert(completedChecklists).values(checklist);
    console.log("[Database] Checklist salvo com sucesso:", checklist.checklistCode);
    return result;
  } catch (error) {
    console.error("[Database] Erro ao salvar checklist:", error);
    throw error;
  }
}

/**
 * Recuperar estatísticas do dashboard
 */
export async function getDashboardStats(email?: string, dataInicio?: string, dataFim?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get dashboard stats: database not available");
    return null;
  }

  try {
    // Construir filtros dinamicamente
    const filters = [];
    if (email) {
      filters.push(eq(completedChecklists.email, email));
    }
    if (dataInicio) {
      filters.push(gte(completedChecklists.createdAt, new Date(dataInicio)));
    }
    if (dataFim) {
      filters.push(lte(completedChecklists.createdAt, new Date(dataFim)));
    }

    // Query base
    let query = db.select().from(completedChecklists);
    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    const allChecklists = await query;

    // Calcular estatísticas
    const totalProduzido = allChecklists.length;
    const travessas = allChecklists.filter(c => c.categoria === "Travessas").length;
    const laterais = allChecklists.filter(c => c.categoria === "Laterais").length;
    const ok = allChecklists.filter(c => c.resultado === "OK").length;
    const naoOk = allChecklists.filter(c => c.resultado === "NAO_OK").length;
    const naoAplicavel = allChecklists.filter(c => c.resultado === "NAO_APLICAVEL").length;

    // Agrupar por executante
    const porExecutante: Record<string, number> = {};
    allChecklists.forEach(c => {
      porExecutante[c.executanteName] = (porExecutante[c.executanteName] || 0) + 1;
    });

    return {
      totalProduzido,
      travessas,
      laterais,
      ok,
      naoOk,
      naoAplicavel,
      porExecutante,
      allChecklists,
    };
  } catch (error) {
    console.error("[Database] Erro ao recuperar estatísticas:", error);
    throw error;
  }
}

/**
 * Obter checklists sincronizados para um usuário
 */
export async function getChecklistsForUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get checklists: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(completedChecklists)
      .where(eq(completedChecklists.userId, userId))
      .orderBy(completedChecklists.createdAt);
    return result;
  } catch (error) {
    console.error("[Database] Erro ao recuperar checklists:", error);
    throw error;
  }
}

/**
 * Atualizar status de sincronização de um checklist
 */
export async function updateChecklistSyncStatus(
  checklistId: number,
  syncStatus: "pending" | "synced" | "failed",
  syncedAt?: Date
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update sync status: database not available");
    return null;
  }

  try {
    const result = await db
      .update(completedChecklists)
      .set({
        syncStatus,
        syncedAt: syncedAt || new Date(),
      })
      .where(eq(completedChecklists.id, checklistId));
    return result;
  } catch (error) {
    console.error("[Database] Erro ao atualizar sync status:", error);
    throw error;
  }
}

/**
 * Salvar PDF na nuvem
 */
export async function savePdfToCloud(pdf: InsertChecklistPdf) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save PDF: database not available");
    return null;
  }

  try {
    const result = await db.insert(checklistPdfs).values(pdf);
    console.log("[Database] PDF salvo com sucesso:", pdf.fileName);
    return result;
  } catch (error) {
    console.error("[Database] Erro ao salvar PDF:", error);
    throw error;
  }
}

/**
 * Obter PDFs para um checklist
 */
export async function getPdfsForChecklist(checklistId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get PDFs: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(checklistPdfs)
      .where(eq(checklistPdfs.checklistId, checklistId));
    return result;
  } catch (error) {
    console.error("[Database] Erro ao recuperar PDFs:", error);
    throw error;
  }
}

/**
 * Registrar log de sincronização
 */
export async function logSync(log: InsertSyncLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log sync: database not available");
    return null;
  }

  try {
    const result = await db.insert(syncLogs).values(log);
    return result;
  } catch (error) {
    console.error("[Database] Erro ao registrar sync log:", error);
    throw error;
  }
}

/**
 * Obter checklists pendentes de sincronização
 */
export async function getPendingSyncs(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get pending syncs: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(completedChecklists)
      .where(
        and(
          eq(completedChecklists.userId, userId),
          eq(completedChecklists.syncStatus, "pending")
        )
      );
    return result;
  } catch (error) {
    console.error("[Database] Erro ao recuperar syncs pendentes:", error);
    throw error;
  }
}

// TODO: add feature queries here as your schema grows.
