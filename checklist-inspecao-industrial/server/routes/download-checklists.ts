import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { completedChecklists } from "../../drizzle/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import archiver from "archiver";
import { parse as json2csvParse } from "json2csv";

const router = Router();

// Rota para download de checklists em ZIP
router.get("/api/download-checklists", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, email } = req.query;
    const db = await getDb();
    
    if (!db) {
      return res.status(500).json({ error: "Banco de dados não disponível" });
    }

    let whereConditions: any[] = [];

    // Filtrar por email se fornecido
    if (email) {
      whereConditions.push(eq(completedChecklists.email, email as string));
    }

    // Filtrar por data se fornecido
    if (startDate) {
      const start = new Date(startDate as string);
      whereConditions.push(gte(completedChecklists.createdAt, start));
    }

    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999); // Fim do dia
      whereConditions.push(lte(completedChecklists.createdAt, end));
    }

    // Buscar checklists do banco de dados
    let query: any = db.select().from(completedChecklists);
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    const allChecklists: any[] = await query;

    if (allChecklists.length === 0) {
      return res.status(404).json({ error: "Nenhum checklist encontrado para o período selecionado" });
    }

    // Preparar dados para CSV
    const csvData = allChecklists.map((checklist: any) => ({
      ID: checklist.id,
      Código: checklist.checklistCode,
      Email: checklist.email,
      Categoria: checklist.categoria,
      Modelo: checklist.modelo,
      Executante: checklist.executante,
      "Data Criação": new Date(checklist.createdAt).toLocaleString("pt-BR"),
      "Data Recuperação": checklist.dataRecuperacao ? new Date(checklist.dataRecuperacao).toLocaleString("pt-BR") : "N/A",
      Dados: checklist.data ? JSON.stringify(checklist.data) : "N/A",
    }));

    // Converter para CSV
    const csv = json2csvParse(csvData);

    // Criar arquivo ZIP
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="checklists-${new Date().getTime()}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    // Adicionar arquivo CSV ao ZIP
    archive.append(csv, { name: "checklists.csv" });

    // Adicionar arquivo JSON ao ZIP
    archive.append(JSON.stringify(allChecklists, null, 2), { name: "checklists.json" });

    // Finalizar ZIP
    archive.finalize();

    archive.on("error", (err: any) => {
      console.error("Erro ao criar ZIP:", err);
      res.status(500).json({ error: "Erro ao criar arquivo ZIP" });
    });
  } catch (error) {
    console.error("Erro ao fazer download:", error);
    res.status(500).json({ error: "Erro ao fazer download dos checklists" });
  }
});

export default router;
