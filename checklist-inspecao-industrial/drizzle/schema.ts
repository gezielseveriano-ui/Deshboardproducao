import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela para armazenar checklists completados com suporte a sincronização na nuvem
 */
export const completedChecklists = mysqlTable("completed_checklists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Usuário que criou o checklist
  syncId: varchar("syncId", { length: 100 }).unique(), // ID único para rastrear sincronizações
  checklistCode: varchar("checklistCode", { length: 50 }).notNull(), // CL-ENG-1029, etc
  checklistName: text("checklistName").notNull(), // Nome do checklist
  categoria: varchar("categoria", { length: 50 }).notNull(), // "Laterais" ou "Travessas"
  modelo: varchar("modelo", { length: 100 }).notNull(), // Modelo do truque
  resultado: mysqlEnum("resultado", ["OK", "NAO_OK", "NAO_APLICAVEL"]).notNull(),
  executanteName: varchar("executanteName", { length: 255 }).notNull(),
  executanteMatricula: varchar("executanteMatricula", { length: 50 }).notNull(),
  liderName: varchar("liderName", { length: 255 }),
  liderMatricula: varchar("liderMatricula", { length: 50 }),
  inspectorName: varchar("inspectorName", { length: 255 }),
  inspectorMatricula: varchar("inspectorMatricula", { length: 50 }),
  dataFabricacao: varchar("dataFabricacao", { length: 50 }),
  dataRecuperacao: varchar("dataRecuperacao", { length: 50 }).notNull(),
  numeroOP: varchar("numeroOP", { length: 50 }),
  numeroSerie: varchar("numeroSerie", { length: 50 }),
  totalEtapas: int("totalEtapas").notNull(),
  etapasOK: int("etapasOK").notNull().default(0),
  etapasNaoOK: int("etapasNaoOK").notNull().default(0),
  etapasNaoAplicavel: int("etapasNaoAplicavel").notNull().default(0),
  pdfFileName: varchar("pdfFileName", { length: 255 }),
  pdfUrl: varchar("pdfUrl", { length: 512 }), // URL do PDF armazenado na nuvem
  email: varchar("email", { length: 320 }),
  deviceId: varchar("deviceId", { length: 100 }), // ID do dispositivo que criou
  syncStatus: mysqlEnum("syncStatus", ["pending", "synced", "failed"]).default("pending").notNull(),
  syncedAt: timestamp("syncedAt"), // Quando foi sincronizado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompletedChecklist = typeof completedChecklists.$inferSelect;
export type InsertCompletedChecklist = typeof completedChecklists.$inferInsert;

/**
 * Tabela para armazenar PDFs na nuvem
 */
export const checklistPdfs = mysqlTable("checklist_pdfs", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklistId").notNull(), // Referência ao checklist
  userId: int("userId").notNull(), // Usuário que criou
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize").notNull(), // Tamanho em bytes
  s3Url: varchar("s3Url", { length: 512 }).notNull(), // URL do arquivo no S3
  mimeType: varchar("mimeType", { length: 50 }).default("application/pdf").notNull(),
  uploadStatus: mysqlEnum("uploadStatus", ["pending", "uploaded", "failed"]).default("pending").notNull(),
  uploadedAt: timestamp("uploadedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistPdf = typeof checklistPdfs.$inferSelect;
export type InsertChecklistPdf = typeof checklistPdfs.$inferInsert;

/**
 * Tabela para rastrear sincronizações entre dispositivos
 */
export const syncLogs = mysqlTable("sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  checklistId: int("checklistId").notNull(),
  action: mysqlEnum("action", ["create", "update", "delete", "download"]).notNull(),
  status: mysqlEnum("status", ["success", "failed", "pending"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;
